import { CONFIG } from "../config.js";

// Peta dunia: jenis petak, stasiun (kompor, meja, pasar), dan petak kebun.
// Tidak menggambar apa pun, hanya menyimpan data dan aturan "bisa dilewati atau tidak".

export const TileType = Object.freeze({
  FLOOR: "floor",
  WALL: "wall",
  GRASS: "grass",
  SOIL: "soil",
  DOOR: "door",
});

export class World {
  constructor() {
    this.cols = CONFIG.WORLD.COLS;
    this.rows = CONFIG.WORLD.ROWS;
    this.tiles = [];
    this.plots = [];

    // Stasiun menempati petak dan tidak bisa dilewati.
    // w = lebar dalam jumlah petak.
    this.stations = [
      { id: "stove", name: "Kompor", col: 1, row: 2, w: 2 },
      { id: "table", name: "Meja", col: 4, row: 2, w: 2 },
      { id: "market", name: "Pasar", col: 7, row: 2, w: 1 },
    ];

    this._build();
  }

  _build() {
    const { HUD_ROWS, KITCHEN_COLS, DOOR_ROW } = CONFIG.WORLD;

    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        let type;
        if (r < HUD_ROWS) type = TileType.WALL;
        else if (c === KITCHEN_COLS) type = r === DOOR_ROW ? TileType.DOOR : TileType.WALL;
        else if (c < KITCHEN_COLS) type = r === HUD_ROWS ? TileType.WALL : TileType.FLOOR;
        else type = TileType.GRASS;
        row.push(type);
      }
      this.tiles.push(row);
    }

    // Petak kebun (tanah yang bisa dilewati dan ditanami)
    const G = CONFIG.GARDEN;
    for (let rr = 0; rr < G.ROWS; rr++) {
      for (let cc = 0; cc < G.COLS; cc++) {
        const col = G.COL + cc;
        const row = G.ROW + rr;
        this.tiles[row][col] = TileType.SOIL;
        this.plots.push({ id: `plot_${cc}_${rr}`, col, row });
      }
    }
  }

  inBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  tileAt(col, row) {
    return this.inBounds(col, row) ? this.tiles[row][col] : null;
  }

  stationAt(col, row) {
    return (
      this.stations.find((s) => s.row === row && col >= s.col && col < s.col + s.w) || null
    );
  }

  // Stasiun yang berada tepat di samping (atas/bawah/kiri/kanan) petak ini
  stationNear(col, row) {
    const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dc, dr] of neighbors) {
      const s = this.stationAt(col + dc, row + dr);
      if (s) return s;
    }
    return null;
  }

  plotAt(col, row) {
    return this.plots.find((p) => p.col === col && p.row === row) || null;
  }

  isWalkable(col, row) {
    if (!this.inBounds(col, row)) return false;
    if (this.tiles[row][col] === TileType.WALL) return false;
    if (this.stationAt(col, row)) return false;
    return true;
  }
}