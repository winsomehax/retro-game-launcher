// Sony XMB-style colorful wave effect - 4x wider
// This file now just initializes the plugin manager
(function() {
  // Initialize when DOM is ready
  if (document.readyState !== 'loading') {
    setTimeout(() => {
      window.PluginManager.checkSettingsAndLoad();
    }, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(() => {
        window.PluginManager.checkSettingsAndLoad();
      }, 100);
    });
  }

  // Also check settings when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(() => {
        window.PluginManager.checkSettingsAndLoad();
      }, 100);
    }
  });
})();