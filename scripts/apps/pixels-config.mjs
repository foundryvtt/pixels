const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * An application used for configuration of Pixels dice.
 * Displays a unified list of known dice with connection status indicators,
 * per-die reconnect buttons, and forget functionality.
 */
export default class PixelsConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
    pixelsDice.config = this;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "pixels-configuration",
    classes: ["pixels", "themed", "theme-dark"],
    tag: "form",
    window: {
      title: "PIXELS.CONFIG.Title"
    },
    position: {
      width: 480,
      height: "auto"
    },
    actions: {
      forgetPixel: PixelsConfiguration.#onForgetPixel,
      reconnectPixel: PixelsConfiguration.#onReconnectPixel,
      requestPixel: PixelsConfiguration.#onRequestPixel
    }
  };

  /** @override */
  static PARTS = {
    config: {
      template: "modules/pixels/templates/pixels-config.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const devices = [];
    for ( const config of pixelsDice.PIXELS.values() ) {
      const icon = config.denomination === "d00" ? "fa-percent" : `fa-dice-${config.denomination}`;
      devices.push({
        cssClass: config.active ? "active" : "inactive",
        statusClass: config.active ? "connected" : "disconnected",
        statusLabel: config.active ? "Connected" : "Disconnected",
        disconnectTooltip: config.active ? "Disconnect" : "Forget",
        name: config.name,
        pixelId: config.pixelId,
        denomination: config.denomination,
        denominationIcon: `fa-solid ${icon}`,
        active: config.active,
        battery: config.pixel?.batteryLevel
      });
    }
    devices.sort((a, b) => {
      if ( a.active !== b.active ) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return {
      devices,
      hasDevices: devices.length > 0
    };
  }

  /* -------------------------------------------- */

  /**
   * Forget a Pixels die, removing it from the known set entirely.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The action target.
   */
  static async #onForgetPixel(event, target) {
    const { pixelId } = target.closest(".pixel").dataset;
    const config = pixelsDice.PIXELS.get(pixelId);

    if ( config?.active ) {
      // Connected: just disconnect but keep in the known list
      await pixelsDice.PIXELS.disconnect(pixelId);
    } else {
      // Disconnected: forget entirely (un-pair and remove)
      await pixelsDice.PIXELS.forget(pixelId);
    }
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Reconnect to a specific known die using a filtered Bluetooth dialog.
   * The browser's device chooser will only show the die matching this name.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The action target.
   */
  static async #onReconnectPixel(event, target) {
    const pixelElement = target.closest(".pixel");
    const { pixelId } = pixelElement.dataset;
    target.disabled = true;
    const icon = target.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
    try {
      await pixelsDice.PIXELS.reconnectById(pixelId);
    } catch(err) {
      if ( err.name !== "NotFoundError" ) {
        ui.notifications.error("PIXELS.ERRORS.ReconnectFailed", { localize: true });
        console.error(err);
      }
    }
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Request connection to a brand new Pixel die.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The action target.
   */
  static async #onRequestPixel(event, target) {
    target.disabled = true;
    const icon = target.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
    try {
      await pixelsDice.PIXELS.request();
    } catch(err) {
      if ( err.name !== "NotFoundError" ) {
        ui.notifications.error("PIXELS.ERRORS.ConnectFailed", { localize: true });
        console.error(err);
      }
    }
    this.render();
  }
}
