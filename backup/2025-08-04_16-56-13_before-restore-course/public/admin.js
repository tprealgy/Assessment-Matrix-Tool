document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseName = urlParams.get('course');

  if (!courseName) {
    window.location.href = '/landing.html';
    return;
  }

  document.title = `Admin: ${courseName}`;
  document.getElementById('course-title').textContent = `Admin: ${courseName}`;
  document.getElementById('export-link').href = `/api/students/export?course=${courseName}`;
  document.getElementById('restore-link').href = `/restore.html?course=${courseName}`;
  
  // Initialize breadcrumb
  initBreadcrumb('admin', courseName);

  // --- Toast Notification Function ---
  const toastNotification = document.getElementById('toastNotification');
  function showToast(message, isError = false) {
    toastNotification.textContent = message;
    toastNotification.style.backgroundColor = isError ? '#e74c3c' : '#333';
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3000);
  }

  // --- DOM Elements ---
  const studentList = document.getElementById('studentList');
  const newStudentNameInput = document.getElementById('newStudentName');
  const addStudentBtn = document.getElementById('addStudentBtn');
  const areaList = document.getElementById('areaList');
  const newAreaNameInput = document.getElementById('newAreaName');
  const newAreaDescInput = document.getElementById('newAreaDesc');
  const addAreaBtn = document.getElementById('addAreaBtn');
  const deleteCourseBtn = document.getElementById('delete-course-btn');

  const courseDisplayNameInput = document.getElementById('courseDisplayName');
  const colorPalette = document.getElementById('colorPalette');
  const saveCourseSettingsBtn = document.getElementById('saveCourseSettingsBtn');
  let selectedColor = '';

  const standardColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#800000',
    '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
    '#000000'
  ];

  function createColorSwatches() {
    colorPalette.innerHTML = '';
    standardColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.classList.add('color-swatch');
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.style.width = '30px';
      swatch.style.height = '30px';
      swatch.style.border = '1px solid #ccc';
      swatch.style.cursor = 'pointer';
      swatch.style.borderRadius = '4px';
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        selectedColor = color;
      });
      colorPalette.appendChild(swatch);
    });
  }

  // --- Student Management ---
  async function loadStudents() {
    const res = await fetch(`/api/students?course=${courseName}`);
    const students = await res.json();
    students.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

    studentList.innerHTML = '';
    students.forEach(student => {
      const li = document.createElement('li');
      const isHidden = student.hidden || false;
      li.innerHTML = `
        <span class="${isHidden ? 'hidden-student' : ''}">${student.name}${isHidden ? ' (dold)' : ''}</span>
        <div>
          <button class="toggleHideBtn" data-id="${student.id}" data-hidden="${isHidden}" title="${isHidden ? 'Visa student' : 'Dölj student'}">${isHidden ? '👁️' : '🙈'}</button>
          <button class="deleteStudentBtn" data-id="${student.id}" title="Ta bort student">🗑️</button>
        </div>
      `;
      studentList.appendChild(li);
    });
  }

  studentList.addEventListener('click', async (e) => {
    if (e.target.matches('.deleteStudentBtn')) {
      const btn = e.target;
      const studentId = btn.dataset.id;
      const studentName = btn.parentElement.previousElementSibling.textContent.replace(' (dold)', '');

      if (confirm(`Är du säker på att du vill ta bort studenten "${studentName}"?`)) {
        const res = await fetch(`/api/students/${studentId}?course=${courseName}`, { method: 'DELETE' });
        if (res.ok) {
          loadStudents();
        } else {
          showToast('Kunde inte ta bort studenten.', true);
        }
      }
    } else if (e.target.matches('.toggleHideBtn')) {
      const btn = e.target;
      const studentId = btn.dataset.id;
      const isHidden = btn.dataset.hidden === 'true';
      
      const res = await fetch(`/api/students/${studentId}/toggle-hide?course=${courseName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !isHidden })
      });
      
      if (res.ok) {
        loadStudents();
      } else {
        showToast('Kunde inte ändra studentens synlighet.', true);
      }
    }
  });

  addStudentBtn.addEventListener('click', async () => {
    const name = newStudentNameInput.value.trim();
    if (!name) return showToast('Ange ett namn!', true);
    const res = await fetch(`/api/students?course=${courseName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      newStudentNameInput.value = '';
      loadStudents();
    }
  });

  // --- Import/Export ---
  document.getElementById('importBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('importFile');
    if (fileInput.files.length === 0) {
      return showToast('Välj en fil att importera.', true);
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      let importedStudents;
      try {
        importedStudents = JSON.parse(e.target.result);
        if (!Array.isArray(importedStudents)) {
          throw new Error('Filen innehåller inte en lista med studenter.');
        }
      } catch (err) {
        return showToast(`Fel vid läsning av fil: ${err.message}`, true);
      }

      const res = await fetch(`/api/students?course=${courseName}`);
      const currentStudents = await res.json();
      const currentStudentMap = new Map(currentStudents.map(s => [s.id, s]));

      const toAdd = [];
      const toOverwrite = [];

      importedStudents.forEach(imported => {
        if (currentStudentMap.has(imported.id)) {
          toOverwrite.push(imported.name);
        } else {
          toAdd.push(imported.name);
        }
      });

      let confirmMessage = 'Är du säker på att du vill fortsätta?\\n\\n';
      if (toAdd.length > 0) {
        confirmMessage += `Detta kommer lägga till ${toAdd.length} ny(a) student(er):\\n- ${toAdd.join('\\n- ')}\\n\\n`;
      }
      if (toOverwrite.length > 0) {
        confirmMessage += `Detta kommer SKRIVA ÖVER datan för ${toOverwrite.length} befintlig(a) student(er):\\n- ${toOverwrite.join('\\n- ')}\\n\\n`;
      }
      if (toAdd.length === 0 && toOverwrite.length === 0) {
        return showToast('Inga studenter att importera från filen.', true);
      }
      confirmMessage += 'Denna åtgärd kan inte ångras.';

      if (confirm(confirmMessage)) {
        const importRes = await fetch(`/api/students/import?course=${courseName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: importedStudents })
        });

        if (importRes.ok) {
          showToast('Importering lyckades!');
          loadStudents();
        } else {
          const errorData = await importRes.json();
          showToast(`Importering misslyckades: ${errorData.message || 'Okänt fel.'}`, true);
        }
      }
    };

    reader.readAsText(file);
  });

  // --- Assessment Area Management ---
  async function loadAreas() {
    const res = await fetch(`/api/assessment-areas?course=${courseName}`);
    const areas = await res.json();

    areaList.innerHTML = '';
    areas.forEach((area, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="area-inputs">
          <input type="text" class="area-name-input" value="${area.name}" data-index="${index}" />
          <textarea class="area-desc-input" data-index="${index}">${area.description || ''}</textarea>
        </div>
        <div class="area-controls">
          <button class="moveUpBtn" data-index="${index}" title="Flytta upp">⬆️</button>
          <button class="moveDownBtn" data-index="${index}" title="Flytta ner">⬇️</button>
          <button class="deleteBtn" data-index="${index}" title="Ta bort">🗑️</button>
        </div>
      `;
      areaList.appendChild(li);
    });
  }

  areaList.addEventListener('click', async (e) => {
    if (!e.target.matches('button')) return;

    const btn = e.target;
    const index = parseInt(btn.dataset.index);

    if (btn.classList.contains('deleteBtn')) {
      if (confirm('Är du säker på att du vill ta bort detta område? All data för detta område kommer att raderas för samtliga elever.')) {
        await fetch(`/api/assessment-areas/${index}?course=${courseName}`, { method: 'DELETE' });
        loadAreas();
      }
    } else if (btn.classList.contains('moveUpBtn')) {
      if (index > 0) {
        await fetch(`/api/assessment-areas/reorder?course=${courseName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: index, to: index - 1 })
        });
        loadAreas();
      }
    } else if (btn.classList.contains('moveDownBtn')) {
      if (index < areaList.children.length - 1) {
        await fetch(`/api/assessment-areas/reorder?course=${courseName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: index, to: index + 1 })
        });
        loadAreas();
      }
    }
  });

  areaList.addEventListener('change', async (e) => {
    if (!e.target.matches('.area-name-input, .area-desc-input')) return;

    const input = e.target;
    const index = parseInt(input.dataset.index);
    const listItem = input.closest('li');
    const nameInput = listItem.querySelector('.area-name-input');
    const descInput = listItem.querySelector('.area-desc-input');

    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (name) {
      await fetch(`/api/assessment-areas/${index}?course=${courseName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
    } else {
      showToast('Områdesnamnet får inte vara tomt.', true);
      loadAreas();
    }
  });

  addAreaBtn.addEventListener('click', async () => {
    const name = newAreaNameInput.value.trim();
    const description = newAreaDescInput.value.trim();
    if (!name) return showToast('Ange ett namn!', true);
    await fetch(`/api/assessment-areas?course=${courseName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    newAreaNameInput.value = '';
    newAreaDescInput.value = '';
    loadAreas();
  });

  deleteCourseBtn.addEventListener('click', async () => {
    if (confirm(`Är du säker på att du vill radera kursen "${courseName}"? Denna åtgärd kan inte ångras.`)) {
      const res = await fetch(`/api/courses/${courseName}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/landing.html';
      } else {
        showToast('Kunde inte ta bort kursen.', true);
      }
    }
  });

  async function loadCourseSettings() {
    const res = await fetch(`/api/courses?course=${courseName}`);
    const courses = await res.json();
    const currentCourse = courses.find(c => c.name === courseName);
    if (currentCourse) {
      courseDisplayNameInput.value = currentCourse.displayName || '';
      selectedColor = currentCourse.color || '';
      document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('active');
        if (s.dataset.color === selectedColor) {
          s.classList.add('active');
        }
      });
    }
  }

  saveCourseSettingsBtn.addEventListener('click', async () => {
    const newDisplayName = courseDisplayNameInput.value.trim();
    const newColor = selectedColor;

    if (!newDisplayName) {
      return showToast('Visningsnamn får inte vara tomt!', true);
    }
    const res = await fetch(`/api/courses/${courseName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newCourseName: courseName,
        newDisplayName: newDisplayName,
        newColor: newColor
      })
    });

    if (res.ok) {
      showToast('Kursinställningar sparade!');
      document.title = `Admin: ${newDisplayName}`;
      document.getElementById('course-title').textContent = `Admin: ${newDisplayName}`;
    } else {
      showToast('Kunde inte spara kursinställningar.', true);
    }
  });

  // --- Initial Load ---
  function init() {
    loadStudents();
    loadAreas();
    createColorSwatches();
    loadCourseSettings();
  }

  init();
});