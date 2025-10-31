document.addEventListener('DOMContentLoaded', () => {
  const courseList = document.getElementById('course-list');
  const newCourseNameInput = document.getElementById('new-course-name');
  const createCourseBtn = document.getElementById('create-course-btn');
  const modal = document.getElementById('course-modal');
  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings');
  const deletedCoursesList = document.getElementById('deleted-courses-list');

  async function fetchCourses() {
    try {
        const courses = await courseData.getAll();
        courseList.innerHTML = '';
        courses.forEach(course => {
          const link = UI.createElement('a', {
            href: `/index.html?course=${encodeURIComponent(course.name)}`,
            className: 'course-card-link'
          });
          
          const li = UI.createElement('li');
          li.textContent = course.displayName;
          
          if (course.color) {
            li.style.borderLeft = `4px solid ${course.color}`;
            li.style.background = `linear-gradient(135deg, ${course.color}08, ${course.color}15)`;
          }
          
          link.appendChild(li);
          courseList.appendChild(link);
        });
    } catch (error) {
        console.error("Could not fetch courses:", error);
        courseList.innerHTML = '<li>Kunde inte ladda kurser.</li>';
    }
  }

  openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    newCourseNameInput.focus();
  });

  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    newCourseNameInput.value = '';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
      newCourseNameInput.value = '';
    }
  });

  createCourseBtn.addEventListener('click', async () => {
    const newCourseName = newCourseNameInput.value.trim();
    try {
      await courseData.create(newCourseName);
      newCourseNameInput.value = '';
      modal.style.display = 'none';
      fetchCourses();
      UI.showToast('Kurs skapad!');
    } catch (error) {
      UI.showToast(error.message, true);
    }
  });

  newCourseNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      createCourseBtn.click();
    }
  });

  // Settings modal functionality
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    loadDeletedCourses();
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  async function loadDeletedCourses() {
    try {
      const deletedCourses = await courseData.getDeleted();
      
      if (deletedCourses.length === 0) {
        deletedCoursesList.innerHTML = '<div class="no-deleted-courses">Inga raderade kurser att återställa</div>';
        return;
      }
      
      deletedCoursesList.innerHTML = deletedCourses.map(course => {
        const courseName = typeof course === 'string' ? course : course.name;
        const deletedAt = typeof course === 'object' ? course.deletedAt : 'Okänt datum';
        const willExpireSoon = course.willExpireSoon || false;
        const daysUntilExpiration = course.daysUntilExpiration;
        
        let warningText = '';
        if (willExpireSoon && daysUntilExpiration > 0) {
          const dayText = daysUntilExpiration === 1 ? 'dag' : 'dagar';
          warningText = `<div class="expiration-warning"><span class="warning-icon">⚠️</span>Raderas om ${daysUntilExpiration} ${dayText}</div>`;
        }
        
        const itemClass = willExpireSoon ? 'deleted-course-item expires-soon' : 'deleted-course-item';
        
        return `
          <div class="${itemClass}">
            <div class="deleted-course-info">
              <div class="deleted-course-name">${courseName}</div>
              <div class="deleted-course-date">Raderad: ${deletedAt}</div>
              ${warningText}
            </div>
            <button class="restore-btn" data-course="${courseName}">Återställ</button>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Could not load deleted courses:', error);
      deletedCoursesList.innerHTML = '<div class="no-deleted-courses">Kunde inte ladda raderade kurser</div>';
    }
  }

  deletedCoursesList.addEventListener('click', async (event) => {
    if (!event.target.matches('.restore-btn')) return;
    
    const courseName = event.target.dataset.course;
    
    // Check if course already exists
    const courses = await courseData.getAll();
    const courseExists = courses.some(course => course.name === courseName);
    
    if (courseExists) {
      const newName = prompt(`En kurs med namnet "${courseName}" finns redan. Ange ett nytt namn för den återställda kursen:`, `${courseName}_återställd`);
      if (!newName || newName.trim() === '') return;
      
      // Check if the new name also exists
      const newNameExists = courses.some(course => course.name === newName.trim());
      if (newNameExists) {
        alert('Det namnet finns redan. Försök med ett annat namn.');
        return;
      }
      
      await restoreCourse(courseName, newName.trim());
    } else {
      await restoreCourse(courseName);
    }
  });

  async function restoreCourse(originalName, newName = null) {
    try {
      await courseData.restore(originalName, newName);
      UI.showToast(`Kursen har återställts${newName ? ` som "${newName}"` : ''}!`);
      loadDeletedCourses();
      fetchCourses();
    } catch (error) {
      console.error('Error restoring course:', error);
      UI.showToast('Kunde inte återställa kursen.', true);
    }
  }

  // Initialize breadcrumb
  initBreadcrumb('landing');
  
  // Initialize help system
  initHelpSystem('landing');
  
  fetchCourses();
});