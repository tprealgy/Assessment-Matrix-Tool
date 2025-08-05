const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

function getCoursePaths(courseName) {
    const courseDir = path.join(__dirname, 'data', 'courses', courseName);
    return {
        courseDir: courseDir,
        studentsPath: path.join(courseDir, 'students.json'),
        assessmentAreasPath: path.join(courseDir, 'assessmentAreas.json'),
        courseMetaPath: path.join(courseDir, 'course_meta.json')
    };
}

function loadCourseMeta(courseName) {
  try {
    const { courseMetaPath } = getCoursePaths(courseName);
    const data = fs.readFileSync(courseMetaPath);
    return JSON.parse(data);
  } catch (error) {
    // Return default metadata if file not found or invalid
    return { displayName: courseName, color: '' };
  }
}

function saveCourseMeta(courseName, meta) {
  const { courseMetaPath } = getCoursePaths(courseName);
  fs.writeFileSync(courseMetaPath, JSON.stringify(meta, null, 2));
}

function loadAssessmentAreas(courseName) {
  try {
    const { assessmentAreasPath } = getCoursePaths(courseName);
    const data = fs.readFileSync(assessmentAreasPath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveAssessmentAreas(courseName, areas) {
  const { assessmentAreasPath } = getCoursePaths(courseName);
  fs.writeFileSync(assessmentAreasPath, JSON.stringify(areas, null, 2));
}

function loadStudents(courseName) {
  try {
    const { studentsPath } = getCoursePaths(courseName);
    const data = fs.readFileSync(studentsPath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveStudents(courseName, students) {
  const { studentsPath } = getCoursePaths(courseName);
  fs.writeFileSync(studentsPath, JSON.stringify(students, null, 2));
}

// --- Routes ---
app.get('/', (req, res) => {
  res.redirect('/landing.html');
});

app.get('/favicon.ico', (req, res) => res.status(204).send());

// Course Routes
app.get('/api/courses', (req, res) => {
  const coursesPath = path.join(__dirname, 'data', 'courses');
  fs.readdir(coursesPath, { withFileTypes: true }, (err, dirents) => {
    if (err) {
      console.error('Failed to read courses directory:', err);
      return res.status(500).json({ error: 'Could not retrieve courses.' });
    }
    const courses = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const courseName = dirent.name;
        const meta = loadCourseMeta(courseName);
        return { name: courseName, displayName: meta.displayName, color: meta.color };
      });
    res.json(courses);
  });
});

app.post('/api/courses', (req, res) => {
    const { courseName } = req.body;
    if (!courseName) {
        return res.status(400).json({ error: 'Course name is required' });
    }

    const coursePath = path.join(__dirname, 'data', 'courses', courseName);
    if (fs.existsSync(coursePath)) {
        return res.status(409).json({ error: 'Course already exists' });
    }

    fs.mkdirSync(coursePath, { recursive: true });
    fs.writeFileSync(path.join(coursePath, 'students.json'), '[]');
    fs.writeFileSync(path.join(coursePath, 'assessmentAreas.json'), '[]');
    saveCourseMeta(courseName, { displayName: courseName, color: '' });

    res.status(201).json({ success: true, courseName });
});

app.put('/api/courses/:courseName', (req, res) => {
    const oldCourseName = req.params.courseName;
    const { newCourseName, newDisplayName, newColor } = req.body;

    if (!newCourseName || !newDisplayName) {
        return res.status(400).json({ error: 'New course name and display name are required' });
    }

    const oldCoursePath = path.join(__dirname, 'data', 'courses', oldCourseName);
    const newCoursePath = path.join(__dirname, 'data', 'courses', newCourseName);

    if (!fs.existsSync(oldCoursePath)) {
        return res.status(404).json({ error: 'Course not found' });
    }

    if (oldCourseName !== newCourseName && fs.existsSync(newCoursePath)) {
        return res.status(409).json({ error: 'New course name already exists' });
    }

    try {
        // Update metadata
        saveCourseMeta(oldCourseName, { displayName: newDisplayName, color: newColor || '' });

        // Rename directory if course name changed
        if (oldCourseName !== newCourseName) {
            fs.renameSync(oldCoursePath, newCoursePath);
        }

        res.status(200).json({ success: true, courseName: newCourseName, displayName: newDisplayName, color: newColor });
    } catch (err) {
        console.error(`Error updating course ${oldCourseName}:`, err);
        res.status(500).json({ error: 'Failed to update course.' });
    }
});

app.delete('/api/courses/:courseName', (req, res) => {
    const { courseName } = req.params;
    const coursePath = path.join(__dirname, 'data', 'courses', courseName);
    const deletedCoursesPath = path.join(__dirname, 'data', 'deleted_courses');

    if (!fs.existsSync(deletedCoursesPath)) {
        fs.mkdirSync(deletedCoursesPath, { recursive: true });
    }

    const coursesDir = path.join(__dirname, 'data', 'courses');
    if (!path.resolve(coursePath).startsWith(coursesDir)) {
        return res.status(400).json({ error: 'Invalid course name provided.' });
    }

    if (fs.existsSync(coursePath)) {
        try {
            const newPath = path.join(deletedCoursesPath, courseName);
            fs.renameSync(coursePath, newPath);
            res.status(204).send();
        } catch (err) {
            console.error(`Error deleting course ${courseName}:`, err);
            res.status(500).json({ error: 'Failed to delete course.' });
        }
    } else {
        res.status(404).json({ error: 'Course not found.' });
    }
});

app.get('/api/deleted-courses', (req, res) => {
    const deletedCoursesPath = path.join(__dirname, 'data', 'deleted_courses');
    if (!fs.existsSync(deletedCoursesPath)) {
        return res.json([]);
    }

    fs.readdir(deletedCoursesPath, { withFileTypes: true }, (err, dirents) => {
        if (err) {
            console.error('Failed to read deleted courses directory:', err);
            return res.status(500).json({ error: 'Could not retrieve deleted courses.' });
        }
        const courseNames = dirents
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        res.json(courseNames);
    });
});

app.post('/api/courses/restore', (req, res) => {
    const { courseName } = req.body;
    if (!courseName) {
        return res.status(400).json({ error: 'Course name is required' });
    }

    const deletedCoursePath = path.join(__dirname, 'data', 'deleted_courses', courseName);
    const coursePath = path.join(__dirname, 'data', 'courses', courseName);

    if (fs.existsSync(coursePath)) {
        return res.status(409).json({ error: 'Course already exists' });
    }

    if (fs.existsSync(deletedCoursePath)) {
        try {
            fs.renameSync(deletedCoursePath, coursePath);
            res.status(200).json({ success: true });
        } catch (err) {
            console.error(`Error restoring course ${courseName}:`, err);
            res.status(500).json({ error: 'Could not restore course.' });
        }
    } else {
        res.status(404).json({ error: 'Course not found.' });
    }
});

// Student Routes
app.get('/api/students', (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    res.json(loadStudents(courseName));
});

app.get('/api/students/export', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  try {
    const { studentsPath } = getCoursePaths(courseName);
    const studentsData = fs.readFileSync(studentsPath);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `students_backup_${timestamp}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(studentsData);
  } catch (error) {
    console.error('Failed to export students:', error);
    res.status(500).json({ error: 'Could not export student data.' });
  }
});

app.get('/api/students/:id', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const students = loadStudents(courseName);
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.post('/api/students', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const students = loadStudents(courseName);
  const assessmentAreas = loadAssessmentAreas(courseName);
  const newStudent = {
    id: uuidv4(),
    name,
    assignments: assessmentAreas.map(() => ({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } }))
  };
  students.push(newStudent);
  saveStudents(courseName, students);
  res.status(201).json(newStudent);
});

app.post('/api/students/import', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { students: importedStudents } = req.body;

  if (!importedStudents || !Array.isArray(importedStudents)) {
    return res.status(400).json({ error: 'Invalid import data. Expecting an array of students.' });
  }

  try {
    const currentStudents = loadStudents(courseName);

    importedStudents.forEach(importedStudent => {
      const index = currentStudents.findIndex(s => s.id === importedStudent.id);
      if (index !== -1) currentStudents[index] = importedStudent;
      else currentStudents.push(importedStudent);
    });

    saveStudents(courseName, currentStudents);
    res.status(200).json({ success: true, message: 'Students imported successfully.' });
  } catch (error) {
    console.error('Failed to import students:', error);
    res.status(500).json({ error: 'Could not import student data.' });
  }
});

app.put('/api/students/:id/toggle-hide', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { hidden } = req.body;
  const students = loadStudents(courseName);
  const student = students.find(s => s.id === req.params.id);
  
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  student.hidden = hidden;
  saveStudents(courseName, students);
  res.status(200).json({ success: true });
});

app.delete('/api/students/:id', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const students = loadStudents(courseName);
  const studentIndex = students.findIndex(s => s.id === req.params.id);

  if (studentIndex === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const deletedStudent = students[studentIndex];

  try {
    const deletedPath = path.join(__dirname, 'data', 'deleted');
    if (!fs.existsSync(deletedPath)) {
      fs.mkdirSync(deletedPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${timestamp}_${deletedStudent.id}.json`;
    const backupFilePath = path.join(deletedPath, backupFileName);

    fs.writeFileSync(backupFilePath, JSON.stringify(deletedStudent, null, 2));
  } catch (error) {
    console.error('Failed to create student backup:', error);
    return res.status(500).json({ error: 'Could not create student backup. Deletion aborted.' });
  }

  students.splice(studentIndex, 1);
  saveStudents(courseName, students);

  res.status(204).end();
});

// Assignment Routes
app.post('/api/students/:id/assignments', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { requirements, levelColors, assignmentName } = req.body;
  if (!requirements || !Array.isArray(requirements) || !levelColors || !Array.isArray(levelColors) || !assignmentName) {
    return res.status(400).json({ error: 'Invalid data for assignment.' });
  }

  const students = loadStudents(courseName);
  const student = students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const assessmentAreas = loadAssessmentAreas(courseName);
  const newAssignmentTimestamp = new Date().toISOString();

  requirements.forEach(requirement => {
    const reqIndex = assessmentAreas.findIndex(area => area.name === requirement);
    if (reqIndex !== -1) {
      if (!student.assignments[reqIndex]) {
        student.assignments[reqIndex] = { E: [], C: [], A: [], grades: { E: null, C: null, A: null } };
      }
      levelColors.forEach(lc => {
        if (!student.assignments[reqIndex][lc.level]) {
          student.assignments[reqIndex][lc.level] = [];
        }
        student.assignments[reqIndex][lc.level].unshift({ name: assignmentName, color: lc.color, createdAt: newAssignmentTimestamp });
      });
    }
  });

  saveStudents(courseName, students);
  res.status(200).json({ success: true });
});

app.put('/api/students/:id/assignments/edit', (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    const { areaIndex, assignmentName, newLevelColors } = req.body;
    const studentId = req.params.id;

    const students = loadStudents(courseName);
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const assignmentRow = student.assignments[areaIndex];
    if (!assignmentRow) return res.status(400).json({ error: 'Invalid area index.' });

    let originalCreatedAt = null;
    ['E', 'C', 'A'].forEach(level => {
        if (assignmentRow[level] && Array.isArray(assignmentRow[level])) {
            const existing = assignmentRow[level].find(a => a.name === assignmentName);
            if (existing && !originalCreatedAt) {
                originalCreatedAt = existing.createdAt;
            }
            assignmentRow[level] = assignmentRow[level].filter(a => a.name !== assignmentName);
        }
    });

    if (!originalCreatedAt) {
        originalCreatedAt = new Date().toISOString();
    }

    newLevelColors.forEach(lc => {
        assignmentRow[lc.level].push({ name: assignmentName, color: lc.color, createdAt: originalCreatedAt });
    });

    ['E', 'C', 'A'].forEach(level => {
        if (assignmentRow[level] && Array.isArray(assignmentRow[level])) {
            assignmentRow[level].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    });

    saveStudents(courseName, students);
    res.status(200).json({ success: true });
});

app.delete('/api/students/:id/assignments', (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    const { areaIndex, level, assignmentIndex } = req.body;
    const studentId = req.params.id;

    const students = loadStudents(courseName);
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const assignmentCell = student.assignments[areaIndex][level];
    if (!assignmentCell || !Array.isArray(assignmentCell) || assignmentIndex >= assignmentCell.length) {
        return res.status(400).json({ error: 'Invalid assignment path' });
    }

    assignmentCell.splice(assignmentIndex, 1);
    saveStudents(courseName, students);
    res.status(200).json({ success: true });
});

app.delete('/api/students/:id/assignments/all', (req, res) => {
    try {
        const courseName = req.query.course;
        if (!courseName) return res.status(400).json({ error: 'Course name is required' });
        const studentId = req.params.id;
        const students = loadStudents(courseName);
        const student = students.find(s => s.id === studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const assessmentAreas = loadAssessmentAreas(courseName);
        student.assignments = assessmentAreas.map(() => ({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } }));

        saveStudents(courseName, students);
        res.status(204).end();
    } catch (error) {
        console.error(`Error deleting all assignments for student ${req.params.id} in course ${req.query.course}:`, error);
        res.status(500).json({ error: 'Failed to delete assignments.' });
    }
});

app.post('/api/students/:id/grade', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { areaIndex, level, gradeColor } = req.body;
  const studentId = req.params.id;

  if (areaIndex === undefined || !level || gradeColor === undefined) {
    return res.status(400).json({ error: 'Missing areaIndex, level, or gradeColor' });
  }

  const students = loadStudents(courseName);
  const student = students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  try {
    if (!student.assignments[areaIndex]) {
      student.assignments[areaIndex] = { E: [], C: [], A: [], grades: { E: null, C: null, A: null } };
    }
    if (!student.assignments[areaIndex].grades) {
      student.assignments[areaIndex].grades = { E: null, C: null, A: null };
    }

    student.assignments[areaIndex].grades[level] = gradeColor;
    saveStudents(courseName, students);
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not set cell grade.' });
  }
});

// Assessment Area Routes
app.get('/api/assessment-areas', (req, res) => {
    const courseName = req.query.course;
    if (!courseName) return res.status(400).json({ error: 'Course name is required' });
    res.json(loadAssessmentAreas(courseName));
});

app.post('/api/assessment-areas', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const areas = loadAssessmentAreas(courseName);
  areas.push({ name, description: description || '' });
  saveAssessmentAreas(courseName, areas);

  const students = loadStudents(courseName);
  students.forEach(student => {
    student.assignments.push({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } });
  });
  saveStudents(courseName, students);

  res.status(201).json({ success: true });
});

app.put('/api/assessment-areas/:index', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const index = parseInt(req.params.index);
  const { name, description } = req.body;

  const areas = loadAssessmentAreas(courseName);
  if (index < 0 || index >= areas.length) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  if (!name) return res.status(400).json({ error: 'Name cannot be empty' });

  areas[index] = { name, description };
  saveAssessmentAreas(courseName, areas);
  res.status(200).json({ success: true });
});

app.delete('/api/assessment-areas/:index', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const index = parseInt(req.params.index);
  const areas = loadAssessmentAreas(courseName);
  if (index < 0 || index >= areas.length) {
    return res.status(400).json({ error: 'Invalid index' });
  }

  areas.splice(index, 1);
  saveAssessmentAreas(courseName, areas);

  const students = loadStudents(courseName);
  students.forEach(student => {
    if (student.assignments.length > index) {
      student.assignments.splice(index, 1);
    }
  });
  saveStudents(courseName, students);

  res.status(200).json({ success: true });
});

app.post('/api/assessment-areas/reorder', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { from, to } = req.body;
  const areas = loadAssessmentAreas(courseName);
  if (
    from < 0 || from >= areas.length ||
    to < 0 || to >= areas.length
  ) {
    return res.status(400).json({ error: 'Invalid reorder indices' });
  }

  const [moved] = areas.splice(from, 1);
  areas.splice(to, 0, moved);
  saveAssessmentAreas(courseName, areas);

  const students = loadStudents(courseName);
  students.forEach(student => {
    const [a] = student.assignments.splice(from, 1);
    student.assignments.splice(to, 0, a);
  });
  saveStudents(courseName, students);

  res.status(200).json({ success: true });
});

// Deleted students routes
app.get('/api/deleted-students', (req, res) => {
  const deletedPath = path.join(__dirname, 'data', 'deleted');
  if (!fs.existsSync(deletedPath)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(deletedPath).sort().reverse();

    const deletedStudents = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const studentData = JSON.parse(fs.readFileSync(path.join(deletedPath, file)));
          const timestampFromFile = file.split('_')[0];

          const tIndex = timestampFromFile.indexOf('T');
          const datePart = timestampFromFile.substring(0, tIndex);
          const timePart = timestampFromFile.substring(tIndex + 1)
            .replace('-', ':')
            .replace('-', ':')
            .replace('-', '.');
          const parsableTimestamp = `${datePart}T${timePart}`;

          return {
            filename: file,
            name: studentData.name,
            id: studentData.id,
            deletedAt: new Date(parsableTimestamp).toLocaleString('sv-SE')
          };
        } catch (e) {
          console.error(`Could not parse ${file}:`, e);
          return null;
        }
      })
      .filter(Boolean);

    res.json(deletedStudents);
  } catch (error) {
    console.error('Failed to read deleted students:', error);
    res.status(500).json({ error: 'Could not retrieve deleted students.' });
  }
});

app.post('/api/students/restore', (req, res) => {
  const courseName = req.query.course;
  if (!courseName) return res.status(400).json({ error: 'Course name is required' });
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  const deletedPath = path.join(__dirname, 'data', 'deleted');
  const filePath = path.join(deletedPath, filename);

  if (path.dirname(filePath) !== deletedPath) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file not found.' });
  }

  try {
    const studentData = JSON.parse(fs.readFileSync(filePath));
    const students = loadStudents(courseName);

    if (students.some(s => s.id === studentData.id)) {
      return res.status(409).json({ error: 'A student with this ID already exists.' });
    }

    students.push(studentData);
    saveStudents(courseName, students);

    fs.unlinkSync(filePath);

    res.status(200).json({ success: true, student: studentData });
  } catch (error) {
    console.error('Failed to restore student:', error);
    res.status(500).json({ error: 'Could not restore student.' });
  }
});


// --- Server Setup ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});