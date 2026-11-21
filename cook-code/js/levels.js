// Definisi level tutorial (Tahap 10).
// Setiap level punya daftar tugas (tasks). Level lulus jika SEMUA tugas terpenuhi
// setelah program selesai dijalankan sampai habis (bukan dihentikan / error).
//
// ctx yang diterima test():
//   ctx.stats.planted            jumlah Plant yang berhasil pada RUN ini
//   ctx.stats.plots              Set petak yang berhasil ditanami pada RUN ini
//   ctx.stats.harvestedTotal     jumlah Harvest yang berhasil pada RUN ini
//   ctx.stats.harvested[crop]    jumlah panen per tanaman pada RUN ini
//   ctx.has(id)                  true jika blok ada di program
//   ctx.count(id)                jumlah blok tersebut di program
//   ctx.nested([idInduk], id)    true jika blok id berada di dalam salah satu blok induk
//
// Angka hadiah (reward) bisa diubah bebas untuk balancing.

export const LEVELS = [
  {
    title: "Menanam wortel",
    concept: "Sequence",
    reward: 20,
    goal: "Tanam 1 wortel, tunggu sampai matang, lalu panen.",
    intro:
      "Komputer menjalankan perintah satu per satu dari atas ke bawah. Urutan yang salah memberi hasil yang salah: memanen sebelum menanam pasti gagal. Seret blok ke bawah Start.",
    steps: [
      "Move: Kanan, 6 x (chef masuk ke petak tanah pertama)",
      "Plant: Wortel",
      "Wait: 15 dtk (wortel butuh 15 detik untuk matang)",
      "Harvest",
    ],
    hint:
      "Jika Harvest gagal karena belum matang, naikkan Wait 1-2 detik. Blok Check Status menampilkan persen pertumbuhan.",
    tasks: [
      {
        text: "Program memakai Plant, Wait, dan Harvest",
        test: (c) => c.has("plant") && c.has("wait") && c.has("harvest"),
      },
      {
        text: "Berhasil memanen 1 wortel",
        test: (c) => (c.stats.harvested.carrot || 0) >= 1,
      },
    ],
  },

  {
    title: "Menanam beberapa tanaman",
    concept: "Algorithm",
    reward: 30,
    goal: "Tanam di 2 petak berbeda, lalu panen keduanya.",
    intro:
      "Algoritma adalah rangkaian langkah untuk menyelesaikan tugas. Sekarang chef harus berpindah petak di antara perintah, dan Plant serta Harvest hanya bekerja di petak tempat chef berdiri.",
    steps: [
      "Move: Kanan, 6 x",
      "Plant: Wortel",
      "Move: Bawah, 1 x",
      "Plant: Tomat",
      "Wait: 20 dtk (tomat butuh 20 detik)",
      "Harvest (tomat)",
      "Move: Atas, 1 x",
      "Harvest (wortel)",
    ],
    hint:
      "Chef harus berdiri di petak tanah saat Plant dan Harvest. Jika Plant gagal karena petak masih terisi, buka menu ini lalu tekan Kosongkan kebun. Hasil panen bisa dijual di Pasar dengan blok Sell.",
    tasks: [
      {
        text: "Berhasil menanam di minimal 2 petak berbeda",
        test: (c) => c.stats.plots.size >= 2,
      },
      {
        text: "Berhasil memanen minimal 2 tanaman",
        test: (c) => c.stats.harvestedTotal >= 2,
      },
    ],
  },

  {
    title: "Perulangan dengan Repeat",
    concept: "Looping",
    reward: 40,
    goal: "Pakai Repeat untuk menanam dan memanen 3 petak.",
    intro:
      "Menanam 3 petak berarti mengulang perintah yang sama 3 kali. Daripada menyusun blok yang sama berkali-kali, bungkus dengan Repeat. Buka blok Repeat (30 koin) di Toko (tombol 🛒) lebih dulu.",
    steps: [
      "Move: Kanan, 6 x lalu Move: Atas, 1 x (petak paling atas kebun)",
      "Repeat 3 x berisi: Plant Wortel, Move Bawah 1 x",
      "Wait: 15 dtk",
      "Move: Atas, 3 x (kembali ke petak paling atas)",
      "Repeat 3 x berisi: Harvest, Move Bawah 1 x",
    ],
    hint:
      "Seret blok ke DALAM kotak Repeat, bukan di bawahnya. Setelah menanam, chef berada satu petak di bawah kebun, karena itu perlu Move Atas 3 x sebelum memanen.",
    tasks: [
      { text: "Program memakai blok Repeat", test: (c) => c.has("repeat") },
      {
        text: "Berhasil menanam di 3 petak",
        test: (c) => c.stats.plots.size >= 3,
      },
      {
        text: "Berhasil memanen minimal 3 tanaman",
        test: (c) => c.stats.harvestedTotal >= 3,
      },
    ],
  },

  {
    title: "Memeriksa dengan If",
    concept: "Conditional",
    reward: 80,
    goal: "Panen hanya jika tanaman sudah matang, memakai If.",
    intro:
      "If hanya menjalankan isinya jika kondisinya benar, sehingga program tidak error saat tanaman belum siap. Buka blok If (50 koin) di Toko.",
    steps: [
      "Move: Kanan, 6 x",
      "Plant: Wortel",
      "Wait: 15 dtk",
      "If: Tanaman matang, berisi: Harvest",
    ],
    hint:
      "Coba turunkan Wait jadi 5 dtk dan jalankan: If akan melewati Harvest tanpa error. Itulah gunanya If (petak tetap terisi, tekan Kosongkan kebun jika perlu mengulang). Untuk menambah koin dari posisi awal: Move Atas 2 x, Move Kanan 2 x, lalu Sell (Semua Barang).",
    tasks: [
      {
        text: "Program memakai blok If atau If-Else",
        test: (c) => c.has("if") || c.has("ifelse"),
      },
      {
        text: "Harvest berada di dalam If",
        test: (c) => c.nested(["if", "ifelse"], "harvest"),
      },
      {
        text: "Berhasil memanen minimal 1 tanaman",
        test: (c) => c.stats.harvestedTotal >= 1,
      },
    ],
  },

  {
    title: "Menunggu dengan While",
    concept: "Looping bersyarat",
    reward: 120,
    goal: "Tunggu tanaman matang memakai While, lalu panen.",
    intro:
      "Wait menunggu waktu yang tetap, sedangkan While menunggu sampai kondisinya berubah. Cocok untuk tanaman yang waktu matangnya berubah karena disiram. Buka blok While (100 koin) di Toko.",
    steps: [
      "Move: Kanan, 6 x",
      "Plant: Wortel",
      "Water",
      "While: Tanaman belum matang, berisi: Wait 1 dtk",
      "Harvest",
    ],
    hint:
      "Pastikan ada blok di dalam While yang memberi waktu berlalu (misalnya Wait). Tanpa itu program bisa berputar terlalu banyak dan dihentikan otomatis.",
    tasks: [
      { text: "Program memakai blok While", test: (c) => c.has("while") },
      {
        text: "Berhasil memanen minimal 1 tanaman",
        test: (c) => c.stats.harvestedTotal >= 1,
      },
    ],
  },

  {
    title: "Membuat Function",
    concept: "Function",
    reward: 200,
    goal: "Buat Function untuk menanam, lalu panggil 2 kali di petak berbeda.",
    intro:
      "Function adalah kumpulan perintah bernama yang bisa dipanggil berulang kali dengan blok Call. Buka blok Function (150 koin) di Toko. Jika koin kurang, jual hasil panen di Pasar dengan Sell.",
    steps: [
      "Function A, berisi: Plant Wortel (letakkan di level paling atas)",
      "Move: Kanan, 6 x",
      "Call A",
      "Move: Bawah, 1 x",
      "Call A",
    ],
    hint:
      "Isi Function tidak berjalan sendiri. Ia hanya berjalan saat dipanggil dengan Call. Function tidak boleh diletakkan di dalam blok lain.",
    tasks: [
      {
        text: "Ada Function yang berisi Plant",
        test: (c) => c.nested(["function"], "plant"),
      },
      {
        text: "Memakai blok Call minimal 2 kali",
        test: (c) => c.count("call") >= 2,
      },
      {
        text: "Berhasil menanam di minimal 2 petak",
        test: (c) => c.stats.plots.size >= 2,
      },
    ],
  },
];