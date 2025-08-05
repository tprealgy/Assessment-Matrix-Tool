const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const studentsPath = path.join(__dirname, 'data', 'students.json');
const assessmentAreasPath = path.join(__dirname, 'config', 'assessmentAreas.json');

function loadAssessmentAreas() {
  try {
    const data = fs.readFileSync(assessmentAreasPath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveAssessmentAreas(areas) {
  fs.writeFileSync(assessmentAreasPath, JSON.stringify(areas, null, 2));
}

function loadStudents() {
  try {
    const data = fs.readFileSync(studentsPath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveStudents(students) {
  fs.writeFileSync(studentsPath, JSON.stringify(students, null, 2));
}

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/favicon.ico', (req, res) => res.status(204).send());

// Student Routes
app.get('/api/students', (req, res) => res.json(loadStudents()));
app.get('/api/students/export', (req, res) => {
  try {
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
  const students = loadStudents();
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.post('/api/students', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const students = loadStudents();
  const assessmentAreas = loadAssessmentAreas();
  const newStudent = {
    id: uuidv4(),
    name,
    assignments: assessmentAreas.map(() => ({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } }))
  };
  students.push(newStudent);
  saveStudents(students);
  res.status(201).json(newStudent);
});

app.post('/api/students/import', (req, res) => {
  const { students: importedStudents } = req.body;

  if (!importedStudents || !Array.isArray(importedStudents)) {
    return res.status(400).json({ error: 'Invalid import data. Expecting an array of students.' });
  }

  try {
    const currentStudents = loadStudents();

    importedStudents.forEach(importedStudent => {
      const index = currentStudents.findIndex(s => s.id === importedStudent.id);
      if (index !== -1) currentStudents[index] = importedStudent;
      else currentStudents.push(importedStudent);
    });

    saveStudents(currentStudents);
    res.status(200).json({ success: true, message: 'Students imported successfully.' });
  } catch (error) {
    console.error('Failed to import students:', error);
    res.status(500).json({ error: 'Could not import student data.' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const students = loadStudents();
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
  saveStudents(students);

  res.status(204).end();
});

// Assignment Routes
app.post('/api/students/:id/assignments', (req, res) => {
  const { requirements, levelColors, assignmentName } = req.body;
  if (!requirements || !Array.isArray(requirements) || !levelColors || !Array.isArray(levelColors) || !assignmentName) {
    return res.status(400).json({ error: 'Invalid data for assignment.' });
  }

  const students = loadStudents();
  const student = students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const assessmentAreas = loadAssessmentAreas();
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

  saveStudents(students);
  res.status(200).json({ success: true });
});

app.put('/api/students/:id/assignments/edit', (req, res) => {
    const { areaIndex, assignmentName, newLevelColors } = req.body;
    const studentId = req.params.id;

    const students = loadStudents();
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

    saveStudents(students);
    res.status(200).json({ success: true });
});

app.delete('/api/students/:id/assignments', (req, res) => {
    const { areaIndex, level, assignmentIndex } = req.body;
    const studentId = req.params.id;

    const students = loadStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const assignmentCell = student.assignments[areaIndex][level];
    if (!assignmentCell || !Array.isArray(assignmentCell) || assignmentIndex >= assignmentCell.length) {
        return res.status(400).json({ error: 'Invalid assignment path' });
    }

    assignmentCell.splice(assignmentIndex, 1);
    saveStudents(students);
    res.status(200).json({ success: true });
});

app.delete('/api/students/:id/assignments/all', (req, res) => {
    const studentId = req.params.id;
    const students = loadStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const assessmentAreas = loadAssessmentAreas();
    student.assignments = assessmentAreas.map(() => ({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } }));

    saveStudents(students);
    res.status(200).json({ success: true });
});

app.post('/api/students/:id/grade', (req, res) => {
  const { areaIndex, level, gradeColor } = req.body;
  const studentId = req.params.id;

  if (areaIndex === undefined || !level || gradeColor === undefined) {
    return res.status(400).json({ error: 'Missing areaIndex, level, or gradeColor' });
  }

  const students = loadStudents();
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
    saveStudents(students);
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not set cell grade.' });
  }
});

// Assessment Area Routes
app.get('/api/assessment-areas', (req, res) => res.json(loadAssessmentAreas()));

app.post('/api/assessment-areas', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const areas = loadAssessmentAreas();
  areas.push({ name, description: description || '' });
  saveAssessmentAreas(areas);

  const students = loadStudents();
  students.forEach(student => {
    student.assignments.push({ E: [], C: [], A: [], grades: { E: null, C: null, A: null } });
  });
  saveStudents(students);

  res.status(201).json({ success: true });
});

app.put('/api/assessment-areas/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const { name, description } = req.body;

  const areas = loadAssessmentAreas();
  if (index < 0 || index >= areas.length) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  if (!name) return res.status(400).json({ error: 'Name cannot be empty' });

  areas[index] = { name, description };
  saveAssessmentAreas(areas);
  res.status(200).json({ success: true });
});

app.delete('/api/assessment-areas/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const areas = loadAssessmentAreas();
  if (index < 0 || index >= areas.length) {
    return res.status(400).json({ error: 'Invalid index' });
  }

  areas.splice(index, 1);
  saveAssessmentAreas(areas);

  const students = loadStudents();
  students.forEach(student => {
    if (student.assignments.length > index) {
      student.assignments.splice(index, 1);
    }
  });
  saveStudents(students);

  res.status(200).json({ success: true });
});

app.post('/api/assessment-areas/reorder', (req, res) => {
  const { from, to } = req.body;
  const areas = loadAssessmentAreas();
  if (
    from < 0 || from >= areas.length ||
    to < 0 || to >= areas.length
  ) {
    return res.status(400).json({ error: 'Invalid reorder indices' });
  }

  const [moved] = areas.splice(from, 1);
  areas.splice(to, 0, moved);
  saveAssessmentAreas(areas);

  const students = loadStudents();
  students.forEach(student => {
    const [a] = student.assignments.splice(from, 1);
    student.assignments.splice(to, 0, a);
  });
  saveStudents(students);

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
    const students = loadStudents();

    if (students.some(s => s.id === studentData.id)) {
      return res.status(409).json({ error: 'A student with this ID already exists.' });
    }

    students.push(studentData);
    saveStudents(students);

    fs.unlinkSync(filePath);

    res.status(200).json({ success: true, student: studentData });
  } catch (error) {
    console.error('Failed to restore student:', error);
    res.status(500).json({ error: 'Could not restore student.' });
  }
});


// --- Server Setup ---
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

let shutdownTimeout;

function scheduleShutdown() {
  clearTimeout(shutdownTimeout);
  shutdownTimeout = setTimeout(() => {
    console.log('No clients connected for 10 seconds. Shutting down.');
    server.close(() => {
      process.exit(0);
    });
  }, 10000);
}

wss.on('connection', (ws) => {
  console.log('Client connected.');
  clearTimeout(shutdownTimeout);

  ws.on('close', () => {
    console.log('Client disconnected.');
    setTimeout(() => {
      if (wss.clients.size === 0) {
        console.log('Last client disconnected, scheduling shutdown.');
        scheduleShutdown();
      }
    }, 1500); // Wait 1.5s before checking for active clients
  });
  
  ws.on('message', (message) => {
      if(message.toString() === 'ping') {
        // Heartbeat received, do nothing.
      }
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  scheduleShutdown();
});