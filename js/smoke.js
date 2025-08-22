// Sony XMB-style colorful wave effect - 4x wider
// This file now just initializes the plugin manager
(function() {
  // Function to safely call checkSettingsAndLoad if PluginManager is available
  function safeCheckSettingsAndLoad() {
    if (window.PluginManager && typeof window.PluginManager.checkSettingsAndLoad === 'function') {
      window.PluginManager.checkSettingsAndLoad();
    } else {
      // If PluginManager is not ready, try again after a short delay
      setTimeout(safeCheckSettingsAndLoad, 100);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState !== 'loading') {
    setTimeout(safeCheckSettingsAndLoad, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(safeCheckSettingsAndLoad, 100);
    });
  }

  // Also check settings when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(safeCheckSettingsAndLoad, 100);
    }
  });
})();