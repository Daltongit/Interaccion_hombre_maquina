import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    
    // Elementos del Voice Assistant
    const btnDictate = document.getElementById('btn-dictate');
    const voiceIndicator = document.getElementById('voice-indicator');

    // Elementos Modo Enfoque
    const navFocus = document.getElementById('nav-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskCard = document.getElementById('focus-task-card');
    
    let activeTasks = [];

    // --- 1. CATEGORIZADOR INTELIGENTE ---
    // Analiza el texto para asignar un color e icono (Ayuda visual)
    function analyzeTaskCategory(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.match(/(comprar|supermercado|pagar|tienda|leche|pan)/)) {
            return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
        } else if (lowerText.match(/(estudiar|leer|capítulo|tarea|universidad|examen)/)) {
            return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        } else if (lowerText.match(/(reunión|cliente|correo|informe|trabajo)/)) {
            return { cat: 'trabajo', icon: 'bx-briefcase', name: 'Trabajo' };
        }
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    // --- 2. COMANDOS DE VOZ (Reconocimiento) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        
        recognition.onstart = () => {
            btnDictate.classList.add('listening');
            voiceIndicator.classList.remove('hidden');
        };
        
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            taskInput.value = transcript.charAt(0).toUpperCase() + transcript.slice(1);
            window.showToast('Voz procesada. Revisa y añade.', 'bx-microphone');
        };
        
        recognition.onend = () => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
        };

        btnDictate.addEventListener('click', () => recognition.start());
    } else {
        btnDictate.style.display = 'none';
    }

    // --- 3. SUPABASE: GESTIÓN DE TAREAS ---
    function updateSyncUI(status, icon, color) {
        syncStatus.innerHTML = `<i class='bx ${icon}'></i> ${status}`;
        syncStatus.style.color = color;
    }

    async function fetchTasks() {
        try {
            updateSyncUI('Sincronizando...', 'bx-loader-alt bx-spin', 'var(--text-muted)');
            const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            activeTasks = data.filter(t => !t.completada); // Guardar para modo enfoque
            renderTasks(data);
            updateSyncUI('Sincronizado', 'bx-cloud-check', 'var(--success)');
        } catch (error) {
            window.showToast('Error de conexión', 'bx-error');
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No tienes tareas pendientes. ¡Excelente!</div>';
            return;
        }

        tasks.forEach(task => {
            const categoryInfo = analyzeTaskCategory(task.texto);
            const div = document.createElement('div');
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="Marcar completada" data-id="${task.id}" data-state="${task.completada}">
                    <i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i>
                </button>
                <div class="cat-icon cat-${categoryInfo.cat}">
                    <i class='bx ${categoryInfo.icon}'></i>
                </div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <span class="task-meta">${categoryInfo.name}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn btn-listen" aria-label="Escuchar" data-text="${task.texto}">
                        <i class='bx bx-volume-full'></i>
                    </button>
                    <button class="icon-btn btn-delete" style="color: var(--danger);" aria-label="Eliminar" data-id="${task.id}">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            `;

            // Eventos de botones
            div.querySelector('.btn-listen').addEventListener('click', (e) => {
                window.readTextAloud(e.currentTarget.dataset.text);
            });

            div.querySelector('.btn-delete').addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                div.style.opacity = '0.5';
                await supabase.from('tareas').delete().eq('id', id);
                window.showToast('Tarea eliminada', 'bx-trash');
                fetchTasks();
            });

            div.querySelector('.btn-check').addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const currentState = e.currentTarget.dataset.state === 'true';
                await supabase.from('tareas').update({ completada: !currentState }).eq('id', id);
                fetchTasks();
            });

            taskList.appendChild(div);
        });
    }

    btnAdd.addEventListener('click', async () => {
        const text = taskInput.value.trim();
        if (!text) return window.showToast('Escribe una tarea primero', 'bx-info-circle');

        btnAdd.disabled = true;
        updateSyncUI('Guardando...', 'bx-loader-alt bx-spin', 'var(--text-muted)');

        const catInfo = analyzeTaskCategory(text);

        try {
            const { error } = await supabase.from('tareas').insert([{ texto: text, categoria: catInfo.cat }]);
            if (error) throw error;
            taskInput.value = '';
            window.showToast('¡Nueva tarea guardada!', 'bx-check');
            fetchTasks();
        } catch (error) {
            window.showToast('Error al guardar', 'bx-error');
        } finally {
            btnAdd.disabled = false;
        }
    });

    // --- 4. MODO ENFOQUE (Ayuda TDAH) ---
    navFocus.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeTasks.length === 0) return window.showToast('No hay tareas pendientes para enfocar', 'bx-info-circle');
        
        // Toma la tarea más antigua que no esté completada
        const focusTask = activeTasks[activeTasks.length - 1]; 
        focusTaskCard.textContent = focusTask.texto;
        
        dashboardView.classList.add('hidden');
        focusView.classList.remove('hidden');
    });

    btnExitFocus.addEventListener('click', () => {
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // Iniciar app
    fetchTasks();
});
