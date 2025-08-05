// Validation utility functions
const Validation = {
  // Check if string is not empty after trimming
  isNotEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  },

  // Validate course name
  validateCourseName(name) {
    if (!this.isNotEmpty(name)) {
      throw new Error('Kursnamn får inte vara tomt');
    }
    const maxLength = AppConfig.getLimit('maxCourseNameLength');
    if (name.length > maxLength) {
      throw new Error(`Kursnamn får inte vara längre än ${maxLength} tecken`);
    }
    return true;
  },

  // Validate student name
  validateStudentName(name) {
    if (!this.isNotEmpty(name)) {
      throw new Error('Studentnamn får inte vara tomt');
    }
    const maxLength = AppConfig.getLimit('maxStudentNameLength');
    if (name.length > maxLength) {
      throw new Error(`Studentnamn får inte vara längre än ${maxLength} tecken`);
    }
    return true;
  },

  // Validate assignment name
  validateAssignmentName(name) {
    if (!this.isNotEmpty(name)) {
      throw new Error('Uppgiftsnamn får inte vara tomt');
    }
    const maxLength = AppConfig.getLimit('maxAssignmentNameLength');
    if (name.length > maxLength) {
      throw new Error(`Uppgiftsnamn får inte vara längre än ${maxLength} tecken`);
    }
    return true;
  },

  // Validate assessment area name
  validateAreaName(name) {
    if (!this.isNotEmpty(name)) {
      throw new Error('Områdesnamn får inte vara tomt');
    }
    const maxLength = AppConfig.getLimit('maxAreaNameLength');
    if (name.length > maxLength) {
      throw new Error(`Områdesnamn får inte vara längre än ${maxLength} tecken`);
    }
    return true;
  },

  // Validate color value
  validateColor(color) {
    if (!AppConfig.assessment.validColors.includes(color)) {
      throw new Error('Ogiltig färg');
    }
    return true;
  },

  // Validate level
  validateLevel(level) {
    if (!AppConfig.assessment.validLevels.includes(level)) {
      throw new Error('Ogiltig nivå');
    }
    return true;
  },

  // Validate array is not empty
  validateNotEmptyArray(arr, message = 'Listan får inte vara tom') {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error(message);
    }
    return true;
  }
};