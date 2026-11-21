import { getBlockDef } from "./blockDefs.js";

// Validasi susunan blok (pohon) sebelum dijalankan.
// program = [{ uid, id, params, children?, elseChildren? }]
// Hasil: { ok, errors: [{ uid, message }] }

export function validateProgram(program, isUnlocked = () => true) {
  const errors = [];
  const add = (block, message) => errors.push({ uid: block?.uid ?? null, message });

  if (program.length === 0 || program[0].id !== "start") {
    add(program[0], "Program harus diawali blok Start.");
  }

  const runnable = program.filter((b) => b.id !== "start" && b.id !== "function");
  if (runnable.length === 0) {
    add(
      program[0],
      program.some((b) => b.id === "function")
        ? "Function hanya membuat kumpulan perintah. Tambahkan blok Call di luar Function."
        : "Belum ada perintah. Seret blok ke bawah Start."
    );
  }

  const defined = new Set(program.filter((b) => b.id === "function").map((b) => b.params.name));
  const seenFn = new Set();
  let n = 0;

  const walk = (list, level) => {
    list.forEach((b, i) => {
      n++;
      const def = getBlockDef(b.id);
      const name = def?.name ?? b.id;
      const tag = `Blok ke-${n} (${name})`;

      if (!def) { add(b, `${tag}: blok tidak dikenal.`); return; }
      if (!isUnlocked(b.id)) add(b, `${tag}: masih terkunci. Buka di Toko dulu.`);

      if (b.id === "start" && !(level === 0 && i === 0)) {
        add(b, `${tag}: Start hanya boleh ada di paling atas.`);
      }

      if (b.id === "function") {
        if (level > 0) add(b, `${tag}: Function hanya boleh di level paling atas.`);
        if (seenFn.has(b.params.name)) add(b, `${tag}: Function ${b.params.name} dibuat dua kali.`);
        seenFn.add(b.params.name);
      }

      if (b.id === "call" && !defined.has(b.params.name)) {
        add(b, `${tag}: Function ${b.params.name} belum dibuat.`);
      }

      if (b.id === "wait") {
        const s = Number(b.params.seconds);
        if (!(s >= 1 && s <= 60)) add(b, `${tag}: harus 1 sampai 60 detik.`);
      }
      if (b.id === "move") {
        const s = Number(b.params.steps);
        if (!Number.isInteger(s) || s < 1 || s > 10) add(b, `${tag}: harus 1 sampai 10 langkah.`);
      }
      if (b.id === "repeat") {
        const s = Number(b.params.times);
        if (!Number.isInteger(s) || s < 1 || s > 20) add(b, `${tag}: harus 1 sampai 20 kali.`);
      }

      for (const slot of def.slots || []) {
        const kids = b[slot.key] || [];
        if (kids.length === 0) {
          add(b, `${tag}: ${slot.label ? "bagian " + slot.label : "isinya"} kosong. Seret blok ke dalamnya.`);
        }
        walk(kids, level + 1);
      }
    });
  };

  walk(program, 0);
  return { ok: errors.length === 0, errors };
}

// Teks singkat satu blok, misalnya "Move: Kanan, 2 x"
export function describeBlock(block) {
  const def = getBlockDef(block.id);
  if (!def) return block.id;
  const parts = (def.params || []).map((p) => {
    const v = block.params[p.key];
    if (p.type === "select") return p.options.find(([val]) => val === v)?.[1] ?? v;
    return p.unit ? `${v} ${p.unit}` : String(v);
  });
  return parts.length ? `${def.name}: ${parts.join(", ")}` : def.name;
}

// Daftar baris (HTML) untuk kotak "Urutan aktivitas", menjorok untuk blok di dalam blok lain
export function describeProgram(program) {
  const lines = [];
  const pad = (d) => "&nbsp;&nbsp;&nbsp;".repeat(d);

  const walk = (list, depth) => {
    for (const b of list) {
      if (b.id === "start") continue;
      lines.push(pad(depth) + (depth ? "↳ " : "") + describeBlock(b));
      for (const slot of getBlockDef(b.id)?.slots || []) {
        if (slot.label) lines.push(pad(depth) + slot.label);
        walk(b[slot.key] || [], depth + 1);
      }
    }
  };

  walk(program, 0);
  return lines;
}