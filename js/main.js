document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');

    // Array para guardar tareas
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Renderizar tareas en la pantalla
    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <span>${task.text}</span>
                <div class="task-actions">
                    <button class="btn-complete" onclick="toggleTask(${index})" aria-label="Completar tarea">
                        <i class='bx ${task.completed ? 'bx-undo' : 'bx-check'}'></i>
                    </button>
                    <button class="btn-delete" onclick="deleteTask(${index})" aria-label="Eliminar tarea">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    // Añadir nueva tarea
    window.addTask = function (text) {
        if (text.trim() === '') {
            showToast('La tarea no puede estar vacía', 'error');
            return;
        }
        tasks.push({ text: text, completed: false });
        saveAndRender();
        taskInput.value = '';
        showToast('Tarea añadida con éxito'); // Retroalimentación
    }

    // Evento click del botón añadir
    btnAdd.addEventListener('click', () => addTask(taskInput.value));

    // Evento Enter en el input
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask(taskInput.value);
    });

    // Completar o deshacer tarea
    window.toggleTask = function (index) {
        tasks[index].completed = !tasks[index].completed;
        saveAndRender();
        showToast(tasks[index].completed ? 'Tarea completada' : 'Tarea restaurada');
    }

    // Eliminar tarea
    window.deleteTask = function (index) {
        tasks.splice(index, 1);
        saveAndRender();
        showToast('Tarea eliminada', 'error');
    }

    function saveAndRender() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    // Render inicial
    renderTasks();
});