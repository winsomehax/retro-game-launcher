class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.activePlugin = null;
    this.defaultPlugin = 'XMB';
    
    // Register built-in plugins
    this.registerPlugin('XMB', new XMBPlugin());
    this.registerPlugin('RADAR', new RADARPlugin());
  }

  // Register a new plugin
  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
  }

  // Load a plugin by name
  loadPlugin(name) {
    // If there's an active plugin, remove it first
    if (this.activePlugin) {
      this.activePlugin.remove();
    }

    // Get the plugin
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Plugin "${name}" not found`);
      return false;
    }

    // Apply the plugin
    plugin.apply();
    this.activePlugin = plugin;
    return true;
  }

  // Unload the current plugin
  unloadPlugin() {
    if (this.activePlugin) {
      this.activePlugin.remove();
      this.activePlugin = null;
    }
  }

  // Get list of available plugins
  getAvailablePlugins() {
    return Array.from(this.plugins.keys());
  }

  // Load the default plugin
  loadDefaultPlugin() {
    this.loadPlugin(this.defaultPlugin);
  }

  // Check settings and load appropriate plugin
  async checkSettingsAndLoad() {
    try {
      const settings = await window.electronAPI.loadSettings();
      
      if (settings.LOW_RESOURCES_MODE) {
        // Low resources mode is enabled, unload current plugin
        this.unloadPlugin();
      } else {
        // Low resources mode is disabled, load selected plugin or default
        const selectedPlugin = settings.BACKGROUND_EFFECT || this.defaultPlugin;
        this.loadPlugin(selectedPlugin);
      }
    } catch (error) {
      console.error('Error loading settings, defaulting to enable effect:', error);
      // If there's an error loading settings, default to enabling the effect
      this.loadDefaultPlugin();
    }
  }
}

// Create a global instance
window.PluginManager = new PluginManager();

// Expose function to check settings (can be called when settings change)
window.checkLowResourcesSetting = () => {
  window.PluginManager.checkSettingsAndLoad();
};

// Expose function to update background effect
window.updateBackgroundEffect = async (effect) => {
  try {
    const settings = await window.electronAPI.loadSettings();
    
    if (settings.LOW_RESOURCES_MODE) {
      // Low resources mode is enabled, unload current plugin
      window.PluginManager.unloadPlugin();
    } else {
      // Low resources mode is disabled, load selected plugin
      window.PluginManager.loadPlugin(effect);
    }
  } catch (error) {
    console.error('Error loading settings, defaulting to enable effect:', error);
    // If there's an error loading settings, load the selected plugin directly
    window.PluginManager.loadPlugin(effect);
  }
};