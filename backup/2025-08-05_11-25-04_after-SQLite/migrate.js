const fs = require('fs');
const path = require('path');
const database = require('./database');

class DataMigration {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.coursesDir = path.join(this.dataDir, 'courses');
    this.deletedDir = path.join(this.dataDir, 'deleted');
    this.deletedCoursesDir = path.join(this.dataDir, 'deleted_courses');
  }

  async migrate() {
    console.log('🚀 Starting migration from JSON to SQLite...');
    
    try {
      // Initialize database
      await database.init();
      
      // Migrate courses
      await this.migrateCourses();
      
      // Migrate app settings
      await this.migrateAppSettings();
      
      console.log('✅ Migration completed successfully!');
      console.log('📁 Original JSON files are preserved in data/ folder');
      console.log('🗄️ New SQLite database created at data/matris.db');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async migrateCourses() {
    if (!fs.existsSync(this.coursesDir)) {
      console.log('📂 No courses directory found, skipping course migration');
      return;
    }

    const courseDirs = fs.readdirSync(this.coursesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📚 Found ${courseDirs.length} courses to migrate`);

    for (const courseName of courseDirs) {
      await this.migrateSingleCourse(courseName);
    }

    // Migrate deleted courses
    await this.migrateDeletedCourses();
  }

  async migrateSingleCourse(courseName) {
    console.log(`  📖 Migrating course: ${courseName}`);
    
    const courseDir = path.join(this.coursesDir, courseName);
    
    // Load course metadata
    const metaPath = path.join(courseDir, 'course_meta.json');
    let courseMeta = { displayName: courseName, color: '' };
    if (fs.existsSync(metaPath)) {
      courseMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    // Insert course
    const courseResult = await database.run(
      'INSERT INTO courses (name, display_name, color) VALUES (?, ?, ?)',
      [courseName, courseMeta.displayName, courseMeta.color || null]
    );
    const courseId = courseResult.id;

    // Migrate assessment areas
    const areasPath = path.join(courseDir, 'assessmentAreas.json');
    let assessmentAreas = [];
    if (fs.existsSync(areasPath)) {
      assessmentAreas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));
    }

    const areaIdMap = {};
    for (let i = 0; i < assessmentAreas.length; i++) {
      const area = assessmentAreas[i];
      const areaResult = await database.run(
        'INSERT INTO assessment_areas (course_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
        [courseId, area.name, area.description || '', i]
      );
      areaIdMap[i] = areaResult.id;
    }

    // Migrate students
    const studentsPath = path.join(courseDir, 'students.json');
    if (fs.existsSync(studentsPath)) {
      const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
      
      for (const student of students) {
        // Insert student
        await database.run(
          'INSERT INTO students (id, course_id, name, hidden) VALUES (?, ?, ?, ?)',
          [student.id, courseId, student.name, student.hidden || false]
        );

        // Migrate assignments and grades
        if (student.assignments && Array.isArray(student.assignments)) {
          for (let areaIndex = 0; areaIndex < student.assignments.length; areaIndex++) {
            const assignmentRow = student.assignments[areaIndex];
            const areaId = areaIdMap[areaIndex];
            
            if (!areaId || !assignmentRow) continue;

            // Migrate assignments for each level
            for (const level of ['E', 'C', 'A']) {
              const assignments = assignmentRow[level];
              if (Array.isArray(assignments)) {
                for (const assignment of assignments) {
                  if (assignment.name) {
                    await database.run(
                      'INSERT INTO assignments (student_id, assessment_area_id, name, level, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                      [
                        student.id, 
                        areaId, 
                        assignment.name, 
                        level, 
                        assignment.color || 'grey',
                        assignment.createdAt || new Date().toISOString()
                      ]
                    );
                  }
                }
              }

              // Migrate grades
              if (assignmentRow.grades && assignmentRow.grades[level]) {
                await database.run(
                  'INSERT OR REPLACE INTO grades (student_id, assessment_area_id, level, grade_color) VALUES (?, ?, ?, ?)',
                  [student.id, areaId, level, assignmentRow.grades[level]]
                );
              }
            }
          }
        }
      }
    }

    console.log(`    ✅ Course ${courseName} migrated successfully`);
  }

  async migrateDeletedCourses() {
    if (!fs.existsSync(this.deletedCoursesDir)) {
      return;
    }

    const deletedDirs = fs.readdirSync(this.deletedCoursesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`🗑️ Found ${deletedDirs.length} deleted courses to migrate`);

    for (const courseName of deletedDirs) {
      const courseDir = path.join(this.deletedCoursesDir, courseName);
      const deletionInfoPath = path.join(courseDir, '.deletion_info.json');
      
      let deletedAt = new Date().toISOString();
      if (fs.existsSync(deletionInfoPath)) {
        const deletionInfo = JSON.parse(fs.readFileSync(deletionInfoPath, 'utf8'));
        deletedAt = deletionInfo.deletedAt;
      }

      // First migrate the course normally
      await this.migrateSingleCourse(courseName);
      
      // Then mark it as deleted
      await database.run(
        'UPDATE courses SET deleted_at = ? WHERE name = ?',
        [deletedAt, courseName]
      );
    }
  }

  async migrateAppSettings() {
    const settingsPath = path.join(this.dataDir, 'app_settings.json');
    if (!fs.existsSync(settingsPath)) {
      console.log('⚙️ No app settings found, skipping');
      return;
    }

    console.log('⚙️ Migrating app settings...');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    for (const [key, value] of Object.entries(settings)) {
      await database.run(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        [key, JSON.stringify(value)]
      );
    }
    
    console.log('  ✅ App settings migrated');
  }

  // Create backup of JSON files before migration
  async createBackup() {
    const backupDir = path.join(__dirname, 'data_backup_' + Date.now());
    console.log(`💾 Creating backup at ${backupDir}`);
    
    if (fs.existsSync(this.dataDir)) {
      fs.cpSync(this.dataDir, backupDir, { recursive: true });
      console.log('  ✅ Backup created successfully');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new DataMigration();
  
  migration.createBackup()
    .then(() => migration.migrate())
    .then(() => {
      console.log('🎉 Migration completed! You can now start the server.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = DataMigration;