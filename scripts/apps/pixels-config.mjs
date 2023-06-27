import {handleRoll, handleStatus} from "../handlers.mjs";

/**
 * An application used for initial configuration of Pixels dice.
 */
export default class PixelsConfiguration extends FormApplication {
  constructor(_, options) {
    super(pixelsDice, options);
    pixelsDice.config = this;
  }

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
    const pixels = [];
    for ( const config of pixelsDice.PIXELS.values() ) {
      await config.pixel.queryRssi();
      pixels.push(config);
    }
    return {pixels};
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

    // Disable the button
    button.disabled = true;
    const icon = button.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";

    // Attempt connection to the device
    let pixel;
    try {
      pixel = await pixelsWebConnect.requestPixel();
      await pixelsWebConnect.repeatConnect(pixel, {retries: 3});
    }

    // Failed to connect
    catch(err) {
      return ui.notifications.error(err, {console: true});
    }

    // Register the pixel configuration
    const config = {name: pixel.name, pixel, denomination: 20, icon: "fa-solid fa-dice-d20"};
    config.handleRoll = roll => handleRoll(config, roll);
    config.handleStatus = status => handleStatus(config, status);
    pixel.addEventListener("roll", config.handleRoll);
    pixel.addEventListener("status", config.handleStatus);
    pixelsDice.PIXELS.set(pixel.name, config);
    await pixel.blink(Color.from("#cc6600"));

    // Re-enable the button
    icon.className = "fa-solid fa-plus";
    button.disabled = false;
  }

  /* -------------------------------------------- */

  /**
   * Forget a Pixels dice, removing it from the connected set.
   * @param {HTMLElement} button    The clicked button element
   * @returns {Promise<void>}
   */
  async #disconnectPixel(button) {
    const pixelName = button.closest(".pixel").dataset.pixelId;
    const config = pixelsDice.PIXELS.get(pixelName);
    if ( !config ) return;
    const pixel = config.pixel;
    pixelsDice.PIXELS.delete(pixelName);
    pixel.removeEventListener("roll", config.handleRoll);
    pixel.removeEventListener("status", config.handleStatus);
    await pixel.disconnect();
    this.render(false, {height: "auto"});
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // No-op
  }
}
