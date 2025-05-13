/**
 * @typedef PixelsPendingRoll
 * @property {string} denomination  The die denomination.
 * @property {number} result        The roll result.
 */

/**
 * Pending rolls, grouped by pixel ID.
 * @typedef {Record<string, PixelsPendingRoll>} PixelsPendingRolls
 */

/**
 * @typedef PixelsRollGroup
 * @property {string} denomination  The die denomination.
 * @property {number[]} results     The results for this denomination.
 */

/**
 * Pending rolls, grouped by denomination.
 * @typedef {Record<string, PixelsRollGroup>} PixelsRollGroups
 */

/**
 * Handle disconnection events from a Pixel device.
 * Attempt automatic re-connection, otherwise prompt user that manual re-connection is required.
 * @param {PixelConfiguration} config  The die configuration.
 * @param {string} status              The status.
 * @returns {Promise<void>}
 */
export async function handleStatus(config, status) {
  if ( status !== "disconnected") return;   // Only care about disconnected for now
  if ( !config.active ) return; // Already disconnected
  config.active = false;
  pixelsDice.config.render();

  // Attempt re-connection
  ui.notifications.warn(game.i18n.format("PIXELS.ERRORS.STATUS.Lost", { name: config.name }));
  try {
    await config.pixel.connect();
    config.active = true;
    ui.notifications.info(game.i18n.format("PIXELS.ERRORS.STATUS.Success", { name: config.name }));
  }

  // Failed to re-connect
  catch(err) {
    delete config.pixel;
    pixelsDice.PIXELS.set(config.name, config);
    ui.notifications.warn(game.i18n.format("PIXELS.ERRORS.STATUS.Failure", { name: config.name }));
  }
  pixelsDice.config.render();
}

/* -------------------------------------------- */

/**
 * The currently pending rolls.
 * @type {PixelsPendingRolls}
 * @internal
 */
let _pendingRoll = {};

/**
 * Wait for additional physical dice rolls before completing an atomic roll action.
 * @param {PixelConfiguration} config
 * @param {number} result
 */
export function pendingRoll({ denomination, name, pixelId }, result) {
  // Treat a report of 0 on a d10 as a result of 10.
  if ( (denomination === "d10") && (result < 1) ) result = 10;
  if ( CONFIG.debug.pixels ) {
    console.debug(`Pixels | [${name}] [${pixelId}] Pending roll (${denomination}) - ${result}`);
  }
  _pendingRoll[pixelId] = { denomination, result };
  pixelsDice.debounceRoll();
}

/* -------------------------------------------- */

/**
 * Post an unprompted roll to chat.
 * @param {PixelsRollGroups} groups  The pending rolls, grouped by denomination.
 * @returns {Promise<ChatMessage>}
 */
function completeManualRoll(groups) {
  // Sort denominations from largest to smallest
  const sorted = Object.values(groups).filter(({ results }) => results.length).sort((a, b) => {
    return Number(b.denomination.slice(1)) - Number(a.denomination.slice(1));
  });

  // Create a Roll instance
  const formula = sorted.map(group => `${group.results.length}${group.denomination}`).join(" + ");
  const rollData = {
    class: "Roll",
    evaluated: true,
    formula: formula,
    terms: sorted.map(group => {
      return {
        class: "Die",
        evaluated: true,
        number: group.results.length,
        faces: Number(group.denomination.slice(1)),
        modifiers: [],
        results: group.results.map(r => ({active: true, result: r}))
      }
    })
  }
  const roll = Roll.fromData(rollData);
  roll._total = roll._evaluateTotal();

  // Create a chat message
  return roll.toMessage();
}

/* -------------------------------------------- */

/**
 * Submit the pending rolls.
 */
export function completePendingRoll() {
  // Group rolled dice by denomination.
  const groups = Object.values(_pendingRoll).reduce((obj, { denomination, result }) => {
    obj[denomination] ??= { denomination, results: [] };
    obj[denomination].results.push(result);
    return obj;
  }, {});

  // Clear the previous pending rolls.
  _pendingRoll = {};

  // Do one pass over available RollResolvers to fulfill any requested d10s before they are converted to d100s.
  handleRolls(groups);

  // Detect d100 rolls.
  detectD100Rolls(groups);

  // Do a second pass to fulfill any requested d100s.
  handleRolls(groups);

  // If there are unhandled rolls remaining, dispatch an unprompted roll.
  const allowUnprompted = game.settings.get("pixels", "allowUnprompted");
  if ( allowUnprompted && !foundry.utils.isEmpty(groups) ) return completeManualRoll(groups);
}

/* -------------------------------------------- */

/**
 * Detect any d100 rolls in a set of pending rolls.
 * If d00s are used, they will be prioritised, otherwise pairs of d10s will be taken.
 * // TODO: Core RollResolver needs to be able to support rolling d10s one-at-a-time in order to fulfill pending d100
 * // rolls.
 * @param {PixelsRollGroups} groups  The pending rolls, grouped by denomination.
 */
function detectD100Rolls(groups) {
  if ( CONFIG.debug.pixels ) console.debug("Pixels | Detecting d100 rolls ", foundry.utils.deepClone(groups));
  if ( !("d10" in groups) ) return;
  const working = foundry.utils.deepClone(groups);

  for ( let i = 0; i < working.d10.results.length; i++ ) {
    let result;
    let d10 = working.d10.results[i];
    let d00 = working.d00?.results[i];

    if ( CONFIG.debug.pixels ) console.debug(`Pixels | [${i}] Pairing d00 roll with d10 - ${d10}`);

    if ( d00 === undefined ) {
      d00 = working.d10.results[++i];
      if ( CONFIG.debug.pixels ) {
        if ( d00 === undefined ) console.debug(`Pixels | [${i}] Failed to find another d10 result to pair with`);
        else console.debug(`Pixels | [${i}] Found d10 result to pair with - ${d00}`);
      }
      if ( d00 === undefined ) break;
      else groups.d10.results = groups.d10.results.slice(2);
    } else {
      if ( CONFIG.debug.pixels ) console.debug(`Pixels | [${i}] Found d00 result to pair with - ${d00}`);
      groups.d10.results.shift();
      groups.d00.results.shift();
    }

    // When rolling a d10 as part of a percentile roll, treat 10s as 0.
    d10 %= 10;

    // Treat a roll of 00 and 0 as 100.
    if ( (d10 < 1) && (d00 < 1) ) result = 100;
    else result = d00 + d10;

    // Record the result.
    groups.d100 ??= { denomination: "d100", results: [] };
    groups.d100.results.push(result);
  }

  // Remove any unpaired d00s.
  delete groups.d00;
}

/* -------------------------------------------- */

/**
 * Dispatch pending rolls to any active RollResolvers.
 * @param {PixelsRollGroups} groups  The pending rolls, grouped by denomination.
 */
function handleRolls(groups) {
  if ( CONFIG.debug.pixels ) console.debug("Pixels | Handle pending rolls ", foundry.utils.deepClone(groups));
  for ( const [denomination, { results }] of Object.entries(groups) ) {
    let slice = 0;
    for ( const result of results ) {
      const handled = Roll.defaultImplementation.registerResult("pixels", denomination, result);
      if ( CONFIG.debug.pixels ) {
        console.debug(`Pixels | Registering result (${denomination}) - ${result}`);
        console.debug(`Pixels | Handled: ${!!handled}`);
      }
      if ( handled ) slice++;
      else break;
    }
    groups[denomination].results = results.slice(slice);
    if ( !groups[denomination].results.length ) delete groups[denomination];
  }
}
