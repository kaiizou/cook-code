import { CONFIG } from "../config.js";

// Farming System. Menyimpan status setiap petak kebun dan menumbuhkan tanaman.
// Setiap petak: { col, row, crop, growth, water }
//   crop   = kunci tanaman ("carrot", dst.) atau null jika kosong
//   growth = detik pertumbuhan yang sudah terkumpul
//   water  = sisa detik efek siraman
// Semua aksi (plant, water, check, harvest) mengembalikan { ok, message, ... }.

const key = (col, row) => `${col},${row}`;

export class Farming {
  constructor(world) {
    this.world = world;
    this.plots = new Map();
    this.effects = []; // pop-up teks melayang di atas petak
    this.reset();
  }

  reset() {
    this.plots.clear();
    this.effects = [];
    for (const p of this.world.plots) {
      this.plots.set(key(p.col, p.row), { col: p.col, row: p.row, crop: null, growth: 0, water: 0 });
    }
  }

  getPlot(col, row) {
    return this.plots.get(key(col, row)) || null;
  }

  growTime(plot) {
    return CONFIG.CROPS[plot.crop].growTime;
  }

  progress(plot) {
    if (!plot.crop) return 0;
    return Math.min(1, plot.growth / this.growTime(plot));
  }

  isReady(plot) {
    return !!plot.crop && this.progress(plot) >= 1;
  }

  update(dt) {
    const sdt = dt * CONFIG.FARM.TIME_SCALE;

    for (const p of this.plots.values()) {
      if (!p.crop || this.isReady(p)) continue;
      const rate = p.water > 0 ? CONFIG.FARM.WATER_BOOST : 1;
      p.growth = Math.min(this.growTime(p), p.growth + sdt * rate);
      p.water = Math.max(0, p.water - sdt);
    }

    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < 1.3);
  }

  pop(col, row, text, color = "#ffffff") {
    this.effects.push({ col, row, text, color, t: 0 });
  }

  // ---------------- Aksi ----------------

  plant(col, row, cropKey) {
    const plot = this.getPlot(col, row);
    if (!plot) {
      return { ok: false, message: "Plant gagal: chef tidak berdiri di petak tanah kebun. Gunakan Move ke petak tanah dulu." };
    }
    const info = CONFIG.CROPS[cropKey];
    if (!info) return { ok: false, message: `Plant gagal: bibit "${cropKey}" tidak dikenal.` };
    if (plot.crop) {
      return { ok: false, message: `Plant gagal: petak ini sudah ditanami ${CONFIG.CROPS[plot.crop].name}.` };
    }

    plot.crop = cropKey;
    plot.growth = 0;
    plot.water = 0;
    this.pop(col, row, `🌱 ${info.name}`, "#c8f7a8");
    return { ok: true, message: `Menanam ${info.name}. Butuh ${info.growTime} detik untuk matang.` };
  }

  water(col, row) {
    const plot = this.getPlot(col, row);
    if (!plot) {
      return { ok: false, message: "Water gagal: chef tidak berdiri di petak tanah kebun." };
    }
    if (!plot.crop) {
      return { ok: false, message: "Water gagal: tidak ada tanaman di petak ini. Gunakan Plant dulu." };
    }
    if (this.isReady(plot)) {
      this.pop(col, row, "Sudah matang", "#ffd75e");
      return { ok: true, message: "Tanaman sudah matang, tidak perlu disiram." };
    }

    plot.water = CONFIG.FARM.WATER_TIME;
    this.pop(col, row, "💧", "#9fe3ff");
    return { ok: true, message: `Tanaman disiram. Tumbuh ${CONFIG.FARM.WATER_BOOST}x lebih cepat selama ${CONFIG.FARM.WATER_TIME} detik.` };
  }

  // state: "none" (bukan petak), "empty", "growing", "ready"
  check(col, row) {
    const plot = this.getPlot(col, row);
    if (!plot) {
      return { ok: true, state: "none", message: "Check Status: chef tidak berada di petak kebun." };
    }
    if (!plot.crop) {
      this.pop(col, row, "Kosong", "#ffffff");
      return { ok: true, state: "empty", message: "Check Status: petak kosong." };
    }

    const name = CONFIG.CROPS[plot.crop].name;
    if (this.isReady(plot)) {
      this.pop(col, row, "Matang!", "#ffd75e");
      return { ok: true, state: "ready", crop: plot.crop, message: `Check Status: ${name} sudah matang.` };
    }

    const pct = Math.floor(this.progress(plot) * 100);
    this.pop(col, row, `${pct}%`, "#ffffff");
    return { ok: true, state: "growing", crop: plot.crop, percent: pct, message: `Check Status: ${name} belum matang (${pct}%).` };
  }

  harvest(col, row) {
    const plot = this.getPlot(col, row);
    if (!plot) {
      return { ok: false, message: "Harvest gagal: chef tidak berdiri di petak tanah kebun." };
    }
    if (!plot.crop) {
      return { ok: false, message: "Harvest gagal: tidak ada tanaman di petak ini." };
    }

    const name = CONFIG.CROPS[plot.crop].name;
    if (!this.isReady(plot)) {
      const pct = Math.floor(this.progress(plot) * 100);
      return {
        ok: false,
        message: `Harvest gagal: ${name} belum matang (${pct}%). Tambahkan Wait yang lebih lama atau siram dengan Water.`,
      };
    }

    const crop = plot.crop;
    plot.crop = null;
    plot.growth = 0;
    plot.water = 0;
    this.pop(col, row, `+1 ${name}`, "#ffd75e");
    return { ok: true, crop, message: `Panen ${name}! +1` };
  }
}