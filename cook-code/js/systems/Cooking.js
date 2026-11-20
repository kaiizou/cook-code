import { CONFIG } from "../config.js";

// Cooking & Market System (Tahap 8).
// Mengelola aktivitas memasak di Kompor/Meja dan penjualan di Pasar.
// Terintegrasi langsung dengan World (posisi stasiun) dan Inventory (bahan & koin).

export class Cooking {
  constructor(world, inventory) {
    this.world = world;
    this.inventory = inventory;
    this.effects = []; // pop-up teks memasak dan menjual
  }

  // Dipanggil GameEngine setiap frame untuk menganimasikan teks melayang
  update(dt) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < 1.5);
  }

  // Menambahkan efek visual teks melayang di atas koordinat grid
  _addEffect(col, row, text, color = "#ffd75e") {
    this.effects.push({ col, row, text, color, t: 0 });
  }

  // ---------- Logika Memasak (Cook) ----------
  cook(recipeId, chefCol, chefRow) {
    const recipe = CONFIG.RECIPES[recipeId];
    if (!recipe) {
      return { ok: false, message: `Resep '${recipeId}' tidak ditemukan.` };
    }

    // 1. Validasi Stasiun Dapur
    const station = this.world.stationNear(chefCol, chefRow);
    const stationValid = station && recipe.station.includes(station.id);

    if (!stationValid) {
      const allowedNames = recipe.station
        .map((s) => (s === "stove" ? "Kompor" : "Meja"))
        .join(" atau ");
      return {
        ok: false,
        message: `Chef harus berada di samping ${allowedNames} untuk memasak ${recipe.name}!`,
      };
    }

    // 2. Validasi Ketersediaan Bahan di Inventori
    const missing = [];
    for (const [cropKey, neededQty] of Object.entries(recipe.ingredients)) {
      const cropInfo = CONFIG.CROPS[cropKey] || { name: cropKey };
      const available = this.inventory.get(cropKey);
      if (available < neededQty) {
        missing.push(`${neededQty}x ${cropInfo.name} (punya: ${available})`);
      }
    }

    if (missing.length > 0) {
      return {
        ok: false,
        message: `Bahan kurang untuk ${recipe.name}! Butuh: ${missing.join(", ")}.`,
      };
    }

    // 3. Potong Bahan Mentah dari Inventori
    for (const [cropKey, neededQty] of Object.entries(recipe.ingredients)) {
      this.inventory.remove(cropKey, neededQty);
    }

    // 4. Tambahkan Hidangan Matang ke Inventori
    this.inventory.add(recipeId, 1);

    // 5. Tampilkan Efek Visual
    this._addEffect(chefCol, chefRow, `+${recipe.icon} ${recipe.name}!`, "#ffd75e");

    return {
      ok: true,
      recipe,
      message: `Berhasil memasak ${recipe.name} (${recipe.icon})! Disimpan ke inventori.`,
    };
  }

  // ---------- Logika Penjualan (Sell) ----------
  sell(targetItem, chefCol, chefRow) {
    // 1. Validasi Stasiun Pasar
    const station = this.world.stationNear(chefCol, chefRow);
    if (!station || station.id !== "market") {
      return {
        ok: false,
        message: "Chef harus berada di samping Pasar untuk menjual barang!",
      };
    }

    let totalCoins = 0;
    const soldList = [];

    if (targetItem === "all") {
      // Jual semua tanaman dan makanan yang ada di inventori
      const snapshot = { ...this.inventory.items };
      for (const [itemId, qty] of Object.entries(snapshot)) {
        if (qty <= 0) continue;
        const info = this.inventory.getItemInfo(itemId);
        const subtotal = qty * (info.sellPrice || 0);

        if (subtotal > 0) {
          this.inventory.remove(itemId, qty);
          totalCoins += subtotal;
          soldList.push(`${qty}x ${info.name}`);
        }
      }
    } else {
      // Jual item tertentu saja
      const qty = this.inventory.get(targetItem);
      const info = this.inventory.getItemInfo(targetItem);

      if (qty <= 0) {
        return {
          ok: false,
          message: `Tidak ada ${info.name} di inventori untuk dijual!`,
        };
      }

      const subtotal = qty * (info.sellPrice || 0);
      this.inventory.remove(targetItem, qty);
      totalCoins += subtotal;
      soldList.push(`${qty}x ${info.name}`);
    }

    if (totalCoins <= 0) {
      return {
        ok: false,
        message: "Inventori kosong atau barang tidak memiliki nilai jual.",
      };
    }

    // Tambah koin ke inventori
    this.inventory.addCurrency(totalCoins);

    // Tampilkan efek pop-up koin
    this._addEffect(chefCol, chefRow, `+💰 ${totalCoins}`, "#59c059");

    return {
      ok: true,
      totalCoins,
      message: `Terjual (${soldList.join(", ")}): +💰 ${totalCoins} koin!`,
    };
  }
}
