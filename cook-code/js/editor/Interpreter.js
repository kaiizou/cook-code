// Block Execution Engine. Menjalankan pohon blok satu per satu pada karakter.
//
// Move, Wait, Repeat, If, If-Else, While, dan Call ditangani di sini.
// Blok lain (Plant, Water, dst.) lewat `handlers`:
//   handlers[id] = async (block, api) => ({ ok: true })  atau  ({ ok: false, message })
// conditions(key, announce) -> true/false, diberikan oleh main.js.

const DIR_LABEL = { up: "Atas", down: "Bawah", left: "Kiri", right: "Kanan" };
const OK = { ok: true };
const CANCEL = { ok: false, cancelled: true };
const MAX_LOOP = 500;   // batas putaran While
const MAX_DEPTH = 8;    // batas panggilan Function bersarang

export class Interpreter {
  constructor({ character, handlers = {}, conditions, onStep, onFinish }) {
    this.character = character;
    this.handlers = handlers;
    this.conditions = conditions || (() => false);
    this.onStep = onStep || (() => {});
    this.onFinish = onFinish || (() => {});

    this.running = false;
    this._token = null;
    this._sleeps = [];
    this._fns = {};
    this._count = 0;
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
    this._count = 0;

    // Function didaftarkan dulu (hanya di level paling atas)
    this._fns = {};
    for (const b of program) if (b.id === "function") this._fns[b.params.name] = b;

    let result;
    try {
      const res = await this._runList(program, 0);
      if (token.cancelled || res.cancelled) result = { status: "stopped" };
      else if (!res.ok) result = { status: "error", uid: res.uid ?? null, message: res.message };
      else result = { status: "done", count: this._count };
    } catch (err) {
      console.error(err);
      result = { status: "error", uid: null, message: "Kesalahan internal: " + err.message };
    }

    this.running = false;
    this._token = null;
    this.onFinish(result);
  }

  async _runList(list, depth) {
    for (const block of list) {
      if (this._token.cancelled) return CANCEL;
      const res = await this._execBlock(block, depth);
      if (!res.ok) return res.cancelled || res.uid ? res : { ...res, uid: block.uid };
    }
    return OK;
  }

  async _pause(seconds) {
    return this.api.sleep(seconds); // true = selesai, false = dibatalkan
  }

  async _execBlock(block, depth) {
    const id = block.id;
    if (id === "start" || id === "function") return OK;

    this.onStep(block);

    if (id === "repeat") {
      const times = Number(block.params.times);
      for (let i = 0; i < times; i++) {
        this.onStep(block);
        if (!(await this._pause(0.15))) return CANCEL;
        const r = await this._runList(block.children, depth);
        if (!r.ok) return r;
      }
      return OK;
    }

    if (id === "while") {
      let n = 0;
      while (this.conditions(block.params.cond, false)) {
        if (++n > MAX_LOOP) {
          return {
            ok: false,
            uid: block.uid,
            message: `While berjalan lebih dari ${MAX_LOOP} kali. Pastikan kondisinya bisa berubah menjadi salah (misalnya ada Wait di dalamnya).`,
          };
        }
        this.onStep(block);
        if (!(await this._pause(0.15))) return CANCEL;
        const r = await this._runList(block.children, depth);
        if (!r.ok) return r;
      }
      return OK;
    }

    if (id === "if" || id === "ifelse") {
      const yes = this.conditions(block.params.cond, true);
      if (!(await this._pause(0.5))) return CANCEL;
      if (yes) return this._runList(block.children, depth);
      if (id === "ifelse") return this._runList(block.elseChildren, depth);
      return OK;
    }

    if (id === "call") {
      const name = block.params.name;
      const fn = this._fns[name];
      if (!fn) return { ok: false, message: `Function ${name} belum dibuat.` };
      if (depth >= MAX_DEPTH) {
        return {
          ok: false,
          message: `Function dipanggil terlalu dalam (lebih dari ${MAX_DEPTH} tingkat). Periksa apakah Function memanggil dirinya sendiri.`,
        };
      }
      if (!(await this._pause(0.2))) return CANCEL;
      return this._runList(fn.children, depth + 1);
    }

    // ---- Blok aksi ----
    let res;
    if (id === "move") {
      res = await this._move(block);
    } else if (id === "wait") {
      const finished = await this.api.sleep(Number(block.params.seconds));
      res = finished ? OK : CANCEL;
    } else {
      const handler = this.handlers[id];
      res = handler ? await handler(block, this.api) : { ok: false, message: `Blok ${id} belum bisa dijalankan.` };
    }

    if (res.ok) this._count++;
    return res;
  }

  async _move(block) {
    const { dir, steps } = block.params;
    for (let s = 1; s <= steps; s++) {
      if (this._token.cancelled) return CANCEL;
      const res = await this.character.move(dir);
      if (res.reason === "cancelled") return CANCEL;
      if (!res.ok) {
        return {
          ok: false,
          message: `Chef terhalang saat Move ${DIR_LABEL[dir]} (langkah ${s} dari ${steps}). Periksa lagi jalur chef.`,
        };
      }
    }
    return OK;
  }
}