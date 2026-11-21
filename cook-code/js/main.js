import { CONFIG } from "./config.js";
import { GameEngine } from "./core/GameEngine.js";
import { World } from "./systems/World.js";
import { Character } from "./systems/Character.js";
import { Farming } from "./systems/Farming.js";
import { Inventory } from "./systems/Inventory.js";
import { Cooking } from "./systems/Cooking.js";
import { Unlocks } from "./systems/Unlocks.js";
import { Missions } from "./systems/Missions.js";
import { SaveManager } from "./systems/SaveManager.js";
import { GameScreen } from "./ui/GameScreen.js";
import { UIManager } from "./ui/UIManager.js";
import { ShopUI } from "./ui/ShopUI.js";
import { MissionUI } from "./ui/MissionUI.js";
import { BlockEditor } from "./editor/BlockEditor.js";
import { Interpreter } from "./editor/Interpreter.js";
import { validateProgram, describeBlock, describeProgram } from "./editor/validator.js";

function init() {
  const engine = new GameEngine();

  const world = new World();
  const character = new Character(world);
  const farming = new Farming(world);
  const inventory = new Inventory();
  const cooking = new Cooking(world, inventory);
  const unlocks = new Unlocks(inventory);
  const missions = new Missions(inventory);
  const gameScreen = new GameScreen(
    document.getElementById("game-canvas"),
    world, character, farming, inventory, cooking
  );

  const ui = new UIManager();
  let editor = null;
  let save = null;
  let lastProgram = null; // program yang sedang/terakhir dijalankan (untuk cek misi)

  inventory.onChange(() => save?.request());

  function setRunUI(running) {
    ui.btnRun.disabled = running;
    ui.btnClear.disabled = running;
    editor.setLocked(running);
  }

  // Kondisi untuk If dan While, dihitung dari petak tempat chef berdiri
  function conditions(key, announce = false) {
    const plot = farming.getPlot(character.col, character.row);
    let value = false;

    if (key === "ready") value = !!plot && farming.isReady(plot);
    else if (key === "growing") value = !!plot && !!plot.crop && !farming.isReady(plot);
    else if (key === "empty") value = !!plot && !plot.crop;
    else if (key === "hasHarvest") {
      value = Object.entries(inventory.items).some(
        ([id, qty]) => qty > 0 && inventory.getItemInfo(id).sellPrice > 0
      );
    }

    if (announce) {
      farming.pop(
        character.col, character.row,
        value ? "✔ Ya" : "✘ Tidak",
        value ? "#c8f7a8" : "#ffb3a8"
      );
    }
    return value;
  }

  // Membungkus aksi: tunggu sebentar (animasi), jalankan efek, tampilkan pesan.
  // Hasil { ok: false, message } akan menghentikan program dengan pesan error.
  function action(fn, duration = 0.4) {
    return async (block, api) => {
      const finished = await api.sleep(duration);
      if (!finished) return { ok: false, cancelled: true };
      const res = fn(block);
      if (res.ok && res.message) ui.setStatus(res.message, "info");
      return res;
    };
  }

  const handlers = {
    plant: action((b) => {
      const res = farming.plant(character.col, character.row, b.params.crop);
      if (res.ok) missions.record("plant", { col: character.col, row: character.row });
      return res;
    }),
    water: action(() => farming.water(character.col, character.row)),
    check: action(() => farming.check(character.col, character.row), 0.8),
    harvest: action(() => {
      const res = farming.harvest(character.col, character.row);
      if (res.ok) {
        inventory.add(res.crop, 1);
        missions.record("harvest", { crop: res.crop });
        const info = inventory.getItemInfo(res.crop);
        ui.setStatus(`Panen berhasil! +1 ${info.name} (${info.icon}) disimpan di inventori.`, "info");
      }
      return res;
    }),
    cook: action((b) => cooking.cook(b.params.recipe, character.col, character.row), 0.8),
    sell: action((b) => cooking.sell(b.params.item, character.col, character.row), 0.6),
  };

  // Hasil pemeriksaan misi setelah program selesai
  function announceMission(ev) {
    if (!ev) return;
    if (ev.passed && ev.firstTime) {
      ui.setStatus(`🎉 Level ${ev.level} selesai! +${ev.reward} koin.`, "ok");
      missionUI.open(
        `🎉 Level ${ev.level} selesai! Hadiah +💰 ${ev.reward}. ` +
        (missions.allDone
          ? "Semua level selesai, sekarang bebas bereksperimen!"
          : "Level berikutnya sudah terbuka.")
      );
    } else if (ev.passed) {
      ui.setStatus(`Level ${ev.level} tercapai lagi (hadiah hanya diberikan sekali).`, "ok");
    } else {
      ui.setStatus(`Program selesai, tetapi misi belum tercapai: ${ev.failed[0]}.`, "info");
    }
  }

  const interpreter = new Interpreter({
    character,
    handlers,
    conditions,
    onStep(block) {
      editor.setRunning(block.uid);
      ui.setStatus(`Menjalankan: ${describeBlock(block)}`, "info");
    },
    onFinish(result) {
      editor.setRunning(null);
      setRunUI(false);

      if (result.status === "done") {
        ui.setStatus(`Program selesai. ${result.count} aksi dijalankan.`, "ok");
        announceMission(missions.evaluate(lastProgram));
      } else if (result.status === "stopped") {
        ui.setStatus("Program dihentikan.", "ok");
      } else {
        if (result.uid) editor.setErrors([result.uid]);
        ui.showErrors([{ message: result.message }]);
        ui.setStatus(result.message, "error");
      }
      save?.request();
    },
  });

  const shop = new ShopUI({
    inventory,
    unlocks,
    onMessage: (text, type) => ui.setStatus(text, type),
    onUnlock: () => {
      ui.refreshPalette();
      save?.request();
    },
  });

  const missionUI = new MissionUI({
    missions,
    onGardenReset() {
      if (interpreter.running) {
        ui.setStatus("Hentikan program dulu sebelum mengosongkan kebun.", "error");
        return;
      }
      farming.reset();
      ui.setStatus("Kebun dikosongkan. Semua petak siap ditanami lagi.", "ok");
      save?.request();
    },
    onProgressReset() {
      if (!confirm("Hapus semua progres (koin, blok, misi, kebun, dan program)? Tidak bisa dibatalkan.")) return;
      save.reset();
    },
  });

  // Urutan penting: karakter, farming, cooking, interpreter, toko, lalu render layar
  engine.register(character);
  engine.register(farming);
  engine.register(cooking);
  engine.register(interpreter);
  engine.register(shop);
  engine.register(gameScreen);

  ui.init({
    unlocks,
    onRun() {
      if (interpreter.running) return;

      const program = editor.getProgram();
      const result = validateProgram(program, (id) => unlocks.isUnlocked(id));
      editor.setErrors(result.errors.map((e) => e.uid));

      if (!result.ok) {
        ui.showErrors(result.errors);
        ui.setStatus(result.errors[0].message, "error");
        return;
      }

      ui.showSequence(describeProgram(program));
      character.reset(); // setiap RUN dimulai dari posisi awal (tanaman tidak direset)
      lastProgram = program;
      missions.beginRun();
      setRunUI(true);
      interpreter.run(program);
    },
    onStop() {
      if (!interpreter.stop()) {
        character.cancel();
        ui.setStatus("Tidak ada program yang sedang berjalan.", "info");
      }
    },
    onClear() {
      editor.clear();
    },
  });

  editor = new BlockEditor({
    workspace: document.getElementById("workspace"),
    stack: document.getElementById("stack"),
    hint: document.getElementById("stack-hint"),
    palette: document.getElementById("palette"),
    isUnlocked: (id) => unlocks.isUnlocked(id),
    onMessage: (text, type) => ui.setStatus(text, type),
    onChange: () => save?.request(),
  });

  // ---- Simpan dan muat progres (Tahap 10) ----
  const indicator = document.getElementById("save-indicator");
  save = new SaveManager({
    inventory, unlocks, farming, missions, editor,
    onSaved(date) {
      indicator.textContent = "💾 " + date.toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    },
    onError() {
      indicator.textContent = "⚠ gagal simpan";
    },
  });

  const loaded = save.load();
  ui.refreshPalette();
  missionUI.refreshBar();

  if (!save.available) {
    indicator.textContent = "💾 nonaktif";
    ui.setStatus("LocalStorage tidak tersedia: progres tidak bisa disimpan.", "error");
  } else {
    ui.setStatus(
      loaded
        ? "Progres dimuat. Lanjutkan permainanmu!"
        : "Selamat datang! Ikuti misi Level 1 untuk memulai.",
      "info"
    );
  }
  save.enable();
  if (!loaded) missionUI.open();

  if (CONFIG.DEBUG) {
    window.__cc = { world, character, farming, inventory, cooking, unlocks, missions, save, editor, interpreter };
  }

  engine.start();
  console.log(`${CONFIG.GAME_NAME} v${CONFIG.VERSION} - Tahap 10 siap.`);
}

init();