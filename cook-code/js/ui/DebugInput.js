// Kontrol keyboard SEMENTARA untuk menguji gerakan chef di Tahap 3.
// Semua aktivitas chef nanti hanya boleh dikendalikan blok kode (Tahap 5).

const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

export class DebugInput {
  constructor(character, { onResult, onReset }) {
    this.character = character;
    this.onResult = onResult;
    this.onReset = onReset;
    this._onKey = this._onKey.bind(this);
  }

  enable() {
    window.addEventListener("keydown", this._onKey);
  }

  disable() {
    window.removeEventListener("keydown", this._onKey);
  }

  _onKey(e) {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      this.character.move(dir).then((res) => this.onResult(res, dir));
      return;
    }

    if (e.key === "r" || e.key === "R") {
      this.character.reset();
      this.onReset();
    }
  }
}