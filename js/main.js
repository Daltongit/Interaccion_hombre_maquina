import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Conexión a Supabase
const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    const btnDictate = document.getElementById('btn-dictate');
    const voiceIndicator = document.getElementById('voice-indicator');
    
    // Progreso
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');

    // Modo Enfoque
    const navFocus = document.getElementById('nav-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskCard = document.getElementById('focus-task-card');

    let activeTasks = [];

    // --- 1. CATEGORIZADOR INTELIGENTE ---
    function analyzeTaskCategory(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/(ejercicio|gym|gimnasio|correr|entrenar|pesas)/)) {
            return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        } else if (lowerText.match(/(deberes|tarea|estudiar|leer|examen|matemáticas|universidad)/)) {
            return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        } else if (lowerText.match(/(medicina|pastilla|doctor|salud|cita médica)/)) {
            return { cat: 'salud', icon: 'bx-plus-medical', name: 'Salud' };
        } else if (lowerText.match(/(limpiar|cocinar|barrer|platos|ropa|hogar)/)) {
            return { cat: 'hogar', icon: 'bx-home-heart', name: 'Hogar' };
        } else if (lowerText.match(/(comprar|supermercado|pagar|tienda|leche|pan|mercado)/)) {
            return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
        } else if (lowerText.match(/(reunión|cliente|correo|informe|trabajo)/)) {
            return { cat: 'trabajo', icon: 'bx-briefcase', name: 'Trabajo' };
        }
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    // --- 2. CONTROL DEL MICRÓFONO ---
    btnDictate.addEventListener('click', () => {
        if (window.location.protocol === 'file:') {
            window.showToast('Aviso: El micrófono requiere un servidor local o internet para funcionar por seguridad del navegador.', 'bx-shield-x');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            
            recognition.onstart = () => {
                btnDictate.classList.add('listening');
                voiceIndicator.classList.remove('hidden');
            };
            
            recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                taskInput.value = transcript.charAt(0).toUpperCase() + transcript.slice(1);
                window.showToast('Voz procesada. Revisa y pulsa Añadir.', 'bx-microphone');
            };
            
            recognition.onend = () => {
                btnDictate.classList.remove('listening');
                voiceIndicator.classList.add('hidden');
            };

            recognition.onerror = (e) => {
                window.showToast(`Error de voz: ${e.error}`, 'bx-error');
                btnDictate.classList.remove('listening');
                voiceIndicator.classList.add('hidden');
            };

            recognition.start();
        } else {
            window.showToast('Tu navegador no soporta comandos de voz.', 'bx-error');
        }
    });

    // --- 3. BARRA DE PROGRESO ---
    function updateProgress(tasks) {
        if (tasks.length === 0) {
            progressBarFill.style.width = '0%';
            progressText.textContent = '0 de 0 completadas';
            return;
        }
        const completed = tasks.filter(t => t.completada).length;
        const total = tasks.length;
        const percentage = (completed / total) * 100;
        
        progressBarFill.style.width = `${percentage}%`;
        progressText.textContent = `${completed} de ${total} completadas`;
    }

    // --- 4. OBTENER Y RENDERIZAR TAREAS ---
    async function fetchTasks() {
        try {
            syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Sincronizando...`;
            syncStatus.style.color = 'var(--text-muted)';
            
            const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            activeTasks = data.filter(t => !t.completada);
            renderTasks(data);
            updateProgress(data);
            
            syncStatus.innerHTML = `<i class='bx bx-cloud-check'></i> Sincronizado`;
            syncStatus.style.color = 'var(--success)';
        } catch (error) {
            console.error(error);
            window.showToast('Error de conexión con la base de datos', 'bx-error');
            syncStatus.innerHTML = `<i class='bx bx-error'></i> Error`;
            syncStatus.style.color = 'var(--danger)';
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        
        // Tutorial Integrado
        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="tutorial-state">
                    <h3>¡Bienvenido a FocusFlow! 🚀</h3>
                    <div class="tutorial-steps">
                        <div class="step">
                            <div class="step-icon"><i class='bx bx-pencil'></i></div>
                            <p><strong>1. Escribe o dicta</strong><br>Añade tareas como "hacer ejercicio" o "deberes".</p>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class='bx bx-category'></i></div>
                            <p><strong>2. Categorización</strong><br>Le pondremos el ícono y color automáticamente.</p>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class='bx bx-target-lock'></i></div>
                            <p><strong>3. Modo Enfoque</strong><br>Úsalo para concentrarte en una sola cosa a la vez.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Renderizar Lista
        tasks.forEach(task => {
            const categoryInfo = analyzeTaskCategory(task.texto);
            const div = document.createElement('div');
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="${task.completada ? 'Desmarcar' : 'Marcar'} tarea" data-id="${task.id}" data-state="${task.completada}">
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
                    <button class="icon-btn btn-listen" aria-label="Escuchar tarea" data-text="${task.texto}" title="Leer en voz alta">
                        <i class='bx bx-volume-full'></i>
                    </button>
                    <button class="icon-btn btn-delete" style="color: var(--danger);" aria-label="Eliminar tarea" data-id="${task.id}" title="Eliminar">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            `;

            // Evento: Leer en voz alta
            div.querySelector('.btn-listen').addEventListener('click', (e) => {
                window.readTextAloud(e.currentTarget.dataset.text);
            });

            // Evento: Eliminar tarea
            div.querySelector('.btn-delete').addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                div.style.opacity = '0.5';
                await supabase.from('tareas').delete().eq('id', id);
                window.showToast('Tarea eliminada', 'bx-trash');
                fetchTasks();
            });

            // Evento: Marcar como completada/pendiente
            div.querySelector('.btn-check').addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const currentState = e.currentTarget.dataset.state === 'true';
                await supabase.from('tareas').update({ completada: !currentState }).eq('id', id);
                fetchTasks();
            });

            taskList.appendChild(div);
        });
    }

    // --- 5. AÑADIR NUEVA TAREA ---
    btnAdd.addEventListener('click', async () => {
        const text = taskInput.value.trim();
        if (!text) {
            window.showToast('Por favor, escribe una tarea primero', 'bx-info-circle');
            return;
        }

        btnAdd.disabled = true;
        syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Guardando...`;
        
        const catInfo = analyzeTaskCategory(text);

        try {
            const { error } = await supabase.from('tareas').insert([{ texto: text, categoria: catInfo.cat }]);
            if (error) throw error;
            
            taskInput.value = '';
            window.showToast('¡Nueva tarea guardada!', 'bx-check');
            fetchTasks();
        } catch (error) {
            console.error(error);
            window.showToast('Error al guardar la tarea', 'bx-error');
        } finally {
            btnAdd.disabled = false;
        }
    });

    // Permite añadir tarea pulsando Enter en el teclado
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnAdd.click();
        }
    });

    // --- 6. MODO ENFOQUE ---
    navFocus.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeTasks.length === 0) {
            window.showToast('No tienes tareas pendientes para enfocar.', 'bx-info-circle');
            return;
        }
        
        // Toma la tarea activa más antigua
        const focusTask = activeTasks[activeTasks.length - 1]; 
        focusTaskCard.textContent = focusTask.texto;
        
        dashboardView.classList.add('hidden');
        focusView.classList.remove('hidden');
    });

    btnExitFocus.addEventListener('click', () => {
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // Arrancar la aplicación pidiendo las tareas
    fetchTasks();
});
