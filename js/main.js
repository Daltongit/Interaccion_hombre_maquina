import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    const btnDictate = document.getElementById('btn-dictate');
    const voiceIndicator = document.getElementById('voice-indicator');
    
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskTitle = document.getElementById('focus-task-title');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const btnExitFocus = document.getElementById('btn-exit-focus');

    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let defaultTime = 25;
    let timeLeft = 0;
    const circumference = 2 * Math.PI * 115; // Matemáticas del SVG (radio 115)

    // --- 1. RELOJ POMODORO VISUAL (ANILLO) ---
    timerProgress.style.strokeDasharray = circumference;

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Lógica del anillo visual (Retroalimentación sin sonido)
        const totalSeconds = defaultTime * 60;
        const percentage = timeLeft / totalSeconds;
        const offset = circumference - (percentage * circumference);
        timerProgress.style.strokeDashoffset = offset;
    }

    btnTimerToggle.addEventListener('click', () => {
        if (isTimerRunning) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Reanudar`;
        } else {
            isTimerRunning = true;
            btnTimerToggle.innerHTML = `<i class='bx bx-pause'></i> Pausar`;
            btnTimerComplete.classList.remove('hidden');

            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    timerDisplay.textContent = "00:00";
                    timerProgress.style.strokeDashoffset = circumference;
                    window.showToast("¡Tiempo terminado! Buen trabajo.", "bx-party");
                    btnTimerToggle.classList.add('hidden');
                }
            }, 1000);
        }
    });

    btnTimerComplete.addEventListener('click', async () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        if (currentFocusTask) {
            btnTimerComplete.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            await supabase.from('tareas').update({ completada: true }).eq('id', currentFocusTask.id);
            window.showToast('¡Tarea completada con éxito!', 'bx-check-double');
            fetchTasks(); 
        }
        btnExitFocus.click(); 
    });

    btnExitFocus.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // --- 2. SISTEMA DE DESGLOSE MÁGICO INTELIGENTE ---
    function generateSubtasks(text) {
        const t = text.toLowerCase();
        if (t.includes('correr') || t.includes('ejercicio') || t.includes('gimnasio')) {
            return ["1. Ponte ropa cómoda y zapatillas adecuadas.", "2. Haz 5 minutos de estiramiento suave.", "3. Empieza a tu propio ritmo, no te apresures."];
        } else if (t.includes('estudiar') || t.includes('leer') || t.includes('deberes') || t.includes('matemáticas')) {
            return ["1. Despeja tu escritorio y ten agua cerca.", "2. Lee el título y haz un resumen mental.", "3. Haz 15 minutos de trabajo continuo sin celular."];
        } else if (t.includes('cocinar') || t.includes('comer') || t.includes('almuerzo')) {
            return ["1. Saca y lava todos los ingredientes necesarios.", "2. Prepara los utensilios y sartenes.", "3. Sigue la receta paso a paso y limpia al terminar."];
        } else if (t.includes('limpiar') || t.includes('barrer') || t.includes('cuarto')) {
            return ["1. Recoge toda la basura y ropa del suelo.", "2. Limpia las superficies (escritorio, mesas).", "3. Barre o aspira de adentro hacia la puerta."];
        } else if (t.includes('comprar') || t.includes('supermercado') || t.includes('tienda')) {
            return ["1. Revisa qué falta y haz una lista escrita.", "2. Lleva fundas reutilizables y tu billetera.", "3. Cíñete a la lista para evitar gastos extra."];
        }
        return [
            `1. Identifica qué necesitas para empezar "${text}".`,
            "2. Dedica solo 5 minutos a hacer la parte más fácil.",
            "3. Toma un respiro y avanza un poco más."
        ];
    }

    // --- 3. CATEGORIZADOR Y RENDERIZADO ---
    function analyzeTaskCategory(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.match(/(ejercicio|gym|gimnasio|correr|pesas)/)) return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        if (lowerText.match(/(deberes|tarea|estudiar|leer|matemáticas)/)) return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        if (lowerText.match(/(medicina|pastilla|doctor)/)) return { cat: 'salud', icon: 'bx-plus-medical', name: 'Salud' };
        if (lowerText.match(/(limpiar|cocinar|barrer|cuarto)/)) return { cat: 'hogar', icon: 'bx-home-heart', name: 'Hogar' };
        if (lowerText.match(/(comprar|pagar|supermercado|pan)/)) return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    async function fetchTasks() {
        syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
        const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
        if (!error) {
            renderTasks(data);
            const completed = data.filter(t => t.completada).length;
            const total = data.length;
            document.getElementById('progress-bar-fill').style.width = total === 0 ? '0%' : `${(completed/total)*100}%`;
            document.getElementById('progress-text').textContent = `${completed} de ${total} completadas`;
            syncStatus.innerHTML = `<i class='bx bx-cloud-check'></i>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if(tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted)">¡Añade tu primera tarea para empezar!</p>';
            return;
        }

        tasks.forEach(task => {
            const cat = analyzeTaskCategory(task.texto);
            const div = document.createElement('div');
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            
            // Botones CLAROS y etiquetados
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="Completar" data-id="${task.id}" data-state="${task.completada}"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
                <div class="cat-icon cat-${cat.cat}"><i class='bx ${cat.icon}'></i></div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <div class="task-meta">
                        <span>${cat.name}</span>
                        ${!task.completada ? `<button class="btn-magic" data-text="${task.texto}"><i class='bx bx-magic-wand'></i> Desglosar</button>` : ''}
                    </div>
                    <div class="subtasks-container hidden" id="subtasks-${task.id}"></div>
                </div>
                <div class="task-actions">
                    ${!task.completada ? `<button class="btn-focus-clear" title="Enfocar en esta tarea"><i class='bx bx-target-lock'></i> Enfocar</button>` : ''}
                    <button class="icon-btn btn-listen" data-text="${task.texto}" title="Leer en voz alta"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}" title="Eliminar"><i class='bx bx-trash'></i></button>
                </div>
            `;
            
            // EVENTO 1: Iniciar Modo Enfoque
            const btnFocus = div.querySelector('.btn-focus-clear');
            if (btnFocus) {
                btnFocus.addEventListener('click', () => {
                    currentFocusTask = task;
                    focusTaskTitle.textContent = task.texto; // Pone el nombre de la tarea en grande
                    
                    defaultTime = parseInt(localStorage.getItem('focusTimer')) || 25;
                    timeLeft = defaultTime * 60;
                    updateTimerDisplay();
                    
                    btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`;
                    btnTimerToggle.classList.remove('hidden');
                    btnTimerComplete.classList.add('hidden');
                    
                    dashboardView.classList.add('hidden');
                    focusView.classList.remove('hidden');
                });
            }

            // EVENTO 2: Desglose Mágico Inteligente
            const btnMagic = div.querySelector('.btn-magic');
            if (btnMagic) {
                btnMagic.addEventListener('click', (e) => {
                    const container = document.getElementById(`subtasks-${task.id}`);
                    if (container.classList.contains('hidden')) {
                        const subs = generateSubtasks(e.currentTarget.dataset.text);
                        container.innerHTML = subs.map(s => `<div class="subtask-item"><i class='bx bx-chevron-right'></i> ${s}</div>`).join('');
                        container.classList.remove('hidden');
                        e.currentTarget.innerHTML = "<i class='bx bx-collapse'></i> Ocultar";
                    } else {
                        container.classList.add('hidden');
                        e.currentTarget.innerHTML = "<i class='bx bx-magic-wand'></i> Desglosar";
                    }
                });
            }

            // EVENTOS: Eliminar, Completar y Escuchar
            div.querySelector('.btn-delete').addEventListener('click', async (e) => {
                await supabase.from('tareas').delete().eq('id', e.currentTarget.dataset.id);
                fetchTasks();
            });
            div.querySelector('.btn-check').addEventListener('click', async (e) => {
                const state = e.currentTarget.dataset.state === 'true';
                await supabase.from('tareas').update({ completada: !state }).eq('id', e.currentTarget.dataset.id);
                fetchTasks();
            });
            div.querySelector('.btn-listen').addEventListener('click', (e) => window.readTextAloud(e.currentTarget.dataset.text));
            
            taskList.appendChild(div);
        });
    }

    // AÑADIR TAREA NUEVA
    btnAdd.addEventListener('click', async () => {
        if (!taskInput.value) return;
        btnAdd.disabled = true;
        await supabase.from('tareas').insert([{ texto: taskInput.value }]);
        taskInput.value = '';
        btnAdd.disabled = false;
        fetchTasks();
    });

    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });

    // --- 4. MICRÓFONO (Manejo de Errores de Brave/Chrome) ---
    btnDictate.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return window.showToast('Navegador no compatible.', 'bx-error');

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        
        recognition.onstart = () => {
            btnDictate.classList.add('listening');
            voiceIndicator.classList.remove('hidden');
        };
        
        recognition.onresult = (e) => {
            taskInput.value = e.results[0][0].transcript;
            window.showToast('Voz procesada. Pulsa Añadir.', 'bx-microphone');
        };
        
        recognition.onend = () => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
        };

        recognition.onerror = (e) => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
            if(e.error === 'network') {
                window.showToast('Tu navegador (como Brave) bloquea el micrófono por privacidad. Usa texto.', 'bx-shield-x');
            } else {
                window.showToast(`Error: ${e.error}`, 'bx-error');
            }
        };
        recognition.start();
    });

    fetchTasks();
});
