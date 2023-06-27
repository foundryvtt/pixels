/**
 * Handle a roll received from a Pixel dice.
 * This function should move somewhere else (eventually).
 * @param {PixelConfiguration} config
 * @param {number} result
 */
export function handleRoll(config, result) {
  console.debug(`${config.name} rolled an ${result}`);
  const resolver = pixelsDice.RESOLVERS[0];
  if ( resolver ) return resolver.registerResult(config, result);
  else return manualRoll(config, result);
}

/* -------------------------------------------- */

/**
 * Handle disconnection events from a Pixel device.
 * Attempt automatic re-connection, otherwise prompt user that manual re-connection is required.
 * @param {PixelConfiguration} config
 * @param {string} status
 * @returns {Promise<void>}
 */
export async function handleStatus(config, status) {
  if ( status !== "disconnected") return;   // Only care about disconnected for now

  // Attempt re-connection
  ui.notifications.warn(`Lost connection to Pixel ${config.name}, attempting to re-establish.`);
  try {
    await pixelsWebConnect.repeatConnect(pixel, {retries: 3});
    ui.notifications.info(`Re-established connection to Pixel ${config.name}.`);
  }

    // Failed to re-connect
  catch(err) {
    pixelsDice.PIXELS.delete(config.name);  // Remove the device
    pixelsDice.config.render(false);        // Re-render the configuration app
  }
}

/* -------------------------------------------- */

let _pendingRoll = {};

export function manualRoll(config, result) {
  _pendingRoll[config.name] = {denomination: config.denomination, value: result};
  pixelsDice.debounceRoll()
}

/* -------------------------------------------- */

export async function completeManualRoll() {

  // Group rolled dice by denomination
  const groups = Object.values(_pendingRoll).reduce((obj, r) => {
    obj[r.denomination] ||= {denomination: r.denomination, results: []};
    obj[r.denomination].results.push(r.value);
    return obj;
  }, {});

  // Clear the previous pending roll
  _pendingRoll = {};

  // Sort denominations from largest to smallest
  const sorted = Object.values(groups).sort((a, b) => b.denomination - a.denomination);

  // Create a Roll instance
  const formula = sorted.map(group => `${group.results.length}d${group.denomination}`).join(" + ");
  const rollData = {
    class: "Roll",
    evaluated: true,
    formula: formula,
    terms: sorted.map(group => {
      return {
        class: "Die",
        evaluated: true,
        number: group.results.length,
        faces: group.denomination,
        modifiers: [],
        results: group.results.map(r => ({active: true, result: r}))
      }
    })
  }
  const roll = Roll.fromData(rollData);
  roll._total = roll._evaluateTotal();

  // Create a chat message
  await roll.toMessage();
}
