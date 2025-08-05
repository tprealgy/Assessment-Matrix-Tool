// Simple Electron input focus fix
(function() {
  'use strict';
  
  // Only run in Electron environment
  if (!window.process || !window.process.versions || !window.process.versions.electron) {
    return;
  }

  function initInputFocus() {
    // Focus first input on page load
    const firstInput = document.querySelector('input[type="text"], textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // Ensure inputs get focus when clicked
    document.addEventListener('click', function(event) {
      if (event.target.matches('input, textarea, select')) {
        setTimeout(() => event.target.focus(), 10);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInputFocus);
  } else {
    initInputFocus();
  }
})();