const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Initialize database on startup
database.init().catch(console.error);

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
  const { courseName } = req.body;
  if (!courseName) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  try {
    const existing = await database.get('SELECT id FROM courses WHERE name = ?', [courseName]);
    if (existing) {
      return res.status(409).json({ error: 'Course already exists' });
    }

    await database.run(
      'INSERT INTO courses (name, display_name) VALUES (?, ?)',
      [courseName, courseName]
    );

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

// Assignment Routes
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('🗄️ Using SQLite database');
});