// Definisi semua blok. Dipakai palette, editor, validator, interpreter, dan toko.
// locked: true  = harus dibeli.  price = harga unlock.
// requires      = blok lain yang harus dibeli dulu.
// unlockWith    = terbuka otomatis bersama blok lain (tanpa harga sendiri).
// slots         = blok ini menampung blok lain. Setiap slot jadi array di data blok.

const DIRS = [["up", "Atas"], ["down", "Bawah"], ["left", "Kiri"], ["right", "Kanan"]];
const CROPS = [["carrot", "Wortel"], ["tomato", "Tomat"], ["potato", "Kentang"], ["corn", "Jagung"]];
const DISHES = [["salad", "Salad 🥗"], ["soup", "Sup sayur 🍲"], ["fries", "Kentang goreng 🍟"]];
const SELLABLE = [["all", "Semua Barang"], ...DISHES, ...CROPS];
const RECIPES = [["salad", "Salad"], ["soup", "Sup sayur"], ["fries", "Kentang goreng"]];
const CONDS = [
  ["ready", "Tanaman matang"],
  ["growing", "Tanaman belum matang"],
  ["empty", "Petak kosong"],
  ["hasHarvest", "Punya barang untuk dijual"],
];
const FUNC_NAMES = [["A", "A"], ["B", "B"], ["C", "C"]];

export const BLOCK_DEFS = [
  // ---- Basic (gratis) ----
  { id: "start", name: "Start", category: "basic", color: "#e0a526",
    desc: "Memulai program. Semua program harus diawali blok ini." },

  { id: "move", name: "Move", category: "basic", color: "#4c97ff",
    desc: "Menggerakkan karakter ke arah tertentu sebanyak beberapa petak.",
    params: [
      { key: "dir", type: "select", options: DIRS, default: "right" },
      { key: "steps", type: "number", min: 1, max: 10, default: 1, unit: "x" },
    ] },

  { id: "plant", name: "Plant", category: "basic", color: "#59c059",
    desc: "Menanam bibit pada petak kebun tempat karakter berdiri.",
    params: [{ key: "crop", type: "select", options: CROPS, default: "carrot" }] },

  { id: "water", name: "Water", category: "basic", color: "#3aa7c9",
    desc: "Menyiram tanaman di petak saat ini. Tanaman basah tumbuh lebih cepat." },

  { id: "wait", name: "Wait", category: "basic", color: "#9966ff",
    desc: "Menunggu beberapa detik sebelum lanjut ke perintah berikutnya.",
    params: [{ key: "seconds", type: "number", min: 1, max: 60, default: 5, unit: "dtk" }] },

  { id: "check", name: "Check Status", category: "basic", color: "#cf63cf",
    desc: "Memeriksa kondisi tanaman (kosong, sekian persen, atau matang)." },

  { id: "harvest", name: "Harvest", category: "basic", color: "#ff8c1a",
    desc: "Memanen tanaman yang sudah matang ke inventory." },

  { id: "sell", name: "Sell", category: "basic", color: "#e6a817",
    desc: "Menjual hasil panen atau masakan di Pasar untuk mendapatkan koin.",
    params: [{ key: "item", type: "select", options: SELLABLE, default: "all" }] },

  { id: "cook", name: "Cook", category: "basic", color: "#e8613a",
    desc: "Memasak bahan makanan menjadi hidangan sesuai resep (di Kompor/Meja).",
    params: [{ key: "recipe", type: "select", options: RECIPES, default: "salad" }] },

  // ---- Advanced (dibeli di Toko) ----
  { id: "repeat", name: "Repeat", category: "advanced", color: "#ffab19", locked: true, price: 30,
    desc: "Mengulang blok di dalamnya sebanyak jumlah tertentu.",
    params: [{ key: "times", type: "number", min: 1, max: 20, default: 3, unit: "x" }],
    slots: [{ key: "children" }] },

  { id: "if", name: "If", category: "advanced", color: "#ff6680", locked: true, price: 50, requires: "repeat",
    desc: "Menjalankan blok di dalamnya hanya jika kondisi terpenuhi.",
    params: [{ key: "cond", type: "select", options: CONDS, default: "ready" }],
    slots: [{ key: "children" }] },

  { id: "ifelse", name: "If-Else", category: "advanced", color: "#ff4d6a", locked: true, price: 80, requires: "if",
    desc: "Jika kondisi terpenuhi jalankan bagian atas, jika tidak jalankan bagian Else.",
    params: [{ key: "cond", type: "select", options: CONDS, default: "ready" }],
    slots: [{ key: "children" }, { key: "elseChildren", label: "Jika tidak (Else)" }] },

  { id: "while", name: "While", category: "advanced", color: "#d9822b", locked: true, price: 100, requires: "repeat",
    desc: "Mengulang blok di dalamnya selama kondisi masih terpenuhi.",
    params: [{ key: "cond", type: "select", options: CONDS, default: "growing" }],
    slots: [{ key: "children" }] },

  { id: "function", name: "Function", category: "advanced", color: "#8a5cf6", locked: true, price: 150, requires: "while",
    note: "Sudah termasuk blok Call.",
    desc: "Membuat kumpulan perintah bernama A, B, atau C. Isinya tidak langsung jalan, panggil dengan blok Call. Hanya boleh di level paling atas.",
    params: [{ key: "name", type: "select", options: FUNC_NAMES, default: "A" }],
    slots: [{ key: "children" }] },

  { id: "call", name: "Call", category: "advanced", color: "#a77bff", locked: true, unlockWith: "function",
    desc: "Menjalankan isi Function yang sudah dibuat.",
    params: [{ key: "name", type: "select", options: FUNC_NAMES, default: "A" }] },
];

export function getBlockDef(id) {
  return BLOCK_DEFS.find((b) => b.id === id);
}

export function defaultParams(id) {
  const params = {};
  for (const p of getBlockDef(id)?.params || []) params[p.key] = p.default;
  return params;
}