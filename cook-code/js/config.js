// Konfigurasi pusat game. Semua angka balancing diletakkan di sini
// agar mudah diubah tanpa menyentuh logika.

export const CONFIG = Object.freeze({
  GAME_NAME: "Code & Cook",
  VERSION: "0.8.0",
  SAVE_KEY: "codeAndCook_save_v1",

  // true = tampilkan info debug di canvas dan aktifkan kontrol keyboard uji.
  // Akan diset false setelah Tahap 5.
  DEBUG: false,

  LAYOUT: {
    GAME_WIDTH_RATIO: 0.65,
    CODE_WIDTH_RATIO: 0.35,
  },

  START: {
    CURRENCY: 20,
  },

  // Dunia berbasis grid. Canvas 800x600 = 20 kolom x 15 baris x 40px
  WORLD: {
    TILE: 40,
    COLS: 20,
    ROWS: 15,
    HUD_ROWS: 1,       // baris paling atas dipakai HUD
    KITCHEN_COLS: 9,   // kolom 0-8 = dapur, kolom 9 = dinding pemisah
    DOOR_ROW: 5,       // baris tempat pintu di dinding pemisah
  },

  CHARACTER: {
    START_COL: 5,
    START_ROW: 5,
    MOVE_TIME: 0.28,   // detik untuk berpindah satu petak
  },

  // Petak kebun: mulai dari (COL, ROW), ukuran COLS x ROWS
  GARDEN: {
    COL: 11,
    ROW: 4,
    COLS: 4,
    ROWS: 3,
  },

  // Pertumbuhan tanaman
  FARM: {
    WATER_TIME: 10,    // detik efek siraman
    WATER_BOOST: 2,    // kecepatan tumbuh saat basah (1 = normal)
    TIME_SCALE: 1,     // untuk uji coba: isi 3 agar semua waktu berjalan 3x lebih cepat
  },

  // Waktu tumbuh (detik), ikon, dan harga jual bahan mentah
  CROPS: {
    carrot: { name: "Wortel", icon: "🥕", growTime: 15, sellPrice: 5 },
    tomato: { name: "Tomat", icon: "🍅", growTime: 20, sellPrice: 10 },
    potato: { name: "Kentang", icon: "🥔", growTime: 25, sellPrice: 16 },
    corn: { name: "Jagung", icon: "🌽", growTime: 30, sellPrice: 22 },
  },

  // Daftar hidangan matang (Tahap 8)
  DISHES: {
    salad: { name: "Salad", icon: "🥗", sellPrice: 25 },
    soup: { name: "Sup sayur", icon: "🍲", sellPrice: 65 },
    fries: { name: "Kentang goreng", icon: "🍟", sellPrice: 45 },
  },

  // Formula resep masakan & aturan stasiun dapur (Tahap 8)
  RECIPES: {
    salad: {
      name: "Salad",
      icon: "🥗",
      station: ["stove", "table"], // bisa di meja atau kompor
      ingredients: { carrot: 1, tomato: 1 },
      sellPrice: 25,
      desc: "1 Wortel + 1 Tomat",
    },
    soup: {
      name: "Sup sayur",
      icon: "🍲",
      station: ["stove"], // harus di kompor
      ingredients: { carrot: 1, potato: 1, corn: 1 },
      sellPrice: 65,
      desc: "1 Wortel + 1 Kentang + 1 Jagung",
    },
    fries: {
      name: "Kentang goreng",
      icon: "🍟",
      station: ["stove"], // harus di kompor
      ingredients: { potato: 2 },
      sellPrice: 45,
      desc: "2 Kentang",
    },
  },
});