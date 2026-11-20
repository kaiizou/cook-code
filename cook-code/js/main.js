import { CONFIG } from "./config.js";
import { GameEngine } from "./core/GameEngine.js";
import { World } from "./systems/World.js";
import { Character } from "./systems/Character.js";
import { Farming } from "./systems/Farming.js";
import { GameScreen } from "./ui/GameScreen.js";
import { UIManager } from "./ui/UIManager.js";
import { BlockEditor } from "./editor/BlockEditor.js";
import { Interpreter } from "./editor/Interpreter.js";
import { validateProgram, describeBlock } from "./editor/validator.js";

// Blok yang efek aslinya baru dibuat di Tahap 7-8. Untuk sekarang hanya menyala sebentar.
const STUB_IDS = ["sell", "cook"];

function init() {
  const engine = new GameEngine();

  const world = new World();
  const character = new Character(world);
  const farming = new Farming(world);
  const gameScreen = new GameScreen(document.getElementById("game-canvas"), world, character, farming);

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
      if (res.ok) gameScreen.inventory[res.crop]++; // sementara; Inventory System di Tahap 7
      return res;
    }),
  };

  // Handler sementara untuk blok yang belum punya efek
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

  // Urutan penting: karakter, farming, interpreter, lalu render layar
  engine.register(character);
  engine.register(farming);
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

  if (CONFIG.DEBUG) window.__cc = { world, character, farming, editor, interpreter };

  ui.setStatus("Tahap 6 siap. Susun blok, jalankan ke kebun, lalu tanam!", "info");
  engine.start();
  console.log(`${CONFIG.GAME_NAME} v${CONFIG.VERSION} - Tahap 6 siap.`);
}

init();