// Embedded server for Electron
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');

async function createEmbeddedServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());
  
  // Handle static files for both development and packaged app
  const path = require('path');
  const isElectron = process.versions && process.versions.electron;
  const publicPath = isElectron ? 
    path.join(__dirname, 'public') : 
    path.join(__dirname, 'public');
  
  console.log('Serving static files from:', publicPath);
  app.use(express.static(publicPath));

  // Initialize database on startup and wait for it
  console.log('Initializing database...');
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  
  try {
    await database.init();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }

  // --- Routes ---
  app.get('/', (req, res) => {
    res.redirect('/landing.html');
  });

  app.get('/favicon.ico', (req, res) => res.status(204).send());

  // App Settings Routes
  app.get('/api/app-settings', async (req, res) => {
    try {
      const settings = await database.all('SELECT key, value FROM app_settings');
      const result = {};
      settings.forEach(setting => {
        result[setting.key] = JSON.parse(setting.value);
      });
      res.json(result);
    } catch (error) {
      console.error('Failed to load app settings:', error);
      res.status(500).json({ error: 'Could not load settings' });
    }
  });

  app.post('/api/app-settings', async (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await database.run(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)]
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to save app settings:', error);
      res.status(500).json({ error: 'Could not save settings' });
    }
  });

  app.delete('/api/app-settings', async (req, res) => {
    try {
      await database.run('DELETE FROM app_settings');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete app settings:', error);
      res.status(500).json({ error: 'Could not reset settings' });
    }
  });

  // Course Routes
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await database.all(
        'SELECT name, display_name, color FROM courses WHERE deleted_at IS NULL ORDER BY name'
      );
      const result = courses.map(course => ({
        name: course.name,
        displayName: course.display_name,
        color: course.color
      }));
      res.json(result);
    } catch (error) {
      console.error('Failed to retrieve courses:', error);
      res.status(500).json({ error: 'Could not retrieve courses.' });
    }
  });

  app.post('/api/courses', async (req, res) => {
    console.log('POST /api/courses called with:', req.body);
    const { courseName } = req.body;
    if (!courseName) {
      console.log('No course name provided');
      return res.status(400).json({ error: 'Course name is required' });
    }

    try {
      console.log('Checking if course exists:', courseName);
      const existing = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (existing) {
        console.log('Course already exists');
        return res.status(409).json({ error: 'Course already exists' });
      }

      console.log('Creating new course:', courseName);
      await database.run(
        'INSERT INTO courses (name, display_name) VALUES (?, ?)',
        [courseName, courseName]
      );

      console.log('Course created successfully');
      res.status(201).json({ success: true, courseName });
    } catch (error) {
      console.error('Failed to create course:', error);
      res.status(500).json({ error: 'Could not create course.' });
    }
  });

  app.put('/api/courses/:courseName', async (req, res) => {
    const oldCourseName = req.params.courseName;
    const { newCourseName, newDisplayName, newColor } = req.body;

    if (!newCourseName || !newDisplayName) {
      return res.status(400).json({ error: 'New course name and display name are required' });
    }

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [oldCourseName]);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (oldCourseName !== newCourseName) {
        const existing = await database.get('SELECT id FROM courses WHERE name = ?', [newCourseName]);
        if (existing) {
          return res.status(409).json({ error: 'New course name already exists' });
        }
      }

      await database.run(
        'UPDATE courses SET name = ?, display_name = ?, color = ? WHERE name = ?',
        [newCourseName, newDisplayName, newColor || null, oldCourseName]
      );

      res.status(200).json({ success: true, courseName: newCourseName, displayName: newDisplayName, color: newColor });
    } catch (error) {
      console.error(`Error updating course ${oldCourseName}:`, error);
      res.status(500).json({ error: 'Failed to update course.' });
    }
  });

  app.delete('/api/courses/:courseName', async (req, res) => {
    const { courseName } = req.params;

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) {
        return res.status(404).json({ error: 'Course not found.' });
      }

      await database.run(
        'UPDATE courses SET deleted_at = CURRENT_TIMESTAMP WHERE name = ?',
        [courseName]
      );

      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting course ${courseName}:`, error);
      res.status(500).json({ error: 'Failed to delete course.' });
    }
  });

  app.get('/api/deleted-courses', async (req, res) => {
    try {
      const courses = await database.all(`
        SELECT name, display_name, deleted_at,
               CASE 
                 WHEN datetime(deleted_at, '+6 months') <= datetime('now', '+30 days') 
                 THEN 1 ELSE 0 
               END as will_expire_soon,
               CAST((julianday(datetime(deleted_at, '+6 months')) - julianday('now')) AS INTEGER) as days_until_expiration
        FROM courses 
        WHERE deleted_at IS NOT NULL 
          AND datetime(deleted_at, '+6 months') > datetime('now')
        ORDER BY deleted_at DESC
      `);

      const result = courses.map(course => ({
        name: course.name,
        deletedAt: new Date(course.deleted_at).toLocaleDateString('sv-SE'),
        willExpireSoon: course.will_expire_soon === 1,
        daysUntilExpiration: course.days_until_expiration
      }));

      res.json(result);
    } catch (error) {
      console.error('Failed to retrieve deleted courses:', error);
      res.status(500).json({ error: 'Could not retrieve deleted courses.' });
    }
  });

  app.post('/api/courses/restore', async (req, res) => {
    const { courseName, newCourseName } = req.body;
    if (!courseName) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const targetCourseName = newCourseName || courseName;

    try {
      const existing = await database.get('SELECT id FROM courses WHERE name = ? AND deleted_at IS NULL', [targetCourseName]);
      if (existing) {
        return res.status(409).json({ error: 'Course already exists' });
      }

      const deletedCourse = await database.get('SELECT id FROM courses WHERE name = ? AND deleted_at IS NOT NULL', [courseName]);
      if (!deletedCourse) {
        return res.status(404).json({ error: 'Course not found.' });
      }

      await database.run(
        'UPDATE courses SET name = ?, display_name = ?, deleted_at = NULL WHERE name = ?',
        [targetCourseName, newCourseName || courseName, courseName]
      );

      res.status(200).json({ success: true, courseName: targetCourseName });
    } catch (error) {
      console.error(`Error restoring course ${courseName}:`, error);
      res.status(500).json({ error: 'Could not restore course.' });
    }
  });

  // Student Routes
  app.get('/api/students', async (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const students = await database.all(`
        SELECT s.id, s.name, s.hidden
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE c.name = ? AND s.deleted_at IS NULL
        ORDER BY s.name COLLATE NOCASE
      `, [courseName]);

      res.json(students.map(s => ({
        id: s.id,
        name: s.name,
        hidden: s.hidden === 1
      })));
    } catch (error) {
      console.error('Failed to retrieve students:', error);
      res.status(500).json({ error: 'Could not retrieve students.' });
    }
  });

  // Student export route (must be before :id route)
  app.get('/api/students/export', async (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const students = await database.all(`
        SELECT s.id, s.name, s.hidden
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE c.name = ? AND s.deleted_at IS NULL
        ORDER BY s.name COLLATE NOCASE
      `, [courseName]);

      const jsonData = students.map(s => ({
        id: s.id,
        name: s.name,
        hidden: s.hidden === 1
      }));
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${courseName}_students_${timestamp}.json"`);
      res.json(jsonData);
    } catch (error) {
      console.error('Failed to export students:', error);
      res.status(500).json({ error: 'Could not export students.' });
    }
  });

  app.post('/api/students', async (req, res) => {
    const courseName = req.query.course;
    const { name } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const studentId = uuidv4();
      await database.run(
        'INSERT INTO students (id, course_id, name) VALUES (?, ?, ?)',
        [studentId, course.id, name]
      );

      res.status(201).json({ id: studentId, name, hidden: false, assignments: [] });
    } catch (error) {
      console.error('Failed to create student:', error);
      res.status(500).json({ error: 'Could not create student.' });
    }
  });

  app.get('/api/students/:id', async (req, res) => {
    const courseName = req.query.course;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const student = await database.get(`
        SELECT s.id, s.name, s.hidden
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE c.name = ? AND s.id = ? AND s.deleted_at IS NULL
      `, [courseName, studentId]);

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get assessment areas for this course
      const areas = await database.all(`
        SELECT id, name, description
        FROM assessment_areas
        WHERE course_id = (SELECT id FROM courses WHERE name = ?)
        ORDER BY sort_order
      `, [courseName]);

      // Get assignments and grades for this student
      const assignments = [];
      for (const area of areas) {
        const areaAssignments = { E: [], C: [], A: [], grades: { E: null, C: null, A: null } };
        
        // Get assignments for each level
        for (const level of ['E', 'C', 'A']) {
          const levelAssignments = await database.all(`
            SELECT name, color, created_at
            FROM assignments
            WHERE student_id = ? AND assessment_area_id = ? AND level = ?
            ORDER BY created_at DESC
          `, [studentId, area.id, level]);
          
          areaAssignments[level] = levelAssignments.map(a => ({
            name: a.name,
            color: a.color,
            createdAt: a.created_at
          }));
        }

        // Get grades for each level
        const grades = await database.all(`
          SELECT level, grade_color
          FROM grades
          WHERE student_id = ? AND assessment_area_id = ?
        `, [studentId, area.id]);

        grades.forEach(grade => {
          areaAssignments.grades[grade.level] = grade.grade_color;
        });

        assignments.push(areaAssignments);
      }

      res.json({
        id: student.id,
        name: student.name,
        hidden: student.hidden === 1,
        assignments
      });
    } catch (error) {
      console.error('Failed to retrieve student:', error);
      res.status(500).json({ error: 'Could not retrieve student.' });
    }
  });

  app.put('/api/students/:id/toggle-hide', async (req, res) => {
    const courseName = req.query.course;
    const { hidden } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      await database.run(
        'UPDATE students SET hidden = ? WHERE id = ? AND course_id = (SELECT id FROM courses WHERE name = ?)',
        [hidden ? 1 : 0, studentId, courseName]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to toggle student visibility:', error);
      res.status(500).json({ error: 'Could not update student.' });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    const courseName = req.query.course;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      await database.run(
        'UPDATE students SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND course_id = (SELECT id FROM courses WHERE name = ?)',
        [studentId, courseName]
      );
      res.status(204).end();
    } catch (error) {
      console.error('Failed to delete student:', error);
      res.status(500).json({ error: 'Could not delete student.' });
    }
  });

  app.post('/api/students/:id/assignments', async (req, res) => {
    const courseName = req.query.course;
    const { requirements, levelColors, assignmentName } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      for (const requirement of requirements) {
        const area = await database.get(
          'SELECT id FROM assessment_areas WHERE course_id = ? AND name = ?',
          [course.id, requirement]
        );
        
        if (area) {
          for (const lc of levelColors) {
            await database.run(
              'INSERT INTO assignments (student_id, assessment_area_id, name, level, color) VALUES (?, ?, ?, ?, ?)',
              [studentId, area.id, assignmentName, lc.level, lc.color]
            );
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to create assignment:', error);
      res.status(500).json({ error: 'Could not create assignment.' });
    }
  });

  app.post('/api/students/:id/grade', async (req, res) => {
    const courseName = req.query.course;
    const { areaIndex, level, gradeColor } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const area = await database.get(`
        SELECT id FROM assessment_areas 
        WHERE course_id = ? 
        ORDER BY sort_order 
        LIMIT 1 OFFSET ?
      `, [course.id, areaIndex]);

      if (area) {
        await database.run(
          'INSERT OR REPLACE INTO grades (student_id, assessment_area_id, level, grade_color) VALUES (?, ?, ?, ?)',
          [studentId, area.id, level, gradeColor]
        );
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to grade assignment:', error);
      res.status(500).json({ error: 'Could not grade assignment.' });
    }
  });

  // Batch grades endpoint for performance
  app.post('/api/students/:id/grades/batch', async (req, res) => {
    const courseName = req.query.course;
    const { updates } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (!updates || !Array.isArray(updates)) return res.status(400).json({ error: 'Updates array is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      for (const update of updates) {
        const { areaIndex, level, gradeColor } = update;
        const area = await database.get(`
          SELECT id FROM assessment_areas 
          WHERE course_id = ? 
          ORDER BY sort_order 
          LIMIT 1 OFFSET ?
        `, [course.id, areaIndex]);

        if (area) {
          await database.run(
            'INSERT OR REPLACE INTO grades (student_id, assessment_area_id, level, grade_color) VALUES (?, ?, ?, ?)',
            [studentId, area.id, level, gradeColor]
          );
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to batch grade assignments:', error);
      res.status(500).json({ error: 'Could not grade assignments.' });
    }
  });

  app.put('/api/students/:id/assignments/edit', async (req, res) => {
    const courseName = req.query.course;
    const { areaIndex, assignmentName, newLevelColors } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (areaIndex === undefined || !assignmentName || !newLevelColors) return res.status(400).json({ error: 'Area index, assignment name, and new level colors are required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const area = await database.get(`
        SELECT id FROM assessment_areas 
        WHERE course_id = ? 
        ORDER BY sort_order 
        LIMIT 1 OFFSET ?
      `, [course.id, areaIndex]);

      if (!area) return res.status(404).json({ error: 'Assessment area not found' });

      // Delete existing assignments for this student/area/assignment name
      await database.run(
        'DELETE FROM assignments WHERE student_id = ? AND assessment_area_id = ? AND name = ?',
        [studentId, area.id, assignmentName]
      );

      // Insert new assignments with updated colors
      for (const lc of newLevelColors) {
        await database.run(
          'INSERT INTO assignments (student_id, assessment_area_id, name, level, color) VALUES (?, ?, ?, ?, ?)',
          [studentId, area.id, assignmentName, lc.level, lc.color]
        );
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to edit assignment:', error);
      res.status(500).json({ error: 'Could not edit assignment.' });
    }
  });

  // Assessment Area Routes
  app.get('/api/assessment-areas', async (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const areas = await database.all(`
        SELECT name, description
        FROM assessment_areas
        WHERE course_id = (SELECT id FROM courses WHERE name = ?)
        ORDER BY sort_order
      `, [courseName]);
      res.json(areas);
    } catch (error) {
      console.error('Failed to retrieve assessment areas:', error);
      res.status(500).json({ error: 'Could not retrieve assessment areas.' });
    }
  });

  app.post('/api/assessment-areas', async (req, res) => {
    const courseName = req.query.course;
    const { name, description } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const maxOrder = await database.get(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM assessment_areas WHERE course_id = ?',
        [course.id]
      );

      await database.run(
        'INSERT INTO assessment_areas (course_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
        [course.id, name, description || '', maxOrder.max_order + 1]
      );

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Failed to create assessment area:', error);
      res.status(500).json({ error: 'Could not create assessment area.' });
    }
  });

  app.get('/api/deleted-students', async (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const students = await database.all(`
        SELECT s.id, s.name, s.deleted_at
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE c.name = ? AND s.deleted_at IS NOT NULL
        ORDER BY s.deleted_at DESC
      `, [courseName]);

      const result = students.map(s => ({
        name: s.name,
        deletedAt: new Date(s.deleted_at).toLocaleDateString('sv-SE'),
        filename: s.id
      }));

      res.json(result);
    } catch (error) {
      console.error('Failed to retrieve deleted students:', error);
      res.status(500).json({ error: 'Could not retrieve deleted students.' });
    }
  });

  app.post('/api/students/restore', async (req, res) => {
    const courseName = req.query.course;
    const { filename } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (!filename) return res.status(400).json({ error: 'Student ID is required' });

    try {
      const student = await database.get(`
        SELECT s.id
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE c.name = ? AND s.id = ? AND s.deleted_at IS NOT NULL
      `, [courseName, filename]);

      if (!student) {
        return res.status(404).json({ error: 'Deleted student not found' });
      }

      await database.run(
        'UPDATE students SET deleted_at = NULL WHERE id = ?',
        [filename]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to restore student:', error);
      res.status(500).json({ error: 'Could not restore student.' });
    }
  });

  app.post('/api/students/import', async (req, res) => {
    const courseName = req.query.course;
    const { students } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    if (!students || !Array.isArray(students)) return res.status(400).json({ error: 'Students array is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      for (const student of students) {
        await database.run(
          'INSERT OR REPLACE INTO students (id, course_id, name, hidden, deleted_at) VALUES (?, ?, ?, ?, ?)',
          [student.id, course.id, student.name, student.hidden ? 1 : 0, null]
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to import students:', error);
      res.status(500).json({ error: 'Could not import students.' });
    }
  });

  // Get last assignment for preview
  app.get('/api/students/:id/assignments/last', async (req, res) => {
    const courseName = req.query.course;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const lastAssignment = await database.get(`
        SELECT a.name, a.created_at
        FROM assignments a
        JOIN assessment_areas aa ON a.assessment_area_id = aa.id
        WHERE a.student_id = ? AND aa.course_id = ?
        ORDER BY a.created_at DESC
        LIMIT 1
      `, [studentId, course.id]);

      if (!lastAssignment) {
        return res.json({ success: false, message: 'No assignments found' });
      }

      res.json({ success: true, assignmentName: lastAssignment.name });
    } catch (error) {
      console.error('Failed to get last assignment:', error);
      res.status(500).json({ error: 'Could not get assignment.' });
    }
  });

  // Undo last assignment route
  app.delete('/api/students/:id/assignments/undo-last', async (req, res) => {
    const courseName = req.query.course;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      // Find the most recent assignment for this student
      const lastAssignment = await database.get(`
        SELECT a.name, a.created_at
        FROM assignments a
        JOIN assessment_areas aa ON a.assessment_area_id = aa.id
        WHERE a.student_id = ? AND aa.course_id = ?
        ORDER BY a.created_at DESC
        LIMIT 1
      `, [studentId, course.id]);

      if (!lastAssignment) {
        return res.json({ success: false, message: 'No assignments to undo' });
      }

      // Delete all assignments with the same name and creation time
      await database.run(`
        DELETE FROM assignments 
        WHERE student_id = ? 
          AND name = ? 
          AND created_at = ?
          AND assessment_area_id IN (
            SELECT id FROM assessment_areas WHERE course_id = ?
          )
      `, [studentId, lastAssignment.name, lastAssignment.created_at, course.id]);

      res.json({ success: true, assignmentName: lastAssignment.name });
    } catch (error) {
      console.error('Failed to undo last assignment:', error);
      res.status(500).json({ error: 'Could not undo assignment.' });
    }
  });

  // Delete individual assignment
  app.delete('/api/students/:id/assignments', async (req, res) => {
    const courseName = req.query.course;
    const { areaIndex, level, assignmentIndex } = req.body;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const area = await database.get(`
        SELECT id FROM assessment_areas 
        WHERE course_id = ? 
        ORDER BY sort_order 
        LIMIT 1 OFFSET ?
      `, [course.id, areaIndex]);

      if (!area) return res.status(404).json({ error: 'Assessment area not found' });

      // Get the specific assignment to delete
      const assignments = await database.all(`
        SELECT id FROM assignments
        WHERE student_id = ? AND assessment_area_id = ? AND level = ?
        ORDER BY created_at DESC
      `, [studentId, area.id, level]);

      if (assignments[assignmentIndex]) {
        await database.run(
          'DELETE FROM assignments WHERE id = ?',
          [assignments[assignmentIndex].id]
        );
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      res.status(500).json({ error: 'Could not delete assignment.' });
    }
  });

  // Delete all assignments for student
  app.delete('/api/students/:id/assignments/all', async (req, res) => {
    const courseName = req.query.course;
    const studentId = req.params.id;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      await database.run(`
        DELETE FROM assignments 
        WHERE student_id = ? 
          AND assessment_area_id IN (
            SELECT id FROM assessment_areas WHERE course_id = ?
          )
      `, [studentId, course.id]);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete all assignments:', error);
      res.status(500).json({ error: 'Could not delete assignments.' });
    }
  });

  // Bulk assignment creation
  app.post('/api/assignments/bulk', async (req, res) => {
    const courseName = req.query.course;
    const { requirements, assignmentName } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });

    try {
      const course = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      // Get all students in the course
      const students = await database.all(`
        SELECT id FROM students 
        WHERE course_id = ? AND deleted_at IS NULL AND hidden = 0
      `, [course.id]);

      let studentsUpdated = 0;
      for (const student of students) {
        for (const requirement of requirements) {
          const area = await database.get(
            'SELECT id FROM assessment_areas WHERE course_id = ? AND name = ?',
            [course.id, requirement]
          );
          
          if (area) {
            // Create assignment for E, C, A levels with green color
            for (const level of ['E', 'C', 'A']) {
              await database.run(
                'INSERT INTO assignments (student_id, assessment_area_id, name, level, color) VALUES (?, ?, ?, ?, ?)',
                [student.id, area.id, assignmentName, level, 'green']
              );
            }
          }
        }
        studentsUpdated++;
      }

      res.status(200).json({ success: true, studentsUpdated });
    } catch (error) {
      console.error('Failed to create bulk assignments:', error);
      res.status(500).json({ error: 'Could not create assignments.' });
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Embedded server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

module.exports = { createEmbeddedServer };