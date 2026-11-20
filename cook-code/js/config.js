// Konfigurasi pusat game. Semua angka balancing diletakkan di sini
// agar mudah diubah tanpa menyentuh logika.

export const CONFIG = Object.freeze({
  GAME_NAME: "Code & Cook",
  VERSION: "0.6.0",
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

  // Waktu tumbuh (detik), bisa diubah saat balancing
  CROPS: {
    carrot: { name: "Wortel", growTime: 15 },
    tomato: { name: "Tomat", growTime: 20 },
    potato: { name: "Kentang", growTime: 25 },
    corn: { name: "Jagung", growTime: 30 },
  },
});