import PixelsConfiguration from "./apps/pixels-config.mjs";
import PixelsResolver from "./apps/pixels-resolver.mjs";
import * as api from "./handlers.mjs";

/**
 * @typedef {Object} PixelConfiguration
 * @property {string} name              The name of the connected Pixel
 * @property {Pixel} pixel              The connected Pixel device
 * @property {number} denomination      The number of faces
 * @property {function} [handleRoll]    A bound handler function for roll events
 * @property {function} [handleStatus]  A bound handler function for status events
 */

/**
 * A mapping of active Pixel dice instances, by name.
 * @type {Map<string, PixelConfiguration>}
 */
const PIXELS = new Map();

/**
 * A queue of PixelsResolver instances which require resolution
 * @type {PixelsResolver[]}
 */
const RESOLVERS = [];

/* -------------------------------------------- */
/*  Client Initialization                       */
/* -------------------------------------------- */

Hooks.on("init", function() {

  // Pixels enabled
  game.settings.register("pixels", "enabled", {
    scope: "client",
    name: "Enable Pixels Dice",
    hint: "Enable use of Pixels Electronic Dice in the Foundry VTT game client",
    config: true,
    type: Boolean,
    default: false,
    onChange: enabled => {
      module.enabled = enabled;
      if ( enabled ) {
        const config = new PixelsConfiguration();
        config.render(true);
      }
    }
  });

  // Configuration menu
  game.settings.registerMenu("pixels", "configuration", {
    name: "Pixels Configuration",
    label: "Configure Pixels",
    icon: "fa-solid fa-dice-d20",
    type: PixelsConfiguration,
    restricted: false
  })

  // Register module properties
  const module = globalThis.pixelsDice = game.modules.get("pixels");
  module.enabled = false;
  module.PIXELS = PIXELS;
  module.RESOLVERS = RESOLVERS;
  module.api = api;
  module.debounceRoll = foundry.utils.debounce(api.completeManualRoll, 1000);
});

/* -------------------------------------------- */
/*  Client Ready                                */
/* -------------------------------------------- */

Hooks.on("ready", async function() {
  const enabled = globalThis.pixelsDice.enabled = game.settings.get("pixels", "enabled");
  if ( !enabled ) return;
  const app = new PixelsConfiguration();
  app.render(true);
});

/* -------------------------------------------- */
/*  Unfulfilled Rolls Configuration             */
/* -------------------------------------------- */

Hooks.once('unfulfilled-rolls-bluetooth', function(providers) {
  providers.pixels = {
    label: "Pixels - Electronic Dice",
    url: "https://gamewithpixels.com",
    app: PixelsResolver
  }
});

