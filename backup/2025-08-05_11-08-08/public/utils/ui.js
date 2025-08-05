// UI utility functions
const UI = {
  // Show toast notification
  showToast(message, isError = false) {
    const toast = document.getElementById('toastNotification') || this.createToast();
    toast.textContent = message;
    const bgColor = isError ? AppConfig.getColor('ui.danger') : '#333';
    toast.style.backgroundColor = bgColor;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, AppConfig.getUISetting('toastDuration', 3000));
  },

  // Create toast element if it doesn't exist
  createToast() {
    const toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
    return toast;
  },

  // Show confirmation dialog
  confirm(message) {
    return window.confirm(message);
  },

  // Show alert dialog
  alert(message) {
    return window.alert(message);
  },

  // Clear form inputs
  clearForm(formElement) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
        if (input.tagName === 'SELECT') {
          input.selectedIndex = -1;
        }
      }
    });
  },

  // Clear checkboxes in container
  clearCheckboxes(containerSelector) {
    document.querySelectorAll(`${containerSelector} input[type="checkbox"]`)
      .forEach(cb => cb.checked = false);
  },

  // Get selected checkbox values
  getSelectedCheckboxValues(containerSelector) {
    return [...document.querySelectorAll(`${containerSelector} input[type="checkbox"]:checked`)]
      .map(checkbox => checkbox.value);
  },

  // Show/hide element
  toggleElement(element, show) {
    element.style.display = show ? 'block' : 'none';
  },

  // Add loading state to button
  setButtonLoading(button, loading = true) {
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Laddar...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  },

  // Create element with attributes
  createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }
};