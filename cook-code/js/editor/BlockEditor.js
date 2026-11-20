import { getBlockDef, defaultParams } from "./blockDefs.js";

// Editor visual: drag and drop dari palette, menyusun urutan, menghapus blok.
// Data program: [{ uid, id, params }], urutan array = urutan eksekusi.
// Blok Start selalu ada di paling atas dan tidak bisa dipindah atau dihapus.

let uidCounter = 1;
const newUid = () => "b" + uidCounter++;

function createBlock(id) {
  return { uid: newUid(), id, params: defaultParams(id) };
}

export class BlockEditor {
  constructor({ workspace, stack, hint, palette, onMessage, onChange }) {
    this.workspace = workspace;
    this.stack = stack;
    this.hint = hint;
    this.palette = palette;
    this.onMessage = onMessage || (() => { });
    this.onChange = onChange || (() => { });

    this.program = [];
    this.locked = false;    // true saat program sedang berjalan
    this._pending = null;   // pointer ditekan, belum cukup jauh untuk dianggap drag
    this._drag = null;      // drag aktif
    this._justDragged = false;

    this._indicator = document.createElement("div");
    this._indicator.className = "drop-indicator";

    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    this._bindEvents();
    this.clear(true);
  }

  // ---------------- API publik ----------------

  getProgram() {
    return JSON.parse(JSON.stringify(this.program));
  }

  setProgram(list) {
    this.program = list.map((b) => ({
      uid: newUid(),
      id: b.id,
      params: { ...defaultParams(b.id), ...(b.params || {}) },
    }));
    if (this.program.length === 0 || this.program[0].id !== "start") {
      this.program.unshift(createBlock("start"));
    }
    this.render();
    this.onChange();
  }

  clear(silent = false) {
    if (this.locked) return;
    this.program = [createBlock("start")];
    this.render();
    if (!silent) this.onMessage("Area kerja dikosongkan.", "ok");
    this.onChange();
  }

  removeBlock(uid) {
    if (this.locked) return;
    const i = this.program.findIndex((b) => b.uid === uid);
    if (i <= 0) return; // Start (indeks 0) tidak bisa dihapus
    const [removed] = this.program.splice(i, 1);
    this.render();
    this.onMessage(`Blok ${getBlockDef(removed.id).name} dihapus.`, "info");
    this.onChange();
  }

  // Tandai blok bermasalah dengan garis merah
  setErrors(indices) {
    const set = new Set(indices);
    [...this.stack.children].forEach((el, i) => el.classList.toggle("error", set.has(i)));
  }

  // Sorot blok yang sedang dijalankan (null = tidak ada)
  setRunning(index) {
    [...this.stack.children].forEach((el, i) => el.classList.toggle("running", i === index));
    if (index !== null && index !== undefined) {
      this.stack.children[index]?.scrollIntoView({ block: "nearest" });
    }
  }

  // Kunci editor selama program berjalan
  setLocked(flag) {
    this.locked = flag;
    this.workspace.classList.toggle("locked", flag);
    this.stack
      .querySelectorAll("select, input, .ws-del")
      .forEach((el) => (el.disabled = flag));
  }

  // ---------------- Render ----------------

  render() {
    this.stack.innerHTML = "";
    this.program.forEach((b) => this.stack.appendChild(this._buildBlockEl(b)));
    this.hint.style.display = this.program.length > 1 ? "none" : "block";
  }

  _buildBlockEl(block) {
    const def = getBlockDef(block.id);
    const el = document.createElement("div");
    el.className = "ws-block" + (block.id === "start" ? " fixed" : "");
    el.dataset.uid = block.uid;
    el.dataset.id = block.id;
    el.style.background = def.color;

    const name = document.createElement("span");
    name.className = "ws-name";
    name.textContent = def.name;
    el.appendChild(name);

    for (const p of def.params || []) el.appendChild(this._buildParam(block, p));

    if (block.id !== "start") {
      const del = document.createElement("button");
      del.className = "ws-del";
      del.type = "button";
      del.title = "Hapus blok";
      del.textContent = "×";
      el.appendChild(del);
    }
    return el;
  }

  _buildParam(block, p) {
    const wrap = document.createElement("span");
    wrap.className = "ws-param";
    let ctl;

    if (p.type === "select") {
      ctl = document.createElement("select");
      for (const [value, label] of p.options) {
        const o = document.createElement("option");
        o.value = value;
        o.textContent = label;
        ctl.appendChild(o);
      }
      ctl.value = block.params[p.key];
      ctl.addEventListener("change", () => {
        block.params[p.key] = ctl.value;
        this._edited();
      });
    } else {
      ctl = document.createElement("input");
      ctl.type = "number";
      ctl.min = p.min;
      ctl.max = p.max;
      ctl.step = 1;
      ctl.value = block.params[p.key];
      ctl.addEventListener("input", () => {
        block.params[p.key] = Number(ctl.value);
        this._edited();
      });
      ctl.addEventListener("change", () => {
        let v = Math.round(Number(ctl.value));
        if (!Number.isFinite(v)) v = p.default;
        v = Math.min(p.max, Math.max(p.min, v));
        ctl.value = v;
        block.params[p.key] = v;
        this._edited();
      });
    }
    wrap.appendChild(ctl);

    if (p.unit) {
      const u = document.createElement("span");
      u.textContent = p.unit;
      wrap.appendChild(u);
    }
    return wrap;
  }

  _edited() {
    this.setErrors([]);
    this.onChange();
  }

  // ---------------- Event ----------------

  _bindEvents() {
    // Drag dari palette
    this.palette.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const btn = e.target.closest(".palette-block");
      if (!btn) return;
      const def = getBlockDef(btn.dataset.id);
      if (def.locked) return; // klik biasa tetap menampilkan info
      this._arm(e, { source: "palette", id: def.id });
    });

    // Setelah drag, jangan anggap sebagai klik (supaya info blok tidak berganti)
    this.palette.addEventListener(
      "click",
      (e) => {
        if (this._justDragged) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true
    );

    // Drag blok yang sudah ada di area kerja
    this.stack.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("select, input, button")) return;
      const el = e.target.closest(".ws-block");
      if (!el || el.classList.contains("fixed")) return;
      this._arm(e, { source: "workspace", uid: el.dataset.uid, id: el.dataset.id });
    });

    // Tombol hapus (×)
    this.stack.addEventListener("click", (e) => {
      const btn = e.target.closest(".ws-del");
      if (!btn) return;
      this.removeBlock(btn.closest(".ws-block").dataset.uid);
    });
  }

  _arm(e, info) {
    if (this.locked) return; // editor terkunci saat program berjalan
    this._pending = { ...info, x: e.clientX, y: e.clientY };
    window.addEventListener("pointermove", this._onMove);
    window.addEventListener("pointerup", this._onUp);
    window.addEventListener("pointercancel", this._onUp);
  }

  _onMove(e) {
    const p = this._pending;
    if (!p) return;
    if (!this._drag) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      this._beginDrag(p);
    }
    this._updateDrag(e);
  }

  _onUp(e) {
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    window.removeEventListener("pointercancel", this._onUp);
    if (this._drag) this._finishDrag(e, e.type === "pointercancel");
    this._pending = null;
  }

  // ---------------- Drag ----------------

  _beginDrag(p) {
    const def = getBlockDef(p.id);
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.background = def.color;
    ghost.textContent = def.name;
    document.body.appendChild(ghost);
    document.body.classList.add("dragging-block");

    if (p.source === "workspace") {
      this.stack.querySelector(`[data-uid="${p.uid}"]`)?.classList.add("dragging");
    }
    this._drag = { ...p, ghost };
  }

  _isOverWorkspace(e) {
    const r = this.workspace.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // Posisi sisip di antara blok lain (Start di indeks 0, jadi minimal 1)
  _calcIndex(y) {
    const els = [...this.stack.querySelectorAll(".ws-block:not(.dragging)")];
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return Math.max(i, 1);
    }
    return els.length;
  }

  _updateDrag(e) {
    const d = this._drag;
    d.ghost.style.left = e.clientX + 10 + "px";
    d.ghost.style.top = e.clientY + 10 + "px";

    const over = this._isOverWorkspace(e);
    this.workspace.classList.toggle("drop-active", over);
    this.palette.classList.toggle("trash-active", !over && d.source === "workspace");

    const blockedStart = d.source === "palette" && d.id === "start";
    if (over && !blockedStart) {
      const els = [...this.stack.querySelectorAll(".ws-block:not(.dragging)")];
      this.stack.insertBefore(this._indicator, els[this._calcIndex(e.clientY)] || null);
    } else {
      this._indicator.remove();
    }
  }

  _cleanupDrag() {
    const d = this._drag;
    d.ghost.remove();
    document.body.classList.remove("dragging-block");
    this.workspace.classList.remove("drop-active");
    this.palette.classList.remove("trash-active");
    this._indicator.remove();
    this.stack.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
    this._drag = null;
    this._justDragged = true;
    setTimeout(() => (this._justDragged = false), 50);
  }

  _finishDrag(e, cancelled) {
    const d = this._drag;
    const over = this._isOverWorkspace(e);
    const idx = over ? this._calcIndex(e.clientY) : -1; // hitung SEBELUM class dragging dilepas
    this._cleanupDrag();
    if (cancelled) return;

    const def = getBlockDef(d.id);

    if (d.source === "palette") {
      if (!over) return;
      if (d.id === "start") {
        this.onMessage("Start sudah ada di paling atas area kerja.", "error");
        return;
      }
      this.program.splice(idx, 0, createBlock(d.id));
      this.render();
      this.onMessage(`${def.name} ditambahkan. Total ${this.program.length - 1} perintah.`, "info");
      this.onChange();
      return;
    }

    // Sumber: area kerja
    const from = this.program.findIndex((b) => b.uid === d.uid);
    if (from <= 0) return;
    const [block] = this.program.splice(from, 1);

    if (over) {
      this.program.splice(idx, 0, block);
      this.render();
      this.onMessage(`${def.name} dipindahkan.`, "info");
    } else {
      this.render();
      this.onMessage(`${def.name} dihapus.`, "info");
    }
    this.onChange();
  }
}