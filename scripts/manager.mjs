import { handleStatus, pendingRoll } from "./handlers.mjs";

/**
 * @typedef {Object} PixelConfiguration
 * @property {string} name              The name of the connected Pixel
 * @property {string} pixelId           The unique pixel device ID.
 * @property {string} systemId          The bluetooth device system ID
 * @property {string} denomination      The die denomination.
 * @property {boolean} active           Is this pixel actively connected?
 * @property {Pixel} [pixel]            The connected Pixel device
 * @property {function} [handleRoll]    A bound handler function for roll events
 * @property {function} [handleStatus]  A bound handler function for status events
 */

/**
 * A custom Map which contains information about the currently connected Pixels devices.
 */
export default class PixelsManager extends Map {

  /* -------------------------------------------- */
  /*  Map Interface                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get (k) {
    return super.get(String(k));
  }

  /** @inheritDoc */
  set(k, v) {
    super.set(String(k), v);
    game.settings.set("pixels", "devices", this.toObject());
    return this;
  }

  /** @inheritDoc */
  delete(k) {
    const r = super.delete(String(k));
    if ( r ) game.settings.set("pixels", "devices", this.toObject());
    return r;
  }

  /* -------------------------------------------- */
  /*  Pixels Management                           */
  /* -------------------------------------------- */

  /**
   * Try reconnecting to previously known Pixels devices.
   * @returns {Promise<boolean>}    Were all reconnections successful?
   */
  async tryReconnect() {
    if ( !this.size ) return true;
    console.log("Pixels | Reconnecting to Pixels devices");
    let allReconnected = true;
    for ( const config of this.values() ) {
      // noinspection JSUnresolvedReference
      const pixel = await pixelsWebConnect.getPixel(config.systemId);
      let connected;
      if ( pixel ) {
        try {
          await this.connect(pixel);
          connected = true;
          console.log(`Pixels | Reconnected to Pixel ${config.name}`);
        } catch(err) {
          connected = false;
        }
      }
      if ( !connected ) {
        allReconnected = false;
        console.warn(`Pixels | Unable to reconnect to Pixel ${config.name}`);
      }
    }
    pixelsDice.config?.render();
    return allReconnected;
  }

  /* -------------------------------------------- */

  /**
   * Request connection to a new Pixel device.
   * @returns {Promise<void>}
   */
  async request() {
    // noinspection JSUnresolvedReference
    const pixel = await pixelsWebConnect.requestPixel();
    await this.connect(pixel);
  }

  /* -------------------------------------------- */

  /**
   * Connect a new Pixel.
   * @param {Pixel} pixel
   */
  async connect(pixel) {
    const config = this.get(pixel.pixelId) || {};

    // Attempt connection
    await pixel.connect();

    // Activate event handlers
    config.handleRoll = roll => pendingRoll(config, roll);
    config.handleStatus = status => handleStatus(config, status);
    pixel.addEventListener("roll", config.handleRoll);
    pixel.addEventListener("status", config.handleStatus);
    const denomination = pixel.dieType === "d6pipped" ? "d6" : pixel.dieType;
    // TODO: Core API needs to support fudge dice as an unfulfilled roll option.
    if ( (denomination === "unknown") || (denomination === "d6fudge") ) return;

    // Configure and set
    Object.assign(config, {
      denomination,
      name: pixel.name,
      pixelId: pixel.pixelId,
      systemId: pixel.systemId,
      pixel: pixel,
      active: true
    });
    this.set(pixel.pixelId, config);

    // Confirmation blink
    await pixel.blink(Color.from("#cc6600"));
  }

  /* -------------------------------------------- */
  /*  Saving and Loading                          */
  /* -------------------------------------------- */

  /**
   * Disconnect a Pixel by its ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async disconnect(id) {
    const config = this.get(id);
    const pixel = config?.pixel;
    if ( !config?.active || !pixel ) {
      this.delete(id);
      return;
    }
    pixel.removeEventListener("roll", config.handleRoll);
    pixel.removeEventListener("status", config.handleStatus);
    await pixel.disconnect();
    config.active = false;
  }

  /* -------------------------------------------- */

  /**
   * Convert the Map to an object for storage as a client setting.
   * @returns {object}
   */
  toObject() {
    const obj = {};
    for ( const [k, { name, systemId, pixelId, denomination }] of this.entries() ) {
      obj[k] = { name, systemId, pixelId, denomination };
    }
    return obj;
  }

  /* -------------------------------------------- */

  /**
   * Load and construct the PixelsManager from saved devices.
   * @returns {PixelsManager}
   */
  static fromSetting() {
    const devices = game.settings.get("pixels", "devices");
    return new this(Object.entries(devices).reduce((arr, [k, v]) => {
      v.active = false;
      if ( v.pixelId ) arr.push([k, v]);
      return arr;
    }, []));
  }
}
