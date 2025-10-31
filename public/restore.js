document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseName = urlParams.get('course');
    
    if (!courseName) {
        window.location.href = '/landing.html';
        return;
    }
    
    // Initialize breadcrumb
    initBreadcrumb('restore', courseName);
    
    // Initialize help system
    initHelpSystem('restore', courseName);
    
    const deletedList = document.getElementById('deletedList');

    async function loadDeletedStudents() {
        const res = await fetch(`/api/deleted-students?course=${courseName}`);
        const students = await res.json();

        deletedList.innerHTML = '';

        if (students.length === 0) {
            deletedList.innerHTML = '<tr><td colspan="3">Inga raderade studenter att visa.</td></tr>';
            return;
        }

        students.forEach(student => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.name}</td>
                <td>${student.deletedAt}</td>
                <td>
                    <button class="restore-btn" data-filename="${student.filename}">Återställ</button>
                </td>
            `;
            deletedList.appendChild(tr);
        });
    }

    deletedList.addEventListener('click', async (e) => {
        if (!e.target.matches('.restore-btn')) return;

        const btn = e.target;
        const filename = btn.dataset.filename;

        if (confirm(`Är du säker på att du vill återställa denna student?`)) {
            const res = await fetch(`/api/students/restore?course=${courseName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });

            if (res.ok) {
                alert('Studenten har återställts!');
                loadDeletedStudents(); // Refresh the list
            } else {
                const { error } = await res.json();
                alert(`Kunde inte återställa studenten: ${error}`);
            }
        }
    });

    loadDeletedStudents();
});