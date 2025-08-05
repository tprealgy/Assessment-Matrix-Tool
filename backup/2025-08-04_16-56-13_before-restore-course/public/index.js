document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseName = urlParams.get('course');

  if (!courseName) {
    window.location.href = '/landing.html';
    return;
  }

  document.title = `Bedömningsmatris: ${courseName}`;
  document.getElementById('course-title').textContent = `Bedömningsmatris: ${courseName}`;
  
  // Initialize breadcrumb
  initBreadcrumb('index', courseName);

  // Application logic
  let assessmentAreas = [];
  let currentStudent = null;
  let currentStudentId = null;

  async function loadAssessmentAreas() {
    const res = await fetch(`/api/assessment-areas?course=${courseName}`);
    assessmentAreas = await res.json();
  }

  async function loadStudents() {
    const res = await fetch(`/api/students?course=${courseName}`);
    let students = await res.json();
    students = students.filter(student => !student.hidden);
    students.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

    const select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">-- Välj en student --</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = student.name;
      select.appendChild(option);
    });
  }

  function getAssignmentCellHtml(assignments, grade, areaIndex, level) {
    const gradeClass = grade ? `cell-${grade}` : '';
    let gradingControls = '';
    let assignmentsHtml = '';
    let hasAssignments = false;

    let normalizedAssignments = [];
    let isNewFormat = false;
    if (assignments) {
      if (Array.isArray(assignments)) {
        normalizedAssignments = assignments;
        isNewFormat = true;
      } else if (typeof assignments === 'object' && assignments.name) {
        normalizedAssignments = [assignments];
      }
    }

    hasAssignments = normalizedAssignments.length > 0;

    if (hasAssignments) {
      const availableGrades = ['green', 'yellow'];
      if (level === 'E') {
        availableGrades.push('grey');
      }
      const gradeButtons = availableGrades.map(g =>
        `<button class="grade-btn" data-grade="${g}" data-area-index="${areaIndex}" data-level="${level}" title="Markera som ${g}"></button>`
      ).join('');

      gradingControls = `
        <div class="cell-grade-controls">
          ${gradeButtons}
          <button class="grade-btn clear" data-grade="null" data-area-index="${areaIndex}" data-level="${level}" title="Rensa markering">&times;</button>
        </div>
      `;
    }

    assignmentsHtml = hasAssignments ? normalizedAssignments.map((assignment, assignmentIndex) => {
      const name = assignment.name || '';
      const color = assignment.color || 'grey';
      if (!name) return '';

      const deleteButton = isNewFormat ? `
        <button class="delete-assignment-btn"
                data-area-index="${areaIndex}" data-level="${level}"
                data-assignment-index="${assignmentIndex}" title="Ta bort uppgift">&times;</button>
      ` : '';

      return `
        <div class="assignment-item" data-area-index="${areaIndex}">
          <div class="assignment-chip ${color}">${name}</div>
          ${deleteButton}
        </div>
      `;
    }).join('') : '';

    const cellContent = hasAssignments
      ? `<div class="assignment-container">${assignmentsHtml}</div>`
      : '';

    return `<td class="${gradeClass} ${!hasAssignments ? 'empty-cell' : ''}">
              ${cellContent}
              ${gradingControls}
            </td>`;
  }

  async function loadStudentData(studentId) {
    const res = await fetch(`/api/students/${studentId}?course=${courseName}`);
    const student = await res.json();
    currentStudent = student;
    currentStudentId = student.id;
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentSection').style.display = 'block';

    const tbody = document.getElementById('matrixBody');
    tbody.innerHTML = '';

    assessmentAreas.forEach((area, index) => {
      const assignmentRow = student.assignments[index] || { E: [], C: [], A: [], grades: { E: null, C: null, A: null } };
      if (!assignmentRow.grades) {
        assignmentRow.grades = { E: null, C: null, A: null };
      }
      const row = document.createElement('tr');
      row.innerHTML = `
        <td title="${area.description || ''}">${area.name}</td>
        ${getAssignmentCellHtml(assignmentRow.E, assignmentRow.grades.E, index, 'E')}
        ${getAssignmentCellHtml(assignmentRow.C, assignmentRow.grades.C, index, 'C')}
        ${getAssignmentCellHtml(assignmentRow.A, assignmentRow.grades.A, index, 'A')}
      `;
      tbody.appendChild(row);
    });
  }

  document.getElementById('studentSelect').addEventListener('change', function () {
    const studentId = this.value;
    if (studentId) {
      loadStudentData(studentId);
    } else {
      document.getElementById('studentSection').style.display = 'none';
    }
  });

  document.getElementById('addAssignmentBtn').addEventListener('click', async () => {
    const name = document.getElementById('assignmentInput').value.trim();
    if (!name) return alert('Ange ett uppgiftsnamn!');

    const areaSelect = document.getElementById('areaSelect');
    const selectedRequirements = [...areaSelect.options]
      .filter(option => option.selected)
      .map(option => option.value);

    if (selectedRequirements.length === 0) {
      return alert('Välj minst ett bedömningsområde.');
    }

    const levelColors = [];
    ['E', 'C', 'A'].forEach(level => {
      const activeSwatch = document.querySelector(`.color-swatch[data-level="${level}"].active`);
      if (activeSwatch) {
        levelColors.push({ level, color: activeSwatch.dataset.color });
      }
    });

    if (levelColors.length === 0) {
      return alert('Välj minst en nivå.');
    }

    await fetch(`/api/students/${currentStudentId}/assignments?course=${courseName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirements: selectedRequirements,
        levelColors,
        assignmentName: name
      })
    });

    document.getElementById('assignmentInput').value = '';
    areaSelect.selectedIndex = -1;
    loadStudentData(currentStudentId);
  });

  document.getElementById('matrixBody').addEventListener('click', async (e) => {
    const target = e.target;

    if (target.matches('.delete-assignment-btn')) {
      const { areaIndex, level, assignmentIndex } = target.dataset;
      const assignmentContainer = target.previousElementSibling;
      const assignmentName = assignmentContainer ? assignmentContainer.textContent : 'denna uppgift';
      const noConfirm = document.getElementById('noConfirmDelete').checked;

      if (noConfirm || confirm(`Är du säker på att du vill ta bort uppgiften "${assignmentName}"?`)) {
        await fetch(`/api/students/${currentStudentId}/assignments?course=${courseName}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            areaIndex: parseInt(areaIndex),
            level,
            assignmentIndex: parseInt(assignmentIndex)
          })
        });
        loadStudentData(currentStudentId);
      }
      return;
    }

    const chip = target.closest('.assignment-chip');
    if (chip) {
      const item = chip.closest('.assignment-item');
      const assignmentName = chip.textContent;
      const areaIndex = item.dataset.areaIndex;

      if (areaIndex !== undefined) {
        openEditModal(assignmentName, parseInt(areaIndex));
      }
      return;
    }

    if (target.matches('.grade-btn')) {
      const { areaIndex, level } = target.dataset;
      const clickedGrade = target.dataset.grade === 'null' ? null : target.dataset.grade;
      const colorValues = { green: 2, yellow: 1, grey: 0 };
      const levels = ['E', 'C', 'A'];

      const currentGrades = (currentStudent.assignments[areaIndex] && currentStudent.assignments[areaIndex].grades)
        ? currentStudent.assignments[areaIndex].grades
        : { E: null, C: null, A: null };
      const newGrades = { ...currentGrades };

      newGrades[level] = clickedGrade;

      const clickedValue = clickedGrade ? colorValues[clickedGrade] : -1;
      if (level === 'A' && clickedGrade) {
        if (!newGrades.C || colorValues[newGrades.C] < clickedValue) newGrades.C = clickedGrade;
        if (!newGrades.E || colorValues[newGrades.E] < clickedValue) newGrades.E = clickedGrade;
      }
      if (level === 'C' && clickedGrade) {
        if (!newGrades.E || colorValues[newGrades.E] < clickedValue) newGrades.E = clickedGrade;
      }

      for (let i = 0; i < levels.length - 1; i++) {
        const upperLevel = levels[i];
        const lowerLevel = levels[i + 1];
        const upperGrade = newGrades[upperLevel];
        const lowerGrade = newGrades[lowerLevel];

        if (upperGrade === null || upperGrade === 'grey') {
          newGrades[lowerLevel] = null;
        } else if (lowerGrade !== null) {
          if (colorValues[lowerGrade] > colorValues[upperGrade]) {
            newGrades[lowerLevel] = upperGrade;
          }
        }
      }

      const updatePromises = [];
      levels.forEach(l => {
        if (newGrades[l] !== currentGrades[l]) {
          updatePromises.push(fetch(`/api/students/${currentStudentId}/grade?course=${courseName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              areaIndex: parseInt(target.dataset.areaIndex),
              level: l,
              gradeColor: newGrades[l]
            })
          }));
        }
      });

      await Promise.all(updatePromises);
      if (updatePromises.length > 0) {
        loadStudentData(currentStudentId);
      }
      return;
    }
  });

  document.getElementById('deleteAllAssignmentsBtn').addEventListener('click', async () => {
    if (!currentStudentId) return;

    if (confirm(`Är du helt säker på att du vill radera ALLA uppgifter för den här studenten? Det går inte att ångra.`)) {
      const res = await fetch(`/api/students/${currentStudentId}/assignments/all?course=${courseName}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadStudentData(currentStudentId);
      } else {
        alert('Kunde inte radera uppgifterna.');
      }
    }
  });

  function addLevelColorSelectorListener(container) {
    const colorValues = { green: 2, yellow: 1, red: 0 };
    const levels = ['E', 'C', 'A'];

    container.addEventListener('click', e => {
      if (!e.target.matches('.color-swatch')) return;

      const clickedSwatch = e.target;
      const clickedLevel = clickedSwatch.dataset.level;
      const clickedColor = clickedSwatch.dataset.color;

      const newGrades = {};
      levels.forEach(l => {
        const activeSwatch = container.querySelector(`.color-swatch[data-level="${l}"].active`);
        newGrades[l] = activeSwatch ? activeSwatch.dataset.color : null;
      });

      if (clickedSwatch.classList.contains('active')) {
        if (clickedLevel !== 'E') {
          newGrades[clickedLevel] = null;
        }
      } else {
        newGrades[clickedLevel] = clickedColor;
      }

      if (newGrades.A && !newGrades.C) newGrades.C = newGrades.A;
      if (newGrades.C && !newGrades.E) newGrades.E = newGrades.C;
      
      if (!newGrades.E) { newGrades.C = null; newGrades.A = null; }
      if (!newGrades.C) { newGrades.A = null; }

      for (let i = 0; i < levels.length - 1; i++) {
        const upperLevel = levels[i];
        const lowerLevel = levels[i + 1];
        const upperGrade = newGrades[upperLevel];
        const lowerGrade = newGrades[lowerLevel];
        if (upperGrade && lowerGrade && colorValues[lowerGrade] > colorValues[upperGrade]) {
          newGrades[lowerLevel] = upperGrade;
        }
      }
      for (let i = levels.length - 1; i > 0; i--) {
        const lowerLevel = levels[i];
        const upperLevel = levels[i - 1];
        const lowerGrade = newGrades[lowerLevel];
        const upperGrade = newGrades[upperLevel];
        if (upperGrade && lowerGrade && colorValues[upperGrade] < colorValues[lowerGrade]) {
          newGrades[upperLevel] = lowerGrade;
        }
      }

      levels.forEach(l => {
        const swatches = container.querySelectorAll(`.color-swatch[data-level="${l}"]`);
        swatches.forEach(swatch => {
          const isActiveSwatch = swatch.dataset.color === newGrades[l];
          swatch.classList.toggle('active', isActiveSwatch);
        });
      });
    });
  }

  function setupLevelAndColorSelectors(container, initialState = {}) {
    container.innerHTML = '<label>Nivå och Färg</label>';

    const levels = ['E', 'C', 'A'];

    levels.forEach(level => {
      const row = document.createElement('div');
      row.className = 'level-color-row';

      const colors = ['green', 'yellow', 'red'];

      const colorSwatchesHtml = colors.map(color =>
        `<button class="color-swatch ${color}" data-level="${level}" data-color="${color}" title="${color.charAt(0).toUpperCase() + color.slice(1)}"></button>`
      ).join('');

      row.innerHTML = `
        <label class="level-label">${level}</label>
        <div class="color-swatch-group" data-level-group="${level}">
          ${colorSwatchesHtml}
        </div>
      `;
      container.appendChild(row);
    });

    if (Object.keys(initialState).length > 0) {
      Object.entries(initialState).forEach(([level, color]) => {
        if (color) {
          const swatch = container.querySelector(`.color-swatch[data-level="${level}"][data-color="${color}"]`);
          if (swatch) swatch.classList.add('active');
        }
      });
    } else {
      const defaultSwatch = container.querySelector('.color-swatch[data-level="E"][data-color="green"]');
      if (defaultSwatch) {
        defaultSwatch.classList.add('active');
      }
    }

    addLevelColorSelectorListener(container);
  }

  function openEditModal(assignmentName, areaIndex) {
    const modal = document.getElementById('editAssignmentModal');
    const title = document.getElementById('editModalTitle');
    const container = document.getElementById('editLevelAndColorContainer');

    title.textContent = `Redigera: ${assignmentName}`;

    modal.dataset.assignmentName = assignmentName;
    modal.dataset.areaIndex = areaIndex;

    const assignmentRow = currentStudent.assignments[areaIndex];
    const currentState = { E: null, C: null, A: null };
    if (assignmentRow) {
      ['E', 'C', 'A'].forEach(level => {
        if (assignmentRow[level] && Array.isArray(assignmentRow[level])) {
          const found = assignmentRow[level].find(a => a.name === assignmentName);
          if (found) {
            currentState[level] = found.color;
          }
        }
      });
    }

    setupLevelAndColorSelectors(container, currentState);
    modal.style.display = 'flex';
  }

  function closeEditModal() {
    document.getElementById('editAssignmentModal').style.display = 'none';
  }

  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const modal = document.getElementById('editAssignmentModal');
    const { assignmentName, areaIndex } = modal.dataset;
    const container = document.getElementById('editLevelAndColorContainer');

    const newLevelColors = [];
    ['E', 'C', 'A'].forEach(level => {
      const activeSwatch = container.querySelector(`.color-swatch[data-level="${level}"].active`);
      if (activeSwatch) {
        newLevelColors.push({ level, color: activeSwatch.dataset.color });
      }
    });

    const res = await fetch(`/api/students/${currentStudentId}/assignments/edit?course=${courseName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        areaIndex: parseInt(areaIndex),
        assignmentName,
        newLevelColors
      })
    });

    if (res.ok) {
      closeEditModal();
      loadStudentData(currentStudentId);
    } else {
      alert('Kunde inte spara ändringarna.');
    }
  });

  document.getElementById('closeEditModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  
  function populateAssignmentForm() {
    const areaSelect = document.getElementById('areaSelect');
    areaSelect.innerHTML = '';
    assessmentAreas.forEach((area, index) => {
      const option = document.createElement('option');
      option.value = area.name;
      option.textContent = area.name;
      areaSelect.appendChild(option);
    });
  }

  async function init() {
    await loadAssessmentAreas();
    setupLevelAndColorSelectors(document.getElementById('levelAndColorContainer'));
    populateAssignmentForm();
    await loadStudents();
  }

  init();
});