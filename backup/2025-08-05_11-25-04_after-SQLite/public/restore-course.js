const deletedList = document.getElementById('deletedList');

async function loadDeletedCourses() {
    const res = await fetch('/api/deleted-courses');
    const courses = await res.json();

    deletedList.innerHTML = '';

    if (courses.length === 0) {
        deletedList.innerHTML = '<tr><td colspan="2">Inga raderade kurser att visa.</td></tr>';
        return;
    }

    courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${course}</td>
            <td>
                <button class="restore-btn" data-course="${course}">Återställ</button>
            </td>
        `;
        deletedList.appendChild(tr);
    });
}

deletedList.addEventListener('click', async (e) => {
    if (!e.target.matches('.restore-btn')) return;

    const btn = e.target;
    const courseName = btn.dataset.course;

    if (confirm(`Är du säker på att du vill återställa kursen "${courseName}"?`)) {
        const res = await fetch('/api/courses/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseName })
        });

        if (res.ok) {
            alert('Kursen har återställts!');
            loadDeletedCourses(); // Refresh the list
        } else {
            const { error } = await res.json();
            alert(`Kunde inte återställa kursen: ${error}`);
        }
    }
});

loadDeletedCourses();