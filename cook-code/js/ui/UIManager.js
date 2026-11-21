import { BLOCK_DEFS, getBlockDef } from "../editor/blockDefs.js";

// Mengelola elemen DOM di layar coding: palette, info blok, status, tombol.

export class UIManager {
  constructor() {
    this.paletteList = document.getElementById("palette-list");
    this.infoBox = document.getElementById("block-info");
    this.statusBar = document.getElementById("status-bar");
    this.btnRun = document.getElementById("btn-run");
    this.btnStop = document.getElementById("btn-stop");
    this.btnClear = document.getElementById("btn-clear");
    this.selectedId = null;
    this.unlocks = null;
  }

  init({ onRun, onStop, onClear, unlocks }) {
    this.unlocks = unlocks;
    this.refreshPalette();
    this.btnRun.addEventListener("click", onRun);
    this.btnStop.addEventListener("click", onStop);
    this.btnClear.addEventListener("click", onClear);
  }

  // Dipanggil ulang setelah pemain membeli blok
  refreshPalette() {
    this.paletteList.innerHTML = "";
    const groups = [
      ["basic", "Dasar (gratis)"],
      ["advanced", "Lanjutan (beli di Toko)"],
    ];

    for (const [cat, title] of groups) {
      const h = document.createElement("h3");
      h.textContent = title;
      this.paletteList.appendChild(h);

      for (const def of BLOCK_DEFS.filter((b) => b.category === cat)) {
        const locked = !this.unlocks.isUnlocked(def.id);
        const btn = document.createElement("button");
        btn.className =
          "palette-block" + (locked ? " locked" : "") + (def.id === this.selectedId ? " selected" : "");
        btn.style.background = def.color;
        btn.dataset.id = def.id;

        let tag = "";
        if (locked) {
          tag = def.unlockWith ? `🔒 ${getBlockDef(def.unlockWith).name}` : `🔒${def.price}`;
        }
        btn.innerHTML = `<span>${def.name}</span>` + (tag ? `<span class="tag">${tag}</span>` : "");
        btn.addEventListener("click", () => this.showBlockInfo(def.id));
        this.paletteList.appendChild(btn);
      }
    }
  }

  showBlockInfo(id) {
    const def = getBlockDef(id);
    this.selectedId = id;
    this.paletteList.querySelectorAll(".palette-block").forEach((el) =>
      el.classList.toggle("selected", el.dataset.id === id)
    );

    const locked = !this.unlocks.isUnlocked(id);
    let title = def.name;
    let extra = "";

    if (locked) {
      if (def.unlockWith) {
        title += ` (Terkunci, terbuka bersama ${getBlockDef(def.unlockWith).name})`;
      } else {
        title += ` (Terkunci, harga ${def.price})`;
        const req = this.unlocks.missingRequirement(id);
        extra = req
          ? `<p>Syarat: buka blok <b>${req.name}</b> dulu.</p>`
          : "<p>Buka lewat tombol 🛒 di kanan atas.</p>";
      }
    }
    this.infoBox.innerHTML = `<strong>${title}</strong><p>${def.desc}</p>${extra}`;
  }

  // Daftar urutan aktivitas program (lines = array HTML)
  showSequence(lines) {
    this.infoBox.innerHTML =
      "<strong>Urutan aktivitas chef</strong><ol>" +
      lines.map((l) => `<li>${l}</li>`).join("") +
      "</ol>";
  }

  showErrors(errors) {
    this.infoBox.innerHTML =
      "<strong>Ada kesalahan pada program</strong><ol>" +
      errors.map((e) => `<li class="err">${e.message}</li>`).join("") +
      "</ol>";
  }

  setStatus(text, type = "info") {
    this.statusBar.textContent = text;
    this.statusBar.className = type; // info | ok | error
  }
}