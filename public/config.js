// Application Configuration
const AppConfig = {
  // Grade colors - change these to customize the color scheme
  colors: {
    grades: {
      green: '#28a745',
      yellow: '#ffc107',
      red: '#dc3545',
      grey: '#6c757d'
    },
    ui: {
      primary: '#3498db',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    }
  },

  // Data validation limits
  limits: {
    maxStudentNameLength: 100,
    maxCourseNameLength: 100,
    maxAssignmentNameLength: 200,
    maxAreaNameLength: 150,
    maxAreaDescriptionLength: 500,
    maxStudentsPerCourse: 50,
    maxAreasPerCourse: 20
  },

  // UI behavior settings
  ui: {
    toastDuration: 3000,
    modalAnimationDuration: 200,
    autoSaveDelay: 1000,
    confirmDeletions: true,
    showTooltips: true,
    defaultPageSize: 25
  },

  // Assessment settings
  assessment: {
    validLevels: ['E', 'C', 'A'],
    validColors: ['green', 'yellow', 'red', 'grey'],
    colorValues: { green: 2, yellow: 1, red: 0, grey: 0 },
    availableGradesForE: ['green', 'yellow', 'grey'],
    availableGradesForCA: ['green', 'yellow']
  },

  // Course management
  courses: {
    autoCleanupMonths: 6,
    backupRetentionDays: 30,
    allowDuplicateNames: false
  },

  // Development settings
  dev: {
    debugMode: false,
    verboseLogging: false,
    showPerformanceMetrics: false
  },

  // Get color by name with fallback
  getColor(colorName, fallback = '#6c757d') {
    const colorPath = colorName.split('.');
    let color = this.colors;
    
    for (const path of colorPath) {
      color = color?.[path];
    }
    
    return color || fallback;
  },

  // Get limit by name with fallback
  getLimit(limitName, fallback = 100) {
    return this.limits[limitName] || fallback;
  },

  // Get UI setting with fallback
  getUISetting(settingName, fallback = null) {
    return this.ui[settingName] !== undefined ? this.ui[settingName] : fallback;
  },

  // Update configuration (for user preferences)
  async updateConfig(path, value) {
    const keys = path.split('.');
    let obj = this;
    
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    
    // Save to file for persistence
    await this.saveToFile();
  },

  // Save config to file
  async saveToFile() {
    try {
      const configToSave = {
        colors: this.colors,
        ui: this.ui,
        assessment: this.assessment
      };
      
      const response = await fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.warn('Could not save config to file:', error);
      throw error;
    }
  },

  // Load config from file
  async loadFromFile() {
    try {
      const response = await fetch('/api/app-settings');
      if (response.ok) {
        const config = await response.json();
        
        // Merge saved config with defaults
        if (config.colors) Object.assign(this.colors, config.colors);
        if (config.ui) Object.assign(this.ui, config.ui);
        if (config.assessment) Object.assign(this.assessment, config.assessment);
      }
    } catch (error) {
      console.warn('Could not load config from file:', error);
    }
  },

  // Reset to defaults
  async resetToDefaults() {
    try {
      await fetch('/api/app-settings', { method: 'DELETE' });
      location.reload(); // Reload to get fresh defaults
    } catch (error) {
      console.warn('Could not reset settings:', error);
      location.reload();
    }
  }
};

// Load saved configuration on startup
AppConfig.loadFromFile();