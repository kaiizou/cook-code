// Game loop utama. Sistem lain (farming, karakter, dll.) akan didaftarkan
// sebagai "system" yang memiliki method update(dt) dan opsional render().

export class GameEngine {
  constructor() {
    this.systems = [];
    this.running = false;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this._fpsTimer = 0;
    this._fpsFrames = 0;
    this._loop = this._loop.bind(this);
  }

  register(system) {
    this.systems.push(system);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
  }

  _loop(now) {
    if (!this.running) return;

    // dt dalam detik, dibatasi agar tidak melonjak saat tab tidak aktif
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.frameCount++;
    this._fpsFrames++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 1) {
      this.fps = this._fpsFrames;
      this._fpsFrames = 0;
      this._fpsTimer = 0;
    }

    for (const s of this.systems) {
      if (typeof s.update === "function") s.update(dt);
    }
    for (const s of this.systems) {
      if (typeof s.render === "function") s.render();
    }

    requestAnimationFrame(this._loop);
  }
}