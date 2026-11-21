import { CONFIG } from "./config.js";
import { GameEngine } from "./core/GameEngine.js";
import { World } from "./systems/World.js";
import { Character } from "./systems/Character.js";
import { Farming } from "./systems/Farming.js";
import { Inventory } from "./systems/Inventory.js";
import { Cooking } from "./systems/Cooking.js";
import { Unlocks } from "./systems/Unlocks.js";
import { GameScreen } from "./ui/GameScreen.js";
import { UIManager } from "./ui/UIManager.js";
import { ShopUI } from "./ui/ShopUI.js";
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
  const gameScreen = new GameScreen(
    document.getElementById("game-canvas"),
    world, character, farming, inventory, cooking
  );

  const ui = new UIManager();
  let editor = null;

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
    plant: action((b) => farming.plant(character.col, character.row, b.params.crop)),
    water: action(() => farming.water(character.col, character.row)),
    check: action(() => farming.check(character.col, character.row), 0.8),
    harvest: action(() => {
      const res = farming.harvest(character.col, character.row);
      if (res.ok) {
        inventory.add(res.crop, 1);
        const info = inventory.getItemInfo(res.crop);
        ui.setStatus(`Panen berhasil! +1 ${info.name} (${info.icon}) disimpan di inventori.`, "info");
      }
      return res;
    }),
    cook: action((b) => cooking.cook(b.params.recipe, character.col, character.row), 0.8),
    sell: action((b) => cooking.sell(b.params.item, character.col, character.row), 0.6),
  };

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
      } else if (result.status === "stopped") {
        ui.setStatus("Program dihentikan.", "ok");
      } else {
        if (result.uid) editor.setErrors([result.uid]);
        ui.showErrors([{ message: result.message }]);
        ui.setStatus(result.message, "error");
      }
    },
  });

  const shop = new ShopUI({
    inventory,
    unlocks,
    onMessage: (text, type) => ui.setStatus(text, type),
    onUnlock: () => ui.refreshPalette(),
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
  });

  if (CONFIG.DEBUG) {
    window.__cc = { world, character, farming, inventory, cooking, unlocks, editor, interpreter };
  }

  ui.setStatus("Tahap 9 siap. Kumpulkan koin lalu buka blok baru di Toko (🛒)!", "info");
  engine.start();
  console.log(`${CONFIG.GAME_NAME} v${CONFIG.VERSION} - Tahap 9 siap.`);
}

init();