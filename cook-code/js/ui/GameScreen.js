import { CONFIG } from "../config.js";
import { TileType } from "../systems/World.js";
import { drawFarm } from "./PlantRenderer.js";

// Menggambar dunia, stasiun, chef, dan HUD di canvas.
// Semua visual masih placeholder pixel art dari kotak berwarna.

export class GameScreen {
  constructor(canvas, world, character, farming, inventory, cooking) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.world = world;
    this.character = character;
    this.farming = farming;
    this.inventory = inventory;
    this.cooking = cooking;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  render() {
    const c = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    c.fillStyle = "#8cc063";
    c.fillRect(0, 0, W, H);

    this._drawTiles(c);
    drawFarm(c, this.farming, this.time);
    this._drawGardenLabel(c);
    this._drawStations(c);
    this._drawChef(c);
    this._drawCookingEffects(c);
    this._drawHUD(c, W);
    if (CONFIG.DEBUG) this._drawDebug(c, W, H);
  }

  // ---------- Petak ----------
  _drawTiles(c) {
    const T = CONFIG.WORLD.TILE;
    const { HUD_ROWS } = CONFIG.WORLD;

    for (let r = HUD_ROWS; r < this.world.rows; r++) {
      for (let col = 0; col < this.world.cols; col++) {
        const x = col * T;
        const y = r * T;
        const type = this.world.tileAt(col, r);
        const alt = (col + r) % 2 === 0;

        if (type === TileType.FLOOR) {
          c.fillStyle = alt ? "#e9cfa0" : "#e2c593";
          c.fillRect(x, y, T, T);
        } else if (type === TileType.GRASS) {
          c.fillStyle = alt ? "#8cc063" : "#85b95b";
          c.fillRect(x, y, T, T);
          if ((col * 7 + r * 13) % 5 === 0) {
            c.fillStyle = "#6fa24a";
            c.fillRect(x + 10, y + 22, 3, 7);
            c.fillRect(x + 15, y + 26, 3, 5);
          }
        } else if (type === TileType.SOIL) {
          c.fillStyle = alt ? "#7a4e2d" : "#6b4226";
          c.fillRect(x, y, T, T);
          c.fillStyle = "#5a3820";
          c.fillRect(x + 8, y + 14, T - 16, 2);
          c.fillRect(x + 8, y + 26, T - 16, 2);
          c.strokeStyle = "#4a2d18";
          c.lineWidth = 2;
          c.strokeRect(x + 1, y + 1, T - 2, T - 2);
        } else if (type === TileType.DOOR) {
          c.fillStyle = "#c9a06a";
          c.fillRect(x, y, T, T);
          c.fillStyle = "#a9803f";
          c.fillRect(x + 12, y, 2, T);
          c.fillRect(x + 26, y, 2, T);
          c.fillStyle = "#6e4521";
          c.fillRect(x, y, T, 4);
          c.fillRect(x, y + T - 4, T, 4);
        } else if (type === TileType.WALL) {
          this._drawWall(c, col, r, x, y, T);
        }
      }
    }
  }

  _drawWall(c, col, r, x, y, T) {
    const { HUD_ROWS, KITCHEN_COLS } = CONFIG.WORLD;
    if (col < KITCHEN_COLS && r === HUD_ROWS) {
      // Dinding belakang dapur
      c.fillStyle = "#c98b5a";
      c.fillRect(x, y, T, T);
      c.fillStyle = "#a9703f";
      c.fillRect(x, y + T - 6, T, 6);
    } else {
      // Dinding pemisah dapur dan kebun (bata)
      c.fillStyle = "#8b5a2b";
      c.fillRect(x, y, T, T);
      c.fillStyle = "#6e4521";
      c.fillRect(x, y + 19, T, 2);
      c.fillRect(x + (r % 2 ? 10 : 25), y, 2, 19);
      c.fillRect(x + (r % 2 ? 25 : 10), y + 21, 2, 19);
    }
  }

  _drawGardenLabel(c) {
    const T = CONFIG.WORLD.TILE;
    const G = CONFIG.GARDEN;
    this._label(c, "Kebun", G.COL * T + (G.COLS * T) / 2, G.ROW * T - 8, "#3b2414");
  }

  // ---------- Stasiun ----------
  _drawStations(c) {
    const T = CONFIG.WORLD.TILE;

    for (const s of this.world.stations) {
      const x = s.col * T;
      const y = s.row * T;
      const w = s.w * T;

      if (s.id === "stove") {
        c.fillStyle = "#555";
        c.fillRect(x + 2, y + 6, w - 4, T - 6);
        c.fillStyle = "#777";
        c.fillRect(x + 2, y + 6, w - 4, 6);
        c.fillStyle = "#222";
        for (let i = 0; i < s.w; i++) c.fillRect(x + i * T + 10, y + 16, 20, 12);
      } else if (s.id === "table") {
        c.fillStyle = "#8b5a2b";
        c.fillRect(x + 6, y + 18, w - 12, T - 18);
        c.fillStyle = "#a9703f";
        c.fillRect(x + 2, y + 8, w - 4, 10);
      } else if (s.id === "market") {
        c.fillStyle = "#b07a3c";
        c.fillRect(x + 4, y + 10, w - 8, T - 12);
        c.fillStyle = "#7a4e24";
        c.fillRect(x + 4, y + 20, w - 8, 2);
        this._label(c, "$", x + w / 2, y + 7, "#ffd75e", 16);
      }

      this._label(c, s.name, x + w / 2, y - 4, "#fff3dc");
    }
  }

  // ---------- Chef ----------
  _drawChef(c) {
    const ch = this.character;
    const walking = ch.state === "walking";
    const swing = walking ? Math.sin(ch.walkTime * 14) : 0;
    const bob = walking ? Math.abs(swing) * 3 : Math.sin(this.time * 3) * 1;
    const shake = ch.bumpTimer > 0 ? Math.sin(ch.bumpTimer * 80) * 2 : 0;

    const px = ch.x + shake;
    const py = ch.y;
    const bx = px + 10;
    const by = py + 2 - bob;

    // Bayangan
    c.fillStyle = "rgba(0,0,0,0.25)";
    c.fillRect(px + 8, py + 34, 24, 5);

    // Kaki
    c.fillStyle = "#3b3b5a";
    c.fillRect(bx + 3, by + 30, 5, 5 + (swing > 0 ? 1 : 0));
    c.fillRect(bx + 12, by + 30, 5, 5 + (swing < 0 ? 1 : 0));

    // Badan dan syal
    c.fillStyle = "#ffffff";
    c.fillRect(bx, by + 18, 20, 12);
    c.fillStyle = "#e8613a";
    c.fillRect(bx + 8, by + 18, 4, 3);

    // Kepala
    c.fillStyle = "#f2c9a0";
    c.fillRect(bx + 2, by + 9, 16, 9);

    // Topi koki
    c.fillStyle = "#ffffff";
    c.fillRect(bx + 2, by, 16, 7);
    c.fillRect(bx, by + 6, 20, 4);

    // Mata mengikuti arah hadap
    c.fillStyle = "#333";
    if (ch.facing === "down") {
      c.fillRect(bx + 5, by + 12, 3, 3);
      c.fillRect(bx + 12, by + 12, 3, 3);
    } else if (ch.facing === "left") {
      c.fillRect(bx + 3, by + 12, 3, 3);
      c.fillRect(bx + 8, by + 12, 3, 3);
    } else if (ch.facing === "right") {
      c.fillRect(bx + 9, by + 12, 3, 3);
      c.fillRect(bx + 14, by + 12, 3, 3);
    } else {
      // menghadap atas: terlihat rambut bagian belakang
      c.fillStyle = "#5a3a22";
      c.fillRect(bx + 2, by + 10, 16, 5);
    }
  }

  // ---------- Efek Pop-up Memasak & Menjual (Tahap 8) ----------
  _drawCookingEffects(c) {
    if (!this.cooking || !this.cooking.effects.length) return;
    const T = CONFIG.WORLD.TILE;
    c.font = "bold 13px 'Courier New', monospace";
    c.textAlign = "center";
    c.textBaseline = "alphabetic";

    for (const e of this.cooking.effects) {
      const x = e.col * T + T / 2;
      const y = e.row * T - 8 - e.t * 22;
      c.globalAlpha = Math.max(0, 1 - e.t / 1.5);
      c.fillStyle = "rgba(0,0,0,0.85)";
      c.fillText(e.text, x + 1, y + 1);
      c.fillStyle = e.color;
      c.fillText(e.text, x, y);
    }
    c.globalAlpha = 1;
    c.textAlign = "left";
  }

  // ---------- HUD ----------
  _drawHUD(c, W) {
    const H = CONFIG.WORLD.TILE * CONFIG.WORLD.HUD_ROWS;
    c.fillStyle = "rgba(90,58,34,0.95)";
    c.fillRect(0, 0, W, H);

    c.font = "bold 15px 'Courier New', monospace";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = "#ffd75e";
    const coins = this.inventory ? this.inventory.currency : 0;
    c.fillText(`💰 ${coins}`, 12, H / 2);

    c.fillStyle = "#fff";
    if (this.inventory) {
      const inv = this.inventory;
      const cropsText = `🥕${inv.get("carrot")} 🍅${inv.get("tomato")} 🥔${inv.get("potato")} 🌽${inv.get("corn")}`;
      const dishesText = `🥗${inv.get("salad")} 🍲${inv.get("soup")} 🍟${inv.get("fries")}`;
      c.fillText(`${cropsText}   |   ${dishesText}`, W - 440, H / 2);
    }
  }

  _drawDebug(c, W, H) {
    const ch = this.character;
    const near = this.world.stationNear(ch.col, ch.row);

    c.fillStyle = "rgba(0,0,0,0.55)";
    c.fillRect(0, H - 24, W, 24);
    c.font = "13px 'Courier New', monospace";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(
      `Petak (${ch.col},${ch.row}) | Hadap: ${ch.facing} | Dekat: ${near ? near.name : "-"} | Panah/WASD: jalan, R: reset`,
      8,
      H - 12
    );
  }

  _label(c, text, x, y, color = "#3b2414", size = 13) {
    c.font = `bold ${size}px 'Courier New', monospace`;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.textAlign = "left";
  }
}