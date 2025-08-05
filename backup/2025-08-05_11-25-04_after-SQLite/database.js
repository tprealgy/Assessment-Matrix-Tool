const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'data', 'matris.db');
    this.db = null;
  }

  // Initialize database connection and create tables
  async init() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // Create database tables
  async createTables() {
    const tables = [
      // Courses table
      `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )`,

      // Assessment areas table
      `CREATE TABLE IF NOT EXISTS assessment_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
      )`,

      // Students table
      `CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        course_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        hidden BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
      )`,

      // Assignments table
      `CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        assessment_area_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        level TEXT NOT NULL CHECK (level IN ('E', 'C', 'A')),
        color TEXT NOT NULL CHECK (color IN ('green', 'yellow', 'red', 'grey')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_area_id) REFERENCES assessment_areas (id) ON DELETE CASCADE
      )`,

      // Grades table
      `CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        assessment_area_id INTEGER NOT NULL,
        level TEXT NOT NULL CHECK (level IN ('E', 'C', 'A')),
        grade_color TEXT CHECK (grade_color IN ('green', 'yellow', 'red', 'grey')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_area_id) REFERENCES assessment_areas (id) ON DELETE CASCADE,
        UNIQUE (student_id, assessment_area_id, level)
      )`,

      // App settings table
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_students_course ON students (course_id)',
      'CREATE INDEX IF NOT EXISTS idx_assessment_areas_course ON assessment_areas (course_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments (student_id)',
      'CREATE INDEX IF NOT EXISTS idx_grades_student ON grades (student_id)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }
  }

  // Helper method to run SQL queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper method to get single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper method to get all rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;