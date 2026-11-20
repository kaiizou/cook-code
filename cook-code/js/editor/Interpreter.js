// Block Execution Engine. Membaca program (array blok), menjalankannya satu per satu
// pada karakter, dan bisa dihentikan kapan saja.
//
// Move dan Wait ditangani langsung di sini.
// Blok lain (Plant, Water, dst.) ditangani lewat `handlers`, yang diisi di tahap berikutnya:
//   handlers[id] = async (block, api) => ({ ok: true })  atau  ({ ok: false, message })
//   api = { character, sleep(detik) }  -> sleep mengembalikan true (selesai) / false (dibatalkan)

const DIR_LABEL = { up: "Atas", down: "Bawah", left: "Kiri", right: "Kanan" };

export class Interpreter {
  constructor({ character, handlers = {}, onStep, onFinish }) {
    this.character = character;
    this.handlers = handlers;
    this.onStep = onStep || (() => { });
    this.onFinish = onFinish || (() => { });

    this.running = false;
    this._token = null;
    this._sleeps = [];
    this.api = {
      character,
      sleep: (seconds) => this._sleep(seconds),
    };
  }

  // Dipanggil GameEngine tiap frame. Waktu tunggu dihitung dari dt game.
  update(dt) {
    if (this._sleeps.length === 0) return;
    const due = [];
    for (const s of this._sleeps) {
      s.left -= dt;
      if (s.left <= 0) due.push(s);
    }
    if (due.length) {
      this._sleeps = this._sleeps.filter((s) => !due.includes(s));
      due.forEach((s) => s.resolve(true));
    }
  }

  _sleep(seconds) {
    return new Promise((resolve) => {
      this._sleeps.push({ left: seconds, resolve });
    });
  }

  // Mengembalikan true jika ada program yang dihentikan
  stop() {
    if (!this.running || !this._token) return false;
    this._token.cancelled = true;
    this.character.cancel();
    const pending = this._sleeps;
    this._sleeps = [];
    pending.forEach((s) => s.resolve(false));
    return true;
  }

  async run(program) {
    if (this.running) return;
    this.running = true;
    const token = { cancelled: false };
    this._token = token;

    let result = { status: "done", count: 0 };

    try {
      for (let i = 0; i < program.length; i++) {
        if (token.cancelled) break;
        const block = program[i];
        if (block.id === "start") continue;

        this.onStep(i, block);
        const res = await this._exec(block, token);

        if (token.cancelled || res.cancelled) break;
        if (!res.ok) {
          result = { status: "error", index: i, message: res.message };
          break;
        }
        result.count++;
      }
    } catch (err) {
      console.error(err);
      result = { status: "error", index: -1, message: "Kesalahan internal: " + err.message };
    }

    if (token.cancelled && result.status === "done") result = { status: "stopped" };

    this.running = false;
    this._token = null;
    this.onFinish(result);
  }

  async _exec(block, token) {
    if (block.id === "move") return this._move(block, token);

    if (block.id === "wait") {
      const finished = await this.api.sleep(Number(block.params.seconds));
      return finished ? { ok: true } : { ok: false, cancelled: true };
    }

    const handler = this.handlers[block.id];
    if (!handler) {
      return { ok: false, message: `Blok ${block.id} belum bisa dijalankan.` };
    }
    return handler(block, this.api);
  }

  async _move(block, token) {
    const { dir, steps } = block.params;
    for (let s = 1; s <= steps; s++) {
      if (token.cancelled) return { ok: false, cancelled: true };
      const res = await this.character.move(dir);
      if (res.reason === "cancelled") return { ok: false, cancelled: true };
      if (!res.ok) {
        return {
          ok: false,
          message: `Chef terhalang saat Move ${DIR_LABEL[dir]} (langkah ${s} dari ${steps}). Periksa lagi jalur chef.`,
        };
      }
    }
    return { ok: true };
  }
}