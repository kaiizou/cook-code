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
  }

  init({ onRun, onStop, onClear }) {
    this._buildPalette();
    this.btnRun.addEventListener("click", onRun);
    this.btnStop.addEventListener("click", onStop);
    this.btnClear.addEventListener("click", onClear);
  }

  _buildPalette() {
    this.paletteList.innerHTML = "";
    const groups = [
      ["basic", "Dasar (gratis)"],
      ["advanced", "Lanjutan (terkunci)"],
    ];

    for (const [cat, title] of groups) {
      const h = document.createElement("h3");
      h.textContent = title;
      this.paletteList.appendChild(h);

      for (const def of BLOCK_DEFS.filter((b) => b.category === cat)) {
        const btn = document.createElement("button");
        btn.className = "palette-block" + (def.locked ? " locked" : "");
        btn.style.background = def.color;
        btn.dataset.id = def.id;
        btn.innerHTML = `<span>${def.name}</span>` +
          (def.locked ? `<span class="tag">🔒${def.price}</span>` : "");
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
    const lockText = def.locked ? ` (Terkunci, harga ${def.price})` : "";
    this.infoBox.innerHTML =
      `<strong>${def.name}${lockText}</strong><p>${def.desc}</p>`;
  }

  // Daftar urutan aktivitas program (lines = array teks)
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