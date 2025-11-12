class NONEPlugin extends BasePlugin {
  constructor() {
    super('NONE');
  }

  init() {
    // For the NONE plugin, we don't initialize anything
    // This is intentionally left blank for low-resource systems
  }

  destroy() {
    // For the NONE plugin, there's nothing to destroy
    // This is intentionally left blank for low-resource systems
  }

  apply() {
    // Apply the NONE theme (no effects)
    this.init();
  }

  remove() {
    // Remove the NONE theme (no effects to remove)
    this.destroy();
  }
}