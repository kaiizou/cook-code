import { BLOCK_DEFS } from "../editor/blockDefs.js";

// Toko blok kode (jendela pop-up). Uang diambil dari Inventory.

export class ShopUI {
  constructor({ inventory, unlocks, onMessage, onUnlock }) {
    this.inventory = inventory;
    this.unlocks = unlocks;
    this.onMessage = onMessage || (() => {});
    this.onUnlock = onUnlock || (() => {});

    this.modal = document.getElementById("shop-modal");
    this.body = document.getElementById("shop-body");
    this.money = document.getElementById("shop-money");
    this._sig = "";

    document.getElementById("btn-shop").addEventListener("click", () => this.open());
    document.getElementById("btn-shop-close").addEventListener("click", () => this.close());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close(); // klik latar gelap
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    this.body.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-block]");
      if (!btn || btn.disabled) return;
      const res = this.unlocks.buy(btn.dataset.block);
      this.onMessage(res.message, res.ok ? "ok" : "error");
      if (res.ok) this.onUnlock(btn.dataset.block);
      this._render();
    });
  }

  open() {
    this.modal.hidden = false;
    this._render();
  }

  close() {
    this.modal.hidden = true;
  }

  _signature() {
    return this.inventory.currency + "|" + [...this.unlocks.owned].join(",");
  }

  // Dipanggil GameEngine tiap frame: segarkan tampilan jika uang atau unlock berubah
  update() {
    if (this.modal.hidden) return;
    if (this._signature() !== this._sig) this._render();
  }

  _render() {
    this._sig = this._signature();
    this.money.textContent = `💰 ${this.inventory.currency}`;

    this.body.innerHTML = BLOCK_DEFS.filter((d) => d.locked && d.price !== undefined)
      .map((def) => {
        const owned = this.unlocks.isUnlocked(def.id);
        const req = this.unlocks.missingRequirement(def.id);

        let action;
        if (owned) {
          action = `<span class="owned">✔ Terbuka</span>`;
        } else if (req) {
          action = `<button class="btn buy" disabled>Buka ${req.name} dulu</button>`;
        } else {
          const disabled = this.inventory.canAfford(def.price) ? "" : "disabled";
          action = `<button class="btn buy" data-block="${def.id}" ${disabled}>Buka ${def.price}</button>`;
        }

        const note = def.note ? ` <b>${def.note}</b>` : "";
        return `
          <div class="shop-row">
            <div class="info">
              <strong>${def.name}</strong>
              <small>${def.desc}${note}</small>
            </div>
            ${action}
          </div>`;
      })
      .join("");
  }
}