
const PIXELS = new Map();

/**
 * A queue of PixelsResolver instances which require resolution
 * @type {PixelsResolver[]}
 */
const RESOLVERS = [];


// OPEN QUESTIONS

// How to automatically connect to already paired bluetooth devices on a refresh? must repeat the pairing process every time?

// How to differentiate a pixels d20 from a pixels d8? .designAndColor reports "generic" is that meaningful?

// Common error when connecting: DOMException: GATT Server is disconnected. Cannot retrieve services. (Re)connect first with `device.gatt.connect`?

Hooks.on("init", function() {
  const module = globalThis.pixels = game.modules.get("pixels");
  module.PIXELS = PIXELS;
});

Hooks.on("ready", async function() {
  const app = new PixelsConfiguration();
  app.render(true);
});

Hooks.once('unfulfilled-rolls-bluetooth', function(providers) {
  providers.pixels = {
    label: "Pixels - Electronic Dice",
    url: "https://gamewithpixels.com",
    app: PixelsResolver
  }
});

function handleRoll(pixel, result) {
  console.debug(`${pixel.name} rolled an ${result}`);
  const resolver = RESOLVERS[0];
  if ( !resolver ) return;
  resolver.registerResult(pixel, result);
}


class PixelsConfiguration extends Application {

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

  /** @override */
  async getData(options) {
    const pixels = [];
    for ( const config of PIXELS.values() ) {
      await config.pixel.queryRssi();
      pixels.push(config);
    }
    return {pixels};
  }

  /** @override */
  activateListeners(html) {
    html.find("[data-action]").click(this.#onAction.bind(this));
  }

  async #onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    switch ( action ) {
      case "requestPixel":
        await this.#connectPixel(button);
        this.render(false, {height: "auto"});
        break;
    }
  }

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
      const pixel = await pixelsWebConnect.requestPixel();
      await pixel.connect();
      const config = {name: pixel.name, pixel, denomination: 20, icon: "fa-solid fa-dice-d20"};
      pixel.addEventListener("roll", result => handleRoll(config, result));
      pixel.addEventListener("status", event => {
        debugger;
      });
      PIXELS.set(pixel.name, config);
      await pixel.blink(Color.from("#cc6600"));
    } catch(err) {
      ui.notifications.error(err, {console: true});
    }
    icon.className = "fa-solid fa-plus";
    button.disabled = false;
  }
}


class PixelsResolver extends FormApplication {
  constructor(terms, roll, callback) {
    super();
    RESOLVERS.push(this);
    this.terms = terms;
    this.roll = roll;
    this.callback = callback;
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["pixels", "resolver"],
      title: "Pixels Roll Resolver",
      template: "modules/pixels/templates/pixels-resolver.hbs",
      width: 600,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false
    });
  }

  /** @override */
  async getData(options) {
    const terms = this.terms.map(t => ({...t,
      disabled: t.fulfillmentMethod === "bluetooth",
      label: `d${t.faces}`
    }));
    return {roll: this.roll, terms};
  }

  async _updateObject(event, formData) {
    const result = new Map(this.terms.map(t => [t.id, t.value]));
    for ( const [k, v] of Object.entries(formData) ) {
      if ( result.has(k) ) result.set(k, v);
    }
    return this.#resolve(result);
  }

  async registerResult({name, pixel, denomination}, result) {
    const nextTerm = this.terms.find(t => (t.fulfillmentMethod === "bluetooth") && (t.faces === denomination) && !t.value);
    if ( !nextTerm ) return;
    nextTerm.value = result;
    if ( this.#isComplete() ) {
      const result = new Map(this.terms.map(t => [t.id, t.value]));
      window.setTimeout(this.#resolve.bind(this, result), 1000);
    }
    this.render();
  }

  #isComplete() {
    return this.terms.every(t => Number.isNumeric(t.value));
  }

  #disableButton() {
    const submit = this.form.querySelector(`button[type="submit"]`);
    submit.disabled = true;
    const icon = submit.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
  }

  async #resolve(result) {
    RESOLVERS.findSplice(r => r === this);
    this.callback(result);
    return this.close();
  }
}
