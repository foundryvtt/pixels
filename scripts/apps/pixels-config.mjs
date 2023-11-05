/**
 * An application used for initial configuration of Pixels dice.
 */
export default class PixelsConfiguration extends FormApplication {
  constructor(manager, options) {
    super(manager, options);
    pixelsDice.config = this;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pixels-configuration",
      classes: ["pixels"],
      title: "Pixels Electronic Dice Configuration",
      template: "modules/pixels/templates/pixels-config.hbs",
      width: 480,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const context = {
      connected: [],
      disconnected: [],
      hasDevices: false
    }
    for ( const config of pixelsDice.PIXELS.values() ) {
      const arr = config.active ? context.connected : context.disconnected;
      arr.push({
        cssClass: config.active ? "active" : "inactive",
        name: config.name,
        dieIcon: config.icon,
        disconnectTooltip: config.active ? "Forget" : "Disconnect",
        denomination: `d${config.denomination}`,
        denominationIcon: "fa-solid fa-dice-d20",
        connectionIcon: config.active ? "fa-bluetooth" : "fa-signal-slash",
        rssi: await config.pixel?.queryRssi(),
        battery: config.pixel?.batteryLevel
      });
    }
    context.hasDevices = (context.connected.length + context.disconnected.length) > 0;
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    html.find("[data-action]").click(this.#onAction.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle action button clicks on the config app.
   * @param {Event} event       The initiating button click
   * @returns {Promise<void>}
   */
  async #onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    switch ( action ) {
      case "requestPixel":
        await this.#connectPixel(button);
        this.render(false, {height: "auto"});
        break;
      case "disconnectPixel":
        await this.#disconnectPixel(button);
        this.render(false, {height: "auto"});
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Manage the workflow to connect a new Pixels die.
   * @param {HTMLElement} button    The clicked button element
   * @returns {Promise<void>}
   */
  async #connectPixel(button) {
    button.disabled = true;
    const icon = button.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
    try {
      await pixelsDice.PIXELS.request();
    }
    catch(err) {
      return ui.notifications.error(err, {console: true});
    }
    this.render(false, {height: "auto"});
  }

  /* -------------------------------------------- */

  /**
   * Forget a Pixels dice, removing it from the connected set.
   * @param {HTMLElement} button    The clicked button element
   * @returns {Promise<void>}
   */
  async #disconnectPixel(button) {
    const pixelName = button.closest(".pixel").dataset.pixelId;
    await pixelsDice.PIXELS.disconnect(pixelName);
    this.render(false, {height: "auto"});
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // No-op
  }
}
