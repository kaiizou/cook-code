import { LEVELS } from "../levels.js";
import { getBlockDef } from "../editor/blockDefs.js";

// Mission System (Tahap 10). Menyimpan progres level, mencatat statistik
// per RUN (tanam, panen), dan memeriksa tugas level setelah program selesai.

function newStats() {
  return { planted: 0, plots: new Set(), harvestedTotal: 0, harvested: {} };
}

function walk(list, fn, parents = []) {
  for (const b of list || []) {
    fn(b, parents);
    for (const s of getBlockDef(b.id)?.slots || []) {
      walk(b[s.key], fn, [...parents, b.id]);
    }
  }
}

function makeContext(program, stats) {
  const count = (id) => {
    let n = 0;
    walk(program, (b) => {
      if (b.id === id) n++;
    });
    return n;
  };
  return {
    stats,
    count,
    has: (id) => count(id) > 0,
    nested(parentIds, childId) {
      let found = false;
      walk(program, (b, parents) => {
        if (b.id === childId && parents.some((p) => parentIds.includes(p))) found = true;
      });
      return found;
    },
  };
}

export class Missions {
  constructor(inventory) {
    this.inventory = inventory;
    this.current = 1; // level yang sedang dikerjakan (1 sampai LEVELS.length)
    this.completed = new Set();
    this.stats = newStats();
    this.lastEval = null; // { level, tasks: [{ text, ok }] }
    this._listeners = [];
  }

  get level() {
    return LEVELS[this.current - 1];
  }

  get allDone() {
    return this.completed.size >= LEVELS.length;
  }

  // Level pertama yang belum selesai (LEVELS.length + 1 jika semua selesai)
  frontier() {
    for (let n = 1; n <= LEVELS.length; n++) if (!this.completed.has(n)) return n;
    return LEVELS.length + 1;
  }

  select(n) {
    if (!Number.isInteger(n) || n < 1 || n > Math.min(this.frontier(), LEVELS.length)) return false;
    this.current = n;
    this.lastEval = null;
    this._notify();
    return true;
  }

  beginRun() {
    this.stats = newStats();
  }

  record(type, data = {}) {
    const s = this.stats;
    if (type === "plant") {
      s.planted++;
      s.plots.add(`${data.col},${data.row}`);
    } else if (type === "harvest") {
      s.harvestedTotal++;
      s.harvested[data.crop] = (s.harvested[data.crop] || 0) + 1;
    }
  }

  // Dipanggil setelah program selesai normal. Hadiah hanya diberikan sekali per level.
  evaluate(program) {
    const lv = this.level;
    if (!lv) return null;

    const ctx = makeContext(program, this.stats);
    const tasks = lv.tasks.map((t) => ({ text: t.text, ok: !!t.test(ctx) }));
    const failed = tasks.filter((t) => !t.ok).map((t) => t.text);
    const passed = failed.length === 0;
    const n = this.current;
    const firstTime = passed && !this.completed.has(n);

    if (firstTime) {
      this.completed.add(n);
      this.inventory.addCurrency(lv.reward);
      this.current = Math.min(this.frontier(), LEVELS.length);
    }

    this.lastEval = { level: n, tasks };
    this._notify();
    return { level: n, passed, firstTime, reward: lv.reward, tasks, failed };
  }

  onChange(fn) {
    if (typeof fn === "function") this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try {
        fn(this);
      } catch (err) {
        console.error("Error in missions listener:", err);
      }
    }
  }

  serialize() {
    return { current: this.current, completed: [...this.completed] };
  }

  deserialize(data) {
    if (!data || typeof data !== "object") return;
    const done = Array.isArray(data.completed) ? data.completed : [];
    this.completed = new Set(
      done.filter((n) => Number.isInteger(n) && n >= 1 && n <= LEVELS.length)
    );
    const cur = Number.isInteger(data.current) ? data.current : 1;
    this.current = Math.max(1, Math.min(cur, this.frontier(), LEVELS.length));
    this.lastEval = null;
    this._notify();
  }
}