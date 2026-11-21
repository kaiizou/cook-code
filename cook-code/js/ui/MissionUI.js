import { LEVELS } from "../levels.js";

// UI misi (Tahap 10): bar misi di layar coding dan jendela Misi & Tutorial.

export class MissionUI {
  constructor({ missions, onGardenReset, onProgressReset }) {
    this.missions = missions;
    this.titleEl = document.getElementById("mission-title");
    this.goalEl = document.getElementById("mission-goal");
    this.modal = document.getElementById("mission-modal");
    this.body = document.getElementById("mission-body");
    this.banner = "";

    document.getElementById("btn-mission").addEventListener("click", () => this.open());
    document.getElementById("btn-mission-close").addEventListener("click", () => this.close());
    document.getElementById("btn-garden-reset").addEventListener("click", onGardenReset);
    document.getElementById("btn-save-reset").addEventListener("click", onProgressReset);

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    this.body.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-level]");
      if (!btn || btn.disabled) return;
      this.banner = "";
      missions.select(Number(btn.dataset.level));
    });

    missions.onChange(() => {
      this.refreshBar();
      if (!this.modal.hidden) this.render();
    });
    this.refreshBar();
  }

  open(banner = "") {
    this.banner = banner;
    this.modal.hidden = false;
    this.render();
  }

  close() {
    this.modal.hidden = true;
    this.banner = "";
  }

  refreshBar() {
    const m = this.missions;
    if (m.allDone) {
      this.titleEl.textContent = "🎉 Semua level selesai";
      this.goalEl.textContent = "Mode bebas: kumpulkan koin dan buka semua blok.";
    } else {
      this.titleEl.textContent = `Level ${m.current}/${LEVELS.length}: ${m.level.title}`;
      this.goalEl.textContent = m.level.goal;
    }
  }

  render() {
    const m = this.missions;
    const lv = m.level;
    const frontier = m.frontier();

    const buttons = LEVELS.map((_, i) => {
      const n = i + 1;
      const done = m.completed.has(n);
      const open = n <= frontier;
      const icon = done ? "✔" : open ? "▶" : "🔒";
      const active = n === m.current ? " active" : "";
      return `<button class="lvl-btn${active}" data-level="${n}" ${open ? "" : "disabled"}>${icon} ${n}</button>`;
    }).join("");

    const ev = m.lastEval && m.lastEval.level === m.current ? m.lastEval.tasks : null;
    const tasks = lv.tasks
      .map((t, i) => {
        const state = ev ? (ev[i].ok ? "ok" : "fail") : "todo";
        const mark = ev ? (ev[i].ok ? "✔" : "✘") : "○";
        return `<li class="${state}">${mark} ${t.text}</li>`;
      })
      .join("");

    const steps = lv.steps.map((s) => `<li>${s}</li>`).join("");
    const done = m.completed.has(m.current);

    this.body.innerHTML = `
      ${this.banner ? `<div class="lvl-banner">${this.banner}</div>` : ""}
      <div class="lvl-list">${buttons}</div>
      <h3>Level ${m.current}: ${lv.title} <span class="lvl-badge">${lv.concept}</span></h3>
      <p class="lvl-intro">${lv.intro}</p>
      <h4>Tugas</h4>
      <ul class="lvl-tasks">${tasks}</ul>
      <h4>Contoh susunan blok</h4>
      <ol class="lvl-steps">${steps}</ol>
      <details class="lvl-hint"><summary>Petunjuk</summary><p>${lv.hint}</p></details>
      <p class="lvl-reward">${
        done ? "✔ Level ini sudah selesai (hadiah hanya sekali)." : `Hadiah: 💰 ${lv.reward}`
      }</p>
    `;
  }
}