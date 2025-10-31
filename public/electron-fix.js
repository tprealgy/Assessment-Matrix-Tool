// Enhanced Electron input focus fix for modal/alert focus issues
(function() {
  'use strict';
  
  // Only run in Electron environment
  if (!window.process || !window.process.versions || !window.process.versions.electron) {
    return;
  }

  let lastFocusedElement = null;
  let focusRecoveryTimeout = null;

  function forceInputFocus(element) {
    if (!element) return;
    
    // Multiple focus attempts with different timings
    element.focus();
    setTimeout(() => {
      element.focus();
      element.click();
    }, 10);
    setTimeout(() => {
      element.focus();
      if (element.select && element.type !== 'button') {
        element.select();
      }
    }, 50);
  }

  function recoverFocus() {
    // Try to focus the last focused element, or find any input
    const targetElement = lastFocusedElement || 
                         document.querySelector('input[type="text"]:not([disabled]), textarea:not([disabled])');
    
    if (targetElement && document.body.contains(targetElement)) {
      forceInputFocus(targetElement);
    }
  }

  function initInputFocus() {
    // Track focused elements
    document.addEventListener('focusin', function(event) {
      if (event.target.matches('input, textarea, select')) {
        lastFocusedElement = event.target;
      }
    });

    // Enhanced click handling with focus recovery
    document.addEventListener('click', function(event) {
      if (event.target.matches('input, textarea, select')) {
        clearTimeout(focusRecoveryTimeout);
        forceInputFocus(event.target);
        lastFocusedElement = event.target;
      }
    });

    // Monitor for focus loss and recover
    document.addEventListener('focusout', function(event) {
      if (event.target.matches('input, textarea, select')) {
        // Set a recovery timeout in case focus gets stuck
        clearTimeout(focusRecoveryTimeout);
        focusRecoveryTimeout = setTimeout(() => {
          // Check if no input is currently focused
          const activeElement = document.activeElement;
          if (!activeElement || !activeElement.matches('input, textarea, select')) {
            recoverFocus();
          }
        }, 100);
      }
    });

    // Override native alert and confirm to trigger focus recovery
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    
    window.alert = function(message) {
      const result = originalAlert.call(this, message);
      setTimeout(recoverFocus, 100);
      return result;
    };
    
    window.confirm = function(message) {
      const result = originalConfirm.call(this, message);
      setTimeout(recoverFocus, 100);
      return result;
    };

    // Monitor for modal visibility changes
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.classList.contains('modal-overlay')) {
            const isVisible = target.style.display !== 'none' && target.style.display !== '';
            if (!isVisible) {
              // Modal was just hidden, recover focus
              setTimeout(recoverFocus, 150);
            }
          }
        }
      });
    });

    // Observe modal elements
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    });

    // Also observe for dynamically added modals
    const bodyObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('modal-overlay')) {
            observer.observe(node, { attributes: true, attributeFilter: ['style'] });
          }
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Focus first input on page load
    const firstInput = document.querySelector('input[type="text"], textarea');
    if (firstInput) {
      setTimeout(() => forceInputFocus(firstInput), 100);
    }

    // Global focus recovery hotkey (Ctrl+F1) as emergency fallback
    document.addEventListener('keydown', function(event) {
      if (event.ctrlKey && event.key === 'F1') {
        event.preventDefault();
        recoverFocus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInputFocus);
  } else {
    initInputFocus();
  }
})();