// Importamos Supabase directamente desde el CDN oficial
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Tus credenciales
const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');

    // Función para mostrar estado de red (Criterio de Retroalimentación)
    const setSyncing = (isSyncing) => {
        if (isSyncing) {
            syncStatus.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            syncStatus.style.color = 'var(--text-muted)';
        } else {
            syncStatus.innerHTML = "<i class='bx bx-check-circle'></i> Sincronizado";
            syncStatus.style.color = 'var(--neon-2)';
        }
    };

    // 1. OBTENER TAREAS DE SUPABASE
    async function fetchTasks() {
        try {
            const { data, error } = await supabase
                .from('tareas') // ASUME QUE CREASTE UNA TABLA LLAMADA 'tareas'
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            taskList.innerHTML = ''; // Limpiar lista
            
            if (data.length === 0) {
                taskList.innerHTML = '<li class="loading-text">No hay tareas. ¡Añade una!</li>';
                return;
            }

            data.forEach(task => renderTaskItem(task));
        } catch (error) {
            console.error('Error cargando tareas:', error);
            taskList.innerHTML = '<li class="loading-text" style="color: #ff4444;">Error de conexión con Supabase</li>';
        }
    }

    // 2. RENDERIZAR UNA TAREA EN EL HTML
    function renderTaskItem(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        // Supabase por defecto crea un id, lo usamos para poder borrarla luego
        li.innerHTML = `
            <span class="task-text">${task.texto}</span>
            <button class="btn-delete" data-id="${task.id}" aria-label="Eliminar tarea">
                <i class='bx bx-trash'></i>
            </button>
        `;
        taskList.appendChild(li);

        // Evento para borrar
        const btnDelete = li.querySelector('.btn-delete');
        btnDelete.addEventListener('click', () => deleteTask(task.id, li));
    }

    // 3. AÑADIR TAREA A SUPABASE
    async function addTask(text) {
        if (!text.trim()) return;
        
        setSyncing(true);
        taskInput.disabled = true; // Prevenir doble envío

        try {
            const { data, error } = await supabase
                .from('tareas')
                .insert([{ texto: text }])
                .select();

            if (error) throw error;

            taskInput.value = '';
            // Recargar lista para mostrar la nueva
            fetchTasks(); 
        } catch (error) {
            console.error('Error al guardar:', error);
            alert("Asegúrate de haber creado la tabla 'tareas' con una columna 'texto' en tu Supabase.");
        } finally {
            setSyncing(false);
            taskInput.disabled = false;
            taskInput.focus();
        }
    }

    // 4. ELIMINAR TAREA DE SUPABASE
    async function deleteTask(id, liElement) {
        setSyncing(true);
        liElement.style.opacity = '0.5'; // Retroalimentación visual

        try {
            const { error } = await supabase
                .from('tareas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            liElement.remove(); // Quitar del DOM
            if(taskList.children.length === 0) fetchTasks(); // Mostrar mensaje de vacío si es la última
        } catch (error) {
            console.error('Error al eliminar:', error);
            liElement.style.opacity = '1';
        } finally {
            setSyncing(false);
        }
    }

    // EVENTOS
    btnAdd.addEventListener('click', () => addTask(taskInput.value));
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask(taskInput.value);
    });

    // Iniciar carga inicial
    fetchTasks();
});
