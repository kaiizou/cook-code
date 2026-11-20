import { CONFIG } from "../config.js";

// Inventory & Currency System (Tahap 7).
// Mengelola penyimpanan bahan kebun (crops), masakan matang (dishes), dan uang (currency).
// Menggantikan data inventori sementara yang sebelumnya ada di GameScreen.

export class Inventory {
  constructor() {
    this.currency = CONFIG.START.CURRENCY;
    this.items = {};
    this._listeners = [];

    this.reset();
  }

  // Mengembalikan inventory ke kondisi awal
  reset() {
    this.currency = CONFIG.START.CURRENCY;
    this.items = {
      // Bahan kebun mentah
      carrot: 0,
      tomato: 0,
      potato: 0,
      corn: 0,
      // Hidangan matang (Tahap 8)
      salad: 0,
      soup: 0,
      fries: 0,
    };
    this._notify();
  }

  // Cek apakah item tersedia sebanyak minimal qty
  has(itemId, qty = 1) {
    return (this.items[itemId] || 0) >= qty;
  }

  // Ambil jumlah item saat ini
  get(itemId) {
    return this.items[itemId] || 0;
  }

  // Menambah item ke inventori
  add(itemId, qty = 1) {
    if (qty <= 0) return false;
    if (!(itemId in this.items)) {
      this.items[itemId] = 0;
    }
    this.items[itemId] += qty;
    this._notify();
    return true;
  }

  // Mengurangi item dari inventori jika mencukupi
  remove(itemId, qty = 1) {
    if (qty <= 0) return false;
    if (!this.has(itemId, qty)) return false;

    this.items[itemId] -= qty;
    this._notify();
    return true;
  }

  // Cek apakah uang cukup
  canAfford(amount) {
    return this.currency >= amount;
  }

  // Menambah koin (misal dari hasil jual panen/masakan)
  addCurrency(amount) {
    if (amount <= 0) return this.currency;
    this.currency += amount;
    this._notify();
    return this.currency;
  }

  // Memotong koin (misal untuk belanja bibit / buka blok di toko)
  spendCurrency(amount) {
    if (amount <= 0) return false;
    if (!this.canAfford(amount)) return false;

    this.currency -= amount;
    this._notify();
    return true;
  }

  // Dapatkan metadata info item (nama, icon, harga jual)
  getItemInfo(itemId) {
    if (CONFIG.CROPS[itemId]) return { ...CONFIG.CROPS[itemId], type: "crop" };
    if (CONFIG.DISHES[itemId]) return { ...CONFIG.DISHES[itemId], type: "dish" };
    return { name: itemId, icon: "📦", sellPrice: 0, type: "unknown" };
  }

  // Listener untuk UI / GameScreen agar otomatis sinkron saat ada perubahan
  onChange(fn) {
    if (typeof fn === "function") this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try {
        fn(this);
      } catch (err) {
        console.error("Error in inventory listener:", err);
      }
    }
  }

  // Export data untuk sistem save game (Tahap 10)
  serialize() {
    return {
      currency: this.currency,
      items: { ...this.items },
    };
  }

  // Load data dari storage (Tahap 10)
  deserialize(data) {
    if (!data) return;
    if (typeof data.currency === "number") this.currency = data.currency;
    if (data.items && typeof data.items === "object") {
      this.items = { ...this.items, ...data.items };
    }
    this._notify();
  }
}
