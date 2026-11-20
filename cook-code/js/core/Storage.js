// Pembungkus LocalStorage. Dipakai penuh di Tahap 10.

export const Storage = {
  isAvailable() {
    try {
      const k = "__cc_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  },

  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  load(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  clear(key) {
    localStorage.removeItem(key);
  },
};