document.addEventListener('DOMContentLoaded', () => {
  const courseList = document.getElementById('course-list');
  const newCourseNameInput = document.getElementById('new-course-name');
  const createCourseBtn = document.getElementById('create-course-btn');
  const modal = document.getElementById('course-modal');
  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal');

  async function fetchCourses() {
    try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const courses = await response.json();
        courseList.innerHTML = '';
        courses.forEach(course => {
          const li = document.createElement('li');
          
          const link = document.createElement('a');
          link.href = `/index.html?course=${encodeURIComponent(course.name)}`;
          link.textContent = course.displayName;
          if (course.color) {
            link.style.backgroundColor = course.color;
            link.style.color = 'white';
          }
          li.appendChild(link);

          courseList.appendChild(li);
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
    if (newCourseName) {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseName: newCourseName }),
      });
      if (response.ok) {
        newCourseNameInput.value = '';
        modal.style.display = 'none';
        fetchCourses();
      } else {
        alert('Kunde inte skapa kurs.');
      }
    }
  });

  newCourseNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      createCourseBtn.click();
    }
  });

  // Initialize breadcrumb
  initBreadcrumb('landing');
  
  fetchCourses();
});