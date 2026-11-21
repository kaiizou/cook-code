import { getBlockDef } from "../editor/blockDefs.js";

// Unlock System. Mengatur blok kode mana yang sudah dibeli.
// Uang diambil dari Inventory (inventory.currency).

export class Unlocks {
  constructor(inventory) {
    this.inventory = inventory;
    this.owned = new Set();
  }

  isUnlocked(id) {
    const def = getBlockDef(id);
    if (!def) return false;
    if (!def.locked) return true;
    if (def.unlockWith) return this.isUnlocked(def.unlockWith);
    return this.owned.has(id);
  }

  // Blok syarat yang belum dibeli (atau null)
  missingRequirement(id) {
    const def = getBlockDef(id);
    if (def?.requires && !this.isUnlocked(def.requires)) return getBlockDef(def.requires);
    return null;
  }

  buy(id) {
    const def = getBlockDef(id);
    if (!def || !def.locked || def.price === undefined) {
      return { ok: false, message: "Blok ini tidak bisa dibeli." };
    }
    if (this.isUnlocked(id)) return { ok: false, message: `${def.name} sudah terbuka.` };

    const req = this.missingRequirement(id);
    if (req) return { ok: false, message: `Buka blok ${req.name} dulu sebelum membuka ${def.name}.` };

    if (!this.inventory.spendCurrency(def.price)) {
      return {
        ok: false,
        message: `Uang kurang. ${def.name} harganya ${def.price}, uangmu ${this.inventory.currency}.`,
      };
    }
    this.owned.add(id);
    return { ok: true, message: `Blok ${def.name} terbuka! Sekarang bisa dipakai di editor.` };
  }

  // Untuk Save and Load (Tahap 10)
  serialize() {
    return [...this.owned];
  }

  deserialize(list) {
    this.owned = new Set(list || []);
  }
}