import { getBlockDef } from "./blockDefs.js";

// Validasi susunan blok sebelum dijalankan. Dipakai lagi oleh Execution Engine di Tahap 5.
// program = [{ uid, id, params }]
// Hasil: { ok, errors: [{ index, message }] }

export function validateProgram(program) {
  const errors = [];

  if (program.length === 0 || program[0].id !== "start") {
    errors.push({ index: 0, message: "Program harus diawali blok Start." });
  }
  if (program.length <= 1) {
    errors.push({ index: 0, message: "Belum ada perintah. Seret blok ke bawah Start." });
  }


  program.forEach((b, i) => {
    const name = getBlockDef(b.id)?.name ?? b.id;
    const n = i + 1;

    if (b.id === "start" && i > 0) {
      errors.push({ index: i, message: `Blok ke-${n}: Start hanya boleh ada di paling atas.` });
    }

    if (b.id === "wait") {
      const s = Number(b.params.seconds);
      if (!(s >= 1 && s <= 60)) {
        errors.push({ index: i, message: `Blok ke-${n}: Wait harus 1 sampai 60 detik.` });
      }
    }
    if (b.id === "move") {
      const s = Number(b.params.steps);
      if (!Number.isInteger(s) || s < 1 || s > 10) {
        errors.push({ index: i, message: `Blok ke-${n}: Move harus 1 sampai 10 langkah.` });
      }
    }
  });

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