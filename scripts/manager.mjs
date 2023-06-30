import {handleRoll, handleStatus} from "./handlers.mjs";

/**
 * @typedef {Object} PixelConfiguration
 * @property {string} name              The name of the connected Pixel
 * @property {string} systemId          The bluetooth device system ID
 * @property {number} denomination      The number of faces
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
  set(k, v) {
    super.set(k, v);
    game.settings.set("pixels", "devices", this.toObject());
    return this;
  }

  /** @inheritDoc */
  delete(k) {
    const r = super.delete(k);
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
    console.groupCollapsed("Pixels | Reconnecting to Pixels devices");
    let allReconnected = true;
    for ( const config of this.values() ) {
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
    console.groupEnd();
    return allReconnected;
  }

  /* -------------------------------------------- */

  /**
   * Request connection to a new Pixel device.
   * @returns {Promise<void>}
   */
  async request() {
    const pixel = await pixelsWebConnect.requestPixel();
    await this.connect(pixel);
  }

  /* -------------------------------------------- */

  /**
   * Connect a new Pixel.
   * @param {Pixel} pixel
   */
  async connect(pixel) {
    const config = this.get(pixel.name) || {};

    // Attempt connection
    await pixelsWebConnect.repeatConnect(pixel, {retries: 3});

    // Activate event handlers
    config.handleRoll = roll => handleRoll(config, roll);
    config.handleStatus = status => handleStatus(config, status);
    pixel.addEventListener("roll", config.handleRoll);
    pixel.addEventListener("status", config.handleStatus);

    // Configure and set
    Object.assign(config, {
      name: pixel.name,
      systemId: pixel.systemId,
      denomination: pixel.dieFaceCount,
      active: true
    });
    this.set(pixel.name, config);

    // Confirmation blink
    await pixel.blink(Color.from("#cc6600"));
  }

  /* -------------------------------------------- */
  /*  Saving and Loading                          */
  /* -------------------------------------------- */

  /**
   * Disconnect a Pixel by name.
   * @param {string} name
   * @returns {Promise<void>}
   */
  async disconnect(name) {
    const config = this.get(pixel.name);
    if ( !config?.pixel ) return;
    const pixel = config.pixel;
    pixel.removeEventListener("roll", pixel.handleRoll);
    pixel.removeEventListener("status", pixel.handleStatus);
    await pixel.disconnect();
    this.delete(name);
  }

  /* -------------------------------------------- */

  /**
   * Convert the Map to an object for storage as a client setting.
   * @returns {object}
   */
  toObject() {
    const obj = {};
    for ( const [k, v] of this.entries() ) {
      obj[k] = {name: v.name, systemId: v.systemId, denomination: v.denomination};
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
    return new this(Object.entries(devices).map(([k, v]) => {
      v.active = false;
      return [k, v];
    }));
  }
}
