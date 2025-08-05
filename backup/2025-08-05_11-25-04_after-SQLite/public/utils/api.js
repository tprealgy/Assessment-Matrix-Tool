// API utility functions
class ApiClient {
  static async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  static async get(url) {
    return this.request(url);
  }

  static async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
}

// Course API functions
const CourseAPI = {
  async getAll() {
    return ApiClient.get('/api/courses');
  },

  async create(courseName) {
    return ApiClient.post('/api/courses', { courseName });
  },

  async update(courseName, data) {
    return ApiClient.put(`/api/courses/${courseName}`, data);
  },

  async delete(courseName) {
    return ApiClient.delete(`/api/courses/${courseName}`);
  },

  async getDeleted() {
    return ApiClient.get('/api/deleted-courses');
  },

  async restore(courseName, newCourseName = null) {
    return ApiClient.post('/api/courses/restore', { courseName, newCourseName });
  }
};

// Student API functions
const StudentAPI = {
  async getAll(courseName) {
    return ApiClient.get(`/api/students?course=${courseName}`);
  },

  async getById(studentId, courseName) {
    return ApiClient.get(`/api/students/${studentId}?course=${courseName}`);
  },

  async create(courseName, name) {
    return ApiClient.post(`/api/students?course=${courseName}`, { name });
  },

  async delete(studentId, courseName) {
    return ApiClient.delete(`/api/students/${studentId}?course=${courseName}`);
  },

  async toggleHide(studentId, courseName, hidden) {
    return ApiClient.put(`/api/students/${studentId}/toggle-hide?course=${courseName}`, { hidden });
  },

  async getDeleted(courseName) {
    return ApiClient.get(`/api/deleted-students?course=${courseName}`);
  },

  async restore(courseName, filename) {
    return ApiClient.post(`/api/students/restore?course=${courseName}`, { filename });
  },

  async import(courseName, students) {
    return ApiClient.post(`/api/students/import?course=${courseName}`, { students });
  }
};

// Assignment API functions
const AssignmentAPI = {
  async create(studentId, courseName, data) {
    return ApiClient.post(`/api/students/${studentId}/assignments?course=${courseName}`, data);
  },

  async createBulk(courseName, data) {
    return ApiClient.post(`/api/assignments/bulk?course=${courseName}`, data);
  },

  async delete(studentId, courseName, data) {
    return ApiClient.request(`/api/students/${studentId}/assignments?course=${courseName}`, {
      method: 'DELETE',
      body: JSON.stringify(data)
    });
  },

  async deleteAll(studentId, courseName) {
    return ApiClient.delete(`/api/students/${studentId}/assignments/all?course=${courseName}`);
  },

  async edit(studentId, courseName, data) {
    return ApiClient.put(`/api/students/${studentId}/assignments/edit?course=${courseName}`, data);
  },

  async grade(studentId, courseName, data) {
    return ApiClient.post(`/api/students/${studentId}/grade?course=${courseName}`, data);
  }
};

// Assessment Area API functions
const AssessmentAreaAPI = {
  async getAll(courseName) {
    return ApiClient.get(`/api/assessment-areas?course=${courseName}`);
  },

  async create(courseName, data) {
    return ApiClient.post(`/api/assessment-areas?course=${courseName}`, data);
  },

  async update(courseName, index, data) {
    return ApiClient.put(`/api/assessment-areas/${index}?course=${courseName}`, data);
  },

  async delete(courseName, index) {
    return ApiClient.delete(`/api/assessment-areas/${index}?course=${courseName}`);
  },

  async reorder(courseName, from, to) {
    return ApiClient.post(`/api/assessment-areas/reorder?course=${courseName}`, { from, to });
  }
};