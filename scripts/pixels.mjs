import PixelsManager from "./manager.mjs";
import PixelsConfiguration from "./apps/pixels-config.mjs";
import * as api from "./handlers.mjs";

/* -------------------------------------------- */
/*  Client Initialization                       */
/* -------------------------------------------- */

Hooks.on("init", function() {

  // Pixels enabled
  game.settings.register("pixels", "enabled", {
    scope: "client",
    name: "PIXELS.SETTINGS.ENABLED.Name",
    hint: "PIXELS.SETTINGS.ENABLED.Hint",
    config: true,
    type: Boolean,
    default: false,
    onChange: enabled => {
      module.enabled = enabled;
      _initialize(enabled);
    }
  });

  // Unprompted rolls
  game.settings.register("pixels", "allowUnprompted", {
    scope: "client",
    name: "PIXELS.SETTINGS.UNPROMPTED.Name",
    hint: "PIXELS.SETTINGS.UNPROMPTED.Hint",
    config: true,
    type: Boolean,
    default: true
  });

  // Remember connected devices
  game.settings.register("pixels", "devices", {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  // Configuration menu
  game.settings.registerMenu("pixels", "configuration", {
    name: "PIXELS.SETTINGS.CONFIG.Name",
    label: "PIXELS.SETTINGS.CONFIG.Label",
    icon: "fa-solid fa-dice-d20",
    type: PixelsConfiguration,
    restricted: false
  });

  // Core Dice Configuration
  CONFIG.Dice.fulfillment.methods.pixels = { label: "Pixels - Electronic Dice", interactive: true };

  // Register module properties
  const module = globalThis.pixelsDice = game.modules.get("pixels");
  module.enabled = false;
  module.PIXELS = PixelsManager.fromSetting();
  module.api = api;
  module.debounceRoll = foundry.utils.debounce(api.completePendingRoll, 1000);
});

/* -------------------------------------------- */
/*  Client Ready                                */
/* -------------------------------------------- */

Hooks.on("ready", function() {
  const enabled = pixelsDice.enabled = game.settings.get("pixels", "enabled");
  return _initialize(enabled);
});

/* -------------------------------------------- */

async function _initialize(enabled) {
  // Automatic connection to available dice
  if ( !enabled ) return;
  const reconnectSuccess = await pixelsDice.PIXELS.tryReconnect();
  if ( !reconnectSuccess ) {
    ui.notifications.warn("PIXELS.ERRORS.ReconnectFailed", { localize: true });
    const app = new PixelsConfiguration(pixelsDice.PIXELS);
    app.render(true);
  }
}
