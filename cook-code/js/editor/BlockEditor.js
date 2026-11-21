import { getBlockDef, defaultParams } from "./blockDefs.js";

// Editor visual: drag and drop dari palette, menyusun urutan, memasukkan blok
// ke dalam blok lain (Repeat, If, dst.), dan menghapus blok.
// Data program: pohon. Daftar paling atas selalu diawali blok Start (tidak bisa dipindah/dihapus).
// Blok penampung menyimpan isinya di block.children (dan block.elseChildren untuk If-Else).

let uidCounter = 1;
const newUid = () => "b" + uidCounter++;
const slotsOf = (id) => getBlockDef(id)?.slots || [];

function createBlock(id) {
  const b = { uid: newUid(), id, params: defaultParams(id) };
  for (const s of slotsOf(id)) b[s.key] = [];
  return b;
}

function hydrate(list) {
  return list.map((src) => {
    const b = { uid: newUid(), id: src.id, params: { ...defaultParams(src.id), ...(src.params || {}) } };
    for (const s of slotsOf(src.id)) b[s.key] = hydrate(src[s.key] || []);
    return b;
  });
}

export class BlockEditor {
  constructor({ workspace, stack, hint, palette, isUnlocked, onMessage, onChange }) {
    this.workspace = workspace;
    this.stack = stack;
    this.hint = hint;
    this.palette = palette;
    this.isUnlocked = isUnlocked || (() => true);
    this.onMessage = onMessage || (() => {});
    this.onChange = onChange || (() => {});

    this.program = [];
    this.locked = false;    // true saat program sedang berjalan
    this._pending = null;
    this._drag = null;
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
    this.program = hydrate(list);
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
    const found = this._find(uid);
    if (!found || (found.list === this.program && found.index === 0)) return; // Start tidak bisa dihapus
    found.list.splice(found.index, 1);
    this.render();
    this.onMessage(`Blok ${getBlockDef(found.block.id).name} dihapus.`, "info");
    this.onChange();
  }

  // Tandai blok bermasalah dengan garis merah (berdasarkan uid)
  setErrors(uids) {
    const set = new Set(uids.filter(Boolean));
    this.stack.querySelectorAll(".ws-block").forEach((el) =>
      el.classList.toggle("error", set.has(el.dataset.uid))
    );
  }

  // Sorot blok yang sedang dijalankan (null = tidak ada)
  setRunning(uid) {
    let target = null;
    this.stack.querySelectorAll(".ws-block").forEach((el) => {
      const on = uid != null && el.dataset.uid === uid;
      el.classList.toggle("running", on);
      if (on) target = el;
    });
    target?.scrollIntoView({ block: "nearest" });
  }

  // Kunci editor selama program berjalan
  setLocked(flag) {
    this.locked = flag;
    this.workspace.classList.toggle("locked", flag);
    this.stack
      .querySelectorAll("select, input, .ws-del")
      .forEach((el) => (el.disabled = flag));
  }

  // ---------------- Pohon data ----------------

  _find(uid, list = this.program) {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.uid === uid) return { list, index: i, block: b };
      for (const s of slotsOf(b.id)) {
        const r = this._find(uid, b[s.key]);
        if (r) return r;
      }
    }
    return null;
  }

  _total(list = this.program) {
    let n = 0;
    for (const b of list) {
      n++;
      for (const s of slotsOf(b.id)) n += this._total(b[s.key]);
    }
    return n;
  }

  _slotList(slotEl) {
    if (slotEl === this.stack) return this.program;
    return this._find(slotEl.dataset.owner)?.block[slotEl.dataset.slot] || null;
  }

  // ---------------- Render ----------------

  render() {
    this.stack.innerHTML = "";
    this.program.forEach((b) => this.stack.appendChild(this._buildBlockEl(b)));
    this.hint.style.display = this.program.length > 1 ? "none" : "block";
  }

  _buildBlockEl(block) {
    const def = getBlockDef(block.id);
    const slots = def.slots || [];

    const el = document.createElement("div");
    el.className = "ws-block" + (block.id === "start" ? " fixed" : "") + (slots.length ? " container" : "");
    el.dataset.uid = block.uid;
    el.dataset.id = block.id;
    el.style.background = def.color;

    let head = el;
    if (slots.length) {
      head = document.createElement("div");
      head.className = "ws-head";
      el.appendChild(head);
    }

    const name = document.createElement("span");
    name.className = "ws-name";
    name.textContent = def.name;
    head.appendChild(name);

    for (const p of def.params || []) head.appendChild(this._buildParam(block, p));

    if (block.id !== "start") {
      const del = document.createElement("button");
      del.className = "ws-del";
      del.type = "button";
      del.title = "Hapus blok";
      del.textContent = "×";
      head.appendChild(del);
    }

    for (const s of slots) {
      if (s.label) {
        const label = document.createElement("div");
        label.className = "ws-slot-label";
        label.textContent = s.label;
        el.appendChild(label);
      }
      const box = document.createElement("div");
      box.className = "ws-children";
      box.dataset.owner = block.uid;
      box.dataset.slot = s.key;
      block[s.key].forEach((c) => box.appendChild(this._buildBlockEl(c)));
      el.appendChild(box);
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
      if (!this.isUnlocked(def.id)) return; // klik biasa tetap menampilkan info
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

    // Drag blok yang sudah ada di area kerja (blok paling dalam yang ditekan)
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
    if (this.locked) return;
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

  // Daftar tujuan terdalam di bawah pointer: slot isi blok, atau daftar paling atas
  _findSlot(e) {
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (el.closest(".dragging")) continue; // tidak boleh masuk ke dirinya sendiri
      if (el.classList.contains("ws-children")) return el;
      if (el === this.stack) return el;
    }
    return this._isOverWorkspace(e) ? this.stack : null;
  }

  _kids(slot) {
    return [...slot.children].filter(
      (c) => c.classList.contains("ws-block") && !c.classList.contains("dragging")
    );
  }

  // Posisi sisip di dalam slot (di daftar paling atas minimal 1 karena Start di indeks 0)
  _calcIndex(slot, y) {
    const kids = this._kids(slot);
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return slot === this.stack ? Math.max(i, 1) : i;
    }
    return kids.length;
  }

  _notAllowed(d, slot) {
    if (d.source === "palette" && d.id === "start") return true;
    if (d.id === "function" && slot && slot !== this.stack) return true;
    return false;
  }

  _updateDrag(e) {
    const d = this._drag;
    d.ghost.style.left = e.clientX + 10 + "px";
    d.ghost.style.top = e.clientY + 10 + "px";

    const over = this._isOverWorkspace(e);
    this.workspace.classList.toggle("drop-active", over);
    this.palette.classList.toggle("trash-active", !over && d.source === "workspace");

    const slot = this._findSlot(e);
    if (slot && !this._notAllowed(d, slot)) {
      const kids = this._kids(slot);
      slot.insertBefore(this._indicator, kids[this._calcIndex(slot, e.clientY)] || null);
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

    // Hitung tujuan SEBELUM class dragging dilepas dan SEBELUM DOM berubah
    const slot = this._findSlot(e);
    const idx = slot ? this._calcIndex(slot, e.clientY) : -1;
    const targetList = slot ? this._slotList(slot) : null;
    const isRoot = slot === this.stack;

    this._cleanupDrag();
    if (cancelled) return;

    const def = getBlockDef(d.id);

    if (d.source === "palette") {
      if (!targetList) return;
      if (d.id === "start") {
        this.onMessage("Start sudah ada di paling atas area kerja.", "error");
        return;
      }
      if (d.id === "function" && !isRoot) {
        this.onMessage("Function hanya boleh di level paling atas, tidak boleh di dalam blok lain.", "error");
        return;
      }
      targetList.splice(idx, 0, createBlock(d.id));
      this.render();
      this.onMessage(`${def.name} ditambahkan. Total ${this._total() - 1} blok.`, "info");
      this.onChange();
      return;
    }

    // Sumber: area kerja
    const found = this._find(d.uid);
    if (!found || (found.list === this.program && found.index === 0)) return;

    if (targetList) {
      if (d.id === "function" && !isRoot) {
        this.onMessage("Function hanya boleh di level paling atas, tidak boleh di dalam blok lain.", "error");
        return;
      }
      found.list.splice(found.index, 1);
      targetList.splice(idx, 0, found.block);
      this.render();
      this.onMessage(`${def.name} dipindahkan.`, "info");
    } else {
      found.list.splice(found.index, 1);
      this.render();
      this.onMessage(`${def.name} dihapus.`, "info");
    }
    this.onChange();
  }
}