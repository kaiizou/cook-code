import { CONFIG } from "./config.js";
import { GameEngine } from "./core/GameEngine.js";
import { World } from "./systems/World.js";
import { Character } from "./systems/Character.js";
import { Farming } from "./systems/Farming.js";
import { Inventory } from "./systems/Inventory.js";
import { Cooking } from "./systems/Cooking.js";
import { GameScreen } from "./ui/GameScreen.js";
import { UIManager } from "./ui/UIManager.js";
import { BlockEditor } from "./editor/BlockEditor.js";
import { Interpreter } from "./editor/Interpreter.js";
import { validateProgram, describeBlock } from "./editor/validator.js";

// Tidak ada lagi blok stub di Tahap 8 (semua blok dasar sudah aktif).
const STUB_IDS = [];

function init() {
  const engine = new GameEngine();

  const world = new World();
  const character = new Character(world);
  const farming = new Farming(world);
  const inventory = new Inventory();
  const cooking = new Cooking(world, inventory);
  const gameScreen = new GameScreen(document.getElementById("game-canvas"), world, character, farming, inventory, cooking);

  const ui = new UIManager();
  let editor = null;
  let totalBlocks = 0;

  function setRunUI(running) {
    ui.btnRun.disabled = running;
    ui.btnClear.disabled = running;
    editor.setLocked(running);
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

  // Handler sementara untuk blok yang belum punya efek (jika ada)
  for (const id of STUB_IDS) {
    handlers[id] = async (block, api) => {
      const finished = await api.sleep(0.5);
      return finished ? { ok: true } : { ok: false, cancelled: true };
    };
  }

  const interpreter = new Interpreter({
    character,
    handlers,
    onStep(index, block) {
      editor.setRunning(index);
      const stub = STUB_IDS.includes(block.id) ? " (efek asli menyusul di tahap berikutnya)" : "";
      ui.setStatus(`Menjalankan ${index}/${totalBlocks}: ${describeBlock(block)}${stub}`, "info");
    },
    onFinish(result) {
      editor.setRunning(null);
      setRunUI(false);

      if (result.status === "done") {
        ui.setStatus(`Program selesai. ${result.count} perintah dijalankan.`, "ok");
      } else if (result.status === "stopped") {
        ui.setStatus("Program dihentikan.", "ok");
      } else {
        if (result.index >= 0) editor.setErrors([result.index]);
        ui.showErrors([{ message: result.message }]);
        ui.setStatus(result.message, "error");
      }
    },
  });

  // Urutan penting: karakter, farming, cooking, interpreter, lalu render layar
  engine.register(character);
  engine.register(farming);
  engine.register(cooking);
  engine.register(interpreter);
  engine.register(gameScreen);

  ui.init({
    onRun() {
      if (interpreter.running) return;

      const program = editor.getProgram();
      const result = validateProgram(program);
      editor.setErrors(result.errors.map((e) => e.index));

      if (!result.ok) {
        ui.showErrors(result.errors);
        ui.setStatus(result.errors[0].message, "error");
        return;
      }

      totalBlocks = program.length - 1;
      ui.showSequence(program.map(describeBlock));
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
    onMessage: (text, type) => ui.setStatus(text, type),
  });

  if (CONFIG.DEBUG) window.__cc = { world, character, farming, inventory, cooking, editor, interpreter };

  ui.setStatus("Tahap 8 siap: Dapur & Pasar aktif. Masak hidangan di kompor/meja dan jual di pasar!", "info");
  engine.start();
  console.log(`${CONFIG.GAME_NAME} v${CONFIG.VERSION} - Tahap 8 siap (Cooking & Market System).`);
}

init();