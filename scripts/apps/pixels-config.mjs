const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * An application used for initial configuration of Pixels dice.
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
      disconnectPixel: PixelsConfiguration.#onDisconnectPixel,
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
    const context = {
      connected: [],
      disconnected: [],
      hasDevices: false
    }
    for ( const config of pixelsDice.PIXELS.values() ) {
      let rssi;
      try {
        rssi = await config.pixel?.queryRssi();
      } catch(err) {
        ui.notifications.warn("PIXELS.ERRORS.ReconnectFailed", { localize: true });
        console.error(err);
        await pixelsDice.PIXELS.disconnect(config.pixelId);
      }

      const arr = config.active ? context.connected : context.disconnected;
      const icon = config.denomination === "d00" ? "fa-percent" : `fa-dice-${config.denomination}`;

      arr.push({
        rssi,
        cssClass: config.active ? "active" : "inactive",
        name: config.name,
        pixelId: config.pixelId,
        dieIcon: config.icon,
        disconnectTooltip: `PIXELS.CONFIG.ACTIONS.${config.active ? "Disconnect" : "Forget"}`,
        denomination: config.denomination,
        denominationIcon: `fa-solid ${icon}`,
        connectionIcon: config.active ? "fa-bluetooth" : "fa-signal-slash",
        battery: config.pixel?.batteryLevel
      });
    }
    context.hasDevices = (context.connected.length + context.disconnected.length) > 0;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Forget a Pixels die, removing it from the connected set.
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<void>}
   */
  static async #onDisconnectPixel(event, target) {
    const { pixelId } = target.closest(".pixel").dataset;
    await pixelsDice.PIXELS.disconnect(pixelId);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Manage the workflow to connect a new Pixels die.
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<void>}
   */
  static async #onRequestPixel(event, target) {
    target.disabled = true;
    const icon = target.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
    try {
      await pixelsDice.PIXELS.request();
    } catch(err) {
      ui.notifications.error("PIXELS.ERRORS.ConnectFailed", { localize: true });
      console.error(err);
    }
    this.render();
  }
}
