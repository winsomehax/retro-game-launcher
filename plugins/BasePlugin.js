class BasePlugin {
  constructor(name) {
    this.name = name;
  }

  // Initialize the plugin
  init() {
    // To be implemented by subclasses
  }

  // Clean up the plugin
  destroy() {
    // To be implemented by subclasses
  }

  // Apply the plugin theme
  apply() {
    // To be implemented by subclasses
  }

  // Remove the plugin theme
  remove() {
    // To be implemented by subclasses
  }
}