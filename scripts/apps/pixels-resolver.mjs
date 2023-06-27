/**
 * A dialog form used to process input rolls for resolution.
 */
export default class PixelsResolver extends FormApplication {
  constructor(terms, roll, callback) {
    super();
    pixelsDice.RESOLVERS.push(this);
    this.terms = terms;
    this.roll = roll;
    this.callback = callback;
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const terms = this.terms.map(t => ({...t,
      disabled: t.fulfillmentMethod === "bluetooth",
      label: `d${t.faces}`
    }));
    return {roll: this.roll, terms};
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const result = new Map(this.terms.map(t => [t.id, t.value]));
    for ( const [k, v] of Object.entries(formData) ) {
      if ( result.has(k) ) result.set(k, v);
    }
    return this.#resolve(result);
  }

  /* -------------------------------------------- */

  /**
   * Record a result from a Pixels die roll event.
   * @param {PixelConfiguration} config   The configuration of the rolled Pixel
   * @param {number} result               The result of the roll
   * @returns {Promise<void>}
   */
  async registerResult(config, result) {
    const nextTerm = this.terms.find(t => {
      if ( t.value ) return false; // Already rolled
      if ( t.fulfillmentMethod !== "bluetooth" ) return false; // Not for Pixels
      if ( t.faces !== config.denomination ) return false;  // Wrong die
      return true;
    });
    if ( !nextTerm ) return;
    nextTerm.value = result;
    this.render();

    // Complete all rolls
    if ( this.#isComplete() ) {
      this.#disableButton();
      const result = new Map(this.terms.map(t => [t.id, t.value]));
      window.setTimeout(this.#resolve.bind(this, result), 1000);
    }
  }

  /* -------------------------------------------- */

  /**
   * Has the roll been entirely fulfilled?
   * @returns {boolean}
   */
  #isComplete() {
    return this.terms.every(t => Number.isNumeric(t.value));
  }

  /* -------------------------------------------- */

  /**
   * Disable the submit button if the roll is in the process of being fulfilled.
   */
  #disableButton() {
    const submit = this.form.querySelector(`button[type="submit"]`);
    submit.disabled = true;
    const icon = submit.querySelector("i");
    icon.className = "fa-solid fa-spinner fa-spin";
  }

  /* -------------------------------------------- */

  /**
   * Complete fulfillment of the roll by resolving the callback Promise.
   * @param {Map<string, number>} result      The fulfilled result
   * @returns {Promise<void>}
   */
  async #resolve(result) {
    pixelsDice.RESOLVERS.findSplice(r => r === this);
    this.callback(result);
    return this.close();
  }
}
