import { CONFIG } from "../config.js";
import { Storage } from "../core/Storage.js";
import { getBlockDef } from "../editor/blockDefs.js";

// Save and Load System (Tahap 10). Menyimpan ke LocalStorage:
// koin + inventori, blok yang sudah dibeli, isi kebun, progres misi, dan susunan blok di editor.
// Posisi chef tidak disimpan karena setiap RUN dimulai dari posisi awal.

const SAVE_VERSION = 1;
const AUTOSAVE_MS = 5000;  // simpan berkala (pertumbuhan tanaman tidak memicu event)
const DEBOUNCE_MS = 400;   // simpan sesaat setelah ada perubahan

// Membersihkan data program dari storage agar editor tidak crash bila data rusak
function cleanProgram(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((b) => b && getBlockDef(b.id))
    .map((b) => {
      const def = getBlockDef(b.id);
      const params = {};
      for (const p of def.params || []) {
        let v = b.params ? b.params[p.key] : undefined;
        if (p.type === "select") {
          if (!p.options.some(([val]) => val === v)) v = p.default;
        } else {
          v = Math.round(Number(v));
          if (!Number.isFinite(v)) v = p.default;
          v = Math.min(p.max, Math.max(p.min, v));
        }
        params[p.key] = v;
      }
      const out = { id: b.id, params };
      for (const s of def.slots || []) out[s.key] = cleanProgram(b[s.key]);
      return out;
    });
}

function cleanItems(items) {
  const out = {};
  if (!items || typeof items !== "object") return out;
  for (const [k, v] of Object.entries(items)) {
    if (!(k in CONFIG.CROPS) && !(k in CONFIG.DISHES)) continue;
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

export class SaveManager {
  constructor({ inventory, unlocks, farming, missions, editor, onSaved, onError }) {
    this.inventory = inventory;
    this.unlocks = unlocks;
    this.farming = farming;
    this.missions = missions;
    this.editor = editor;
    this.onSaved = onSaved || (() => {});
    this.onError = onError || (() => {});

    this.available = Storage.isAvailable();
    this.enabled = false; // aktif setelah load() selesai, agar data lama tidak tertimpa
    this._timer = null;

    window.addEventListener("beforeunload", () => this.saveNow());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.saveNow();
    });
    setInterval(() => this.saveNow(), AUTOSAVE_MS);
  }

  enable() {
    this.enabled = true;
    this.request();
  }

  // Minta simpan (ditunda sebentar supaya banyak perubahan beruntun jadi satu simpan)
  request() {
    if (!this.enabled || !this.available) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.saveNow(), DEBOUNCE_MS);
  }

  _collect() {
    return {
      v: SAVE_VERSION,
      savedAt: Date.now(),
      inventory: this.inventory.serialize(),
      unlocks: this.unlocks.serialize(),
      farming: [...this.farming.plots.values()].map(({ col, row, crop, growth, water }) => ({
        col, row, crop, growth, water,
      })),
      missions: this.missions.serialize(),
      program: this.editor.getProgram(),
    };
  }

  saveNow() {
    if (!this.enabled || !this.available) return false;
    clearTimeout(this._timer);
    this._timer = null;
    try {
      Storage.save(CONFIG.SAVE_KEY, this._collect());
      this.onSaved(new Date());
      return true;
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      this.onError(err);
      return false;
    }
  }

  // Mengembalikan true jika ada data tersimpan yang berhasil dimuat
  load() {
    if (!this.available) return false;
    const d = Storage.load(CONFIG.SAVE_KEY, null);
    if (!d || typeof d !== "object" || d.v !== SAVE_VERSION) return false;

    try {
      const inv = d.inventory || {};
      const coins = Number(inv.currency);
      this.inventory.deserialize({
        currency: Number.isFinite(coins) && coins >= 0 ? Math.floor(coins) : CONFIG.START.CURRENCY,
        items: cleanItems(inv.items),
      });

      this.unlocks.deserialize(
        Array.isArray(d.unlocks)
          ? d.unlocks.filter((id) => {
              const def = getBlockDef(id);
              return def && def.locked && def.price !== undefined;
            })
          : []
      );

      this.farming.reset();
      for (const s of Array.isArray(d.farming) ? d.farming : []) {
        const plot = s && this.farming.getPlot(s.col, s.row);
        const info = s && CONFIG.CROPS[s.crop];
        if (!plot || !info) continue;
        plot.crop = s.crop;
        plot.growth = Math.max(0, Math.min(Number(s.growth) || 0, info.growTime));
        plot.water = Math.max(0, Number(s.water) || 0);
      }

      this.missions.deserialize(d.missions);
      this.editor.setProgram(cleanProgram(d.program));
    } catch (err) {
      console.error("Gagal memuat progres:", err);
      return false;
    }
    return true;
  }

  // Hapus semua progres lalu muat ulang halaman
  reset() {
    this.enabled = false; // cegah beforeunload menyimpan ulang data lama
    clearTimeout(this._timer);
    if (this.available) Storage.clear(CONFIG.SAVE_KEY);
    location.reload();
  }
}