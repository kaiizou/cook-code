import { CONFIG } from "../config.js";

// Character Controller. Chef berpindah satu petak per perintah move().
// move() mengembalikan Promise supaya Block Execution Engine (Tahap 5)
// bisa menunggu satu blok selesai sebelum lanjut ke blok berikutnya.

export const DIRECTIONS = Object.freeze({
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
});

export class Character {
  constructor(world) {
    this.world = world;
    this._move = null;
    this.walkTime = 0;
    this.bumpTimer = 0;
    this.reset();
  }

  reset() {
    this.cancel();
    this.col = CONFIG.CHARACTER.START_COL;
    this.row = CONFIG.CHARACTER.START_ROW;
    this.facing = "down";
    this.state = "idle"; // idle | walking
    this.bumpTimer = 0;
    this._syncPixel();
  }

  _syncPixel() {
    const T = CONFIG.WORLD.TILE;
    this.x = this.col * T;
    this.y = this.row * T;
  }

  get busy() {
    return this._move !== null;
  }

  // Hasil: { ok: true } atau { ok: false, reason: "blocked" | "busy" | "invalid" | "cancelled" }
  move(dir) {
    const d = DIRECTIONS[dir];
    if (!d) return Promise.resolve({ ok: false, reason: "invalid" });
    if (this.busy) return Promise.resolve({ ok: false, reason: "busy" });

    this.facing = dir;
    const toCol = this.col + d.dc;
    const toRow = this.row + d.dr;

    if (!this.world.isWalkable(toCol, toRow)) {
      this.bumpTimer = 0.2; // efek goyang singkat
      return Promise.resolve({ ok: false, reason: "blocked" });
    }

    return new Promise((resolve) => {
      this._move = { toCol, toRow, t: 0, fromX: this.x, fromY: this.y, resolve };
      this.state = "walking";
    });
  }

  update(dt) {
    if (this.bumpTimer > 0) this.bumpTimer = Math.max(0, this.bumpTimer - dt);

    const m = this._move;
    if (!m) return;

    const T = CONFIG.WORLD.TILE;
    m.t = Math.min(1, m.t + dt / CONFIG.CHARACTER.MOVE_TIME);
    this.walkTime += dt;
    this.x = m.fromX + (m.toCol * T - m.fromX) * m.t;
    this.y = m.fromY + (m.toRow * T - m.fromY) * m.t;

    if (m.t >= 1) {
      this.col = m.toCol;
      this.row = m.toRow;
      this._syncPixel();
      this._move = null;
      this.state = "idle";
      m.resolve({ ok: true });
    }
  }

  // Dipanggil oleh tombol STOP: hentikan gerakan, kembali ke petak asal.
  cancel() {
    const m = this._move;
    if (!m) return;
    this._move = null;
    this.state = "idle";
    this._syncPixel();
    m.resolve({ ok: false, reason: "cancelled" });
  }
}