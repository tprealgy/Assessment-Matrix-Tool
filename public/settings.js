document.addEventListener('DOMContentLoaded', () => {
  // Initialize breadcrumb
  initBreadcrumb('settings');
  
  // Initialize help system
  initHelpSystem('settings');

  // Load current settings into form
  function loadSettings() {
    // Load colors
    document.getElementById('color-green').value = AppConfig.getColor('grades.green');
    document.getElementById('color-yellow').value = AppConfig.getColor('grades.yellow');
    document.getElementById('color-red').value = AppConfig.getColor('grades.red');
    document.getElementById('color-grey').value = AppConfig.getColor('grades.grey');

    // Load limits
    document.getElementById('limit-student').value = AppConfig.getLimit('maxStudentNameLength');
    document.getElementById('limit-course').value = AppConfig.getLimit('maxCourseNameLength');
    document.getElementById('limit-assignment').value = AppConfig.getLimit('maxAssignmentNameLength');
    document.getElementById('limit-area').value = AppConfig.getLimit('maxAreaNameLength');

    // Load UI settings
    document.getElementById('toast-duration').value = AppConfig.getUISetting('toastDuration');
    document.getElementById('confirm-deletions').checked = AppConfig.getUISetting('confirmDeletions');
    document.getElementById('show-tooltips').checked = AppConfig.getUISetting('showTooltips');
  }

  // Save settings
  document.getElementById('save-settings').addEventListener('click', async () => {
    try {
      // Update colors
      await AppConfig.updateConfig('colors.grades.green', document.getElementById('color-green').value);
      await AppConfig.updateConfig('colors.grades.yellow', document.getElementById('color-yellow').value);
      await AppConfig.updateConfig('colors.grades.red', document.getElementById('color-red').value);
      await AppConfig.updateConfig('colors.grades.grey', document.getElementById('color-grey').value);

      // Update limits
      await AppConfig.updateConfig('limits.maxStudentNameLength', parseInt(document.getElementById('limit-student').value));
      await AppConfig.updateConfig('limits.maxCourseNameLength', parseInt(document.getElementById('limit-course').value));
      await AppConfig.updateConfig('limits.maxAssignmentNameLength', parseInt(document.getElementById('limit-assignment').value));
      await AppConfig.updateConfig('limits.maxAreaNameLength', parseInt(document.getElementById('limit-area').value));

      // Update UI settings
      await AppConfig.updateConfig('ui.toastDuration', parseInt(document.getElementById('toast-duration').value));
      await AppConfig.updateConfig('ui.confirmDeletions', document.getElementById('confirm-deletions').checked);
      await AppConfig.updateConfig('ui.showTooltips', document.getElementById('show-tooltips').checked);

      UI.showToast('Inställningar sparade! Ladda om sidan för att se alla ändringar.');
    } catch (error) {
      UI.showToast('Kunde inte spara inställningar: ' + error.message, true);
    }
  });

  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', async () => {
    if (UI.confirm('Är du säker på att du vill återställa alla inställningar till standard? Detta kan inte ångras.')) {
      try {
        await AppConfig.resetToDefaults();
      } catch (error) {
        UI.showToast('Kunde inte återställa inställningar: ' + error.message, true);
      }
    }
  });

  // Load settings on page load
  loadSettings();
});