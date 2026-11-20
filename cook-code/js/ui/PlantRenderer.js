import { CONFIG } from "../config.js";

// Menggambar tanaman, progress bar, indikator air, dan pop-up di petak kebun.
// Semua masih placeholder pixel art dari kotak berwarna.

const GREEN = "#4f9d3a";
const DARK = "#3d7f2e";

export function drawFarm(c, farming, time) {
  const T = CONFIG.WORLD.TILE;

  for (const p of farming.plots.values()) {
    const x = p.col * T;
    const y = p.row * T;

    // Tanah basah
    if (p.water > 0) {
      c.fillStyle = "rgba(58,167,201,0.30)";
      c.fillRect(x + 2, y + 2, T - 4, T - 4);
    }

    if (!p.crop) continue;

    const prog = farming.progress(p);
    drawPlant(c, x, y, p.crop, prog, time);

    if (prog < 1) {
      // Progress bar
      c.fillStyle = "rgba(0,0,0,0.55)";
      c.fillRect(x + 4, y + T - 8, T - 8, 6);
      c.fillStyle = p.water > 0 ? "#5ec8e8" : "#8fd14f";
      c.fillRect(x + 5, y + T - 7, Math.floor((T - 10) * prog), 4);
    } else {
      // Tanda siap panen
      const b = Math.sin(time * 6) * 2;
      c.fillStyle = "#ffd75e";
      c.fillRect(x + 31, y + 2 + b, 2, 8);
      c.fillRect(x + 28, y + 5 + b, 8, 2);
    }

    // Tetesan air
    if (p.water > 0) {
      c.fillStyle = "#5ec8e8";
      c.fillRect(x + 4, y + 4, 4, 6);
      c.fillRect(x + 3, y + 7, 6, 3);
    }
  }

  drawEffects(c, farming);
}

function drawPlant(c, x, y, crop, prog, time) {
  const cx = x + 20;
  const gy = y + 31; // garis tanah
  const sway = prog >= 1 ? Math.round(Math.sin(time * 3)) : 0;

  if (prog < 0.34) {
    // Tunas
    c.fillStyle = GREEN;
    c.fillRect(cx - 1, gy - 6, 3, 6);
    c.fillRect(cx - 5, gy - 8, 4, 3);
    c.fillRect(cx + 2, gy - 9, 4, 3);
    return;
  }

  if (prog < 1) {
    // Tumbuh
    const h = 8 + Math.floor(prog * 14);
    c.fillStyle = GREEN;
    c.fillRect(cx - 1, gy - h, 3, h);
    c.fillStyle = DARK;
    c.fillRect(cx - 7, gy - h + 2, 6, 4);
    c.fillRect(cx + 2, gy - h + 5, 6, 4);
    return;
  }

  // Matang: bentuk berbeda tiap tanaman
  if (crop === "carrot") {
    c.fillStyle = GREEN;
    c.fillRect(cx - 5 + sway, gy - 17, 3, 11);
    c.fillRect(cx - 1, gy - 20, 3, 14);
    c.fillRect(cx + 3 - sway, gy - 17, 3, 11);
    c.fillStyle = "#f08a24";
    c.fillRect(cx - 6, gy - 6, 12, 5);
    c.fillRect(cx - 3, gy - 1, 6, 4);
  } else if (crop === "tomato") {
    c.fillStyle = DARK;
    c.fillRect(cx - 9, gy - 18, 18, 16);
    c.fillStyle = GREEN;
    c.fillRect(cx - 1 + sway, gy - 22, 3, 6);
    c.fillStyle = "#e0392b";
    c.fillRect(cx - 7, gy - 14, 6, 6);
    c.fillRect(cx + 2, gy - 11, 6, 6);
    c.fillRect(cx - 4, gy - 6, 6, 5);
  } else if (crop === "potato") {
    c.fillStyle = GREEN;
    c.fillRect(cx - 8 + sway, gy - 16, 16, 8);
    c.fillStyle = DARK;
    c.fillRect(cx - 4, gy - 20, 8, 5);
    c.fillStyle = "#c9a06a";
    c.fillRect(cx - 9, gy - 6, 8, 6);
    c.fillRect(cx + 1, gy - 5, 8, 5);
  } else if (crop === "corn") {
    c.fillStyle = GREEN;
    c.fillRect(cx - 2, gy - 28, 4, 28);
    c.fillStyle = DARK;
    c.fillRect(cx - 9 + sway, gy - 20, 8, 3);
    c.fillRect(cx + 2 - sway, gy - 14, 8, 3);
    c.fillStyle = "#f2c94c";
    c.fillRect(cx + 2, gy - 24, 5, 10);
  }
}

function drawEffects(c, farming) {
  const T = CONFIG.WORLD.TILE;
  c.font = "bold 13px 'Courier New', monospace";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";

  for (const e of farming.effects) {
    const x = e.col * T + T / 2;
    const y = e.row * T - 4 - e.t * 18;
    c.globalAlpha = Math.max(0, 1 - e.t / 1.3);
    c.fillStyle = "rgba(0,0,0,0.7)";
    c.fillText(e.text, x + 1, y + 1);
    c.fillStyle = e.color;
    c.fillText(e.text, x, y);
  }
  c.globalAlpha = 1;
  c.textAlign = "left";
}