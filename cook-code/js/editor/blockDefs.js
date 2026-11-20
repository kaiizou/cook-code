// Definisi semua blok. Dipakai palette, editor, validator, dan toko (Tahap 9).
// locked: true = harus dibeli. params = isian yang bisa diubah pemain di dalam blok.

const DIRS = [["up", "Atas"], ["down", "Bawah"], ["left", "Kiri"], ["right", "Kanan"]];
const CROPS = [["carrot", "Wortel"], ["tomato", "Tomat"], ["potato", "Kentang"], ["corn", "Jagung"]];
const DISHES = [["salad", "Salad 🥗"], ["soup", "Sup sayur 🍲"], ["fries", "Kentang goreng 🍟"]];
const SELLABLE = [["all", "Semua Barang"], ...DISHES, ...CROPS];
const RECIPES = [["salad", "Salad"], ["soup", "Sup sayur"], ["fries", "Kentang goreng"]];

export const BLOCK_DEFS = [
  // ---- Basic (gratis) ----
  {
    id: "start", name: "Start", category: "basic", color: "#e0a526",
    desc: "Memulai program. Semua program harus diawali blok ini."
  },

  {
    id: "move", name: "Move", category: "basic", color: "#4c97ff",
    desc: "Menggerakkan karakter ke arah tertentu sebanyak beberapa petak.",
    params: [
      { key: "dir", type: "select", options: DIRS, default: "right" },
      { key: "steps", type: "number", min: 1, max: 10, default: 1, unit: "x" },
    ]
  },

  {
    id: "plant", name: "Plant", category: "basic", color: "#59c059",
    desc: "Menanam bibit pada petak kebun tempat karakter berdiri.",
    params: [{ key: "crop", type: "select", options: CROPS, default: "carrot" }]
  },

  {
    id: "water", name: "Water", category: "basic", color: "#3aa7c9",
    desc: "Menyiram tanaman di petak saat ini."
  },

  {
    id: "wait", name: "Wait", category: "basic", color: "#9966ff",
    desc: "Menunggu beberapa detik sebelum lanjut ke perintah berikutnya.",
    params: [{ key: "seconds", type: "number", min: 1, max: 60, default: 5, unit: "dtk" }]
  },

  {
    id: "check", name: "Check Status", category: "basic", color: "#cf63cf",
    desc: "Memeriksa kondisi tanaman (misalnya sudah matang atau belum)."
  },

  {
    id: "harvest", name: "Harvest", category: "basic", color: "#ff8c1a",
    desc: "Memanen tanaman yang sudah matang ke inventory."
  },

  {
    id: "sell", name: "Sell", category: "basic", color: "#e6a817",
    desc: "Menjual hasil panen atau masakan di Pasar untuk mendapatkan koin.",
    params: [{ key: "item", type: "select", options: SELLABLE, default: "all" }]
  },

  {
    id: "cook", name: "Cook", category: "basic", color: "#e8613a",
    desc: "Memasak bahan makanan menjadi hidangan sesuai resep (di Kompor/Meja).",
    params: [{ key: "recipe", type: "select", options: RECIPES, default: "salad" }]
  },

  // ---- Advanced (harus dibeli, aktif di Tahap 9) ----
  {
    id: "repeat", name: "Repeat", category: "advanced", color: "#ffab19", locked: true, price: 50,
    desc: "Mengulang perintah di dalamnya sebanyak jumlah tertentu."
  },
  {
    id: "if", name: "If", category: "advanced", color: "#ff6680", locked: true, price: 80,
    desc: "Menjalankan perintah hanya jika kondisi terpenuhi."
  },
  {
    id: "ifelse", name: "If-Else", category: "advanced", color: "#ff4d6a", locked: true, price: 120,
    desc: "Menjalankan satu dari dua kemungkinan berdasarkan kondisi."
  },
  {
    id: "while", name: "While", category: "advanced", color: "#d9822b", locked: true, price: 150,
    desc: "Mengulang perintah selama kondisi masih terpenuhi."
  },
  {
    id: "function", name: "Function", category: "advanced", color: "#8a5cf6", locked: true, price: 250,
    desc: "Membuat kumpulan perintah yang bisa dipakai berulang kali."
  },
];

export function getBlockDef(id) {
  return BLOCK_DEFS.find((b) => b.id === id);
}

export function defaultParams(id) {
  const params = {};
  for (const p of getBlockDef(id)?.params || []) params[p.key] = p.default;
  return params;
}