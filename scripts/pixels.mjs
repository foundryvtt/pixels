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
  const module = globalThis.pixelsDice = game.modules.get("pixels");
  module.PIXELS = PIXELS;
  module.RESOLVERS = RESOLVERS;
  module.api = api;
  module.debounceRoll = foundry.utils.debounce(api.completeManualRoll, 1000);
});

/* -------------------------------------------- */
/*  Client Ready                                */
/* -------------------------------------------- */

Hooks.on("ready", async function() {
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

