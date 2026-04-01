import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    const btnDictate = document.getElementById('btn-dictate');
    const voiceIndicator = document.getElementById('voice-indicator');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');

    // MODO ENFOQUE DOM
    const navFocus = document.getElementById('nav-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskCard = document.getElementById('focus-task-card');
    const timerDisplay = document.getElementById('timer-display');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const timerBtnText = document.getElementById('timer-btn-text');
    const focusSubtitle = document.getElementById('focus-subtitle');

    let activeTasks = [];
    let currentFocusTask = null; // Tarea que estamos haciendo en modo enfoque

    // --- LÓGICA DEL RELOJ POMODORO ---
    let timerInterval;
    let isTimerRunning = false;
    // Leer el tiempo guardado en ajustes (por defecto 25 min)
    let defaultTime = parseInt(localStorage.getItem('focusTimer')) || 25;
    let timeLeft = defaultTime * 60; 

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    btnTimerToggle.addEventListener('click', () => {
        if (isTimerRunning) {
            // Pausar
            clearInterval(timerInterval);
            isTimerRunning = false;
            timerBtnText.textContent = 'Reanudar';
            btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Reanudar`;
            focusSubtitle.textContent = "Reloj en pausa.";
        } else {
            // Iniciar
            isTimerRunning = true;
            btnTimerToggle.innerHTML = `<i class='bx bx-pause'></i> Pausar`;
            focusSubtitle.textContent = "Concéntrate. El tiempo está corriendo...";
            btnTimerComplete.classList.remove('hidden'); // Aparece el botón de terminar

            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerDisplay.textContent = "00:00";
                    window.showToast("¡Tiempo terminado! ¡Excelente trabajo!", "bx-party");
                    btnTimerToggle.classList.add('hidden');
                }
            }, 1000);
        }
    });

    btnTimerComplete.addEventListener('click', async () => {
        clearInterval(timerInterval);
        if (currentFocusTask) {
            btnTimerComplete.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            await supabase.from('tareas').update({ completada: true }).eq('id', currentFocusTask.id);
            window.showToast('¡Tarea completada con éxito!', 'bx-check-double');
            fetchTasks(); // Actualizar lista principal
        }
        btnExitFocus.click(); // Salir del modo enfoque
    });

    // --- CATEGORIZADOR ---
    function analyzeTaskCategory(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.match(/(ejercicio|gym|gimnasio|correr|pesas)/)) return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        if (lowerText.match(/(deberes|tarea|estudiar|leer)/)) return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        if (lowerText.match(/(medicina|pastilla|doctor)/)) return { cat: 'salud', icon: 'bx-plus-medical', name: 'Salud' };
        if (lowerText.match(/(limpiar|cocinar)/)) return { cat: 'hogar', icon: 'bx-home-heart', name: 'Hogar' };
        if (lowerText.match(/(comprar|pagar|supermercado)/)) return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    // --- MICRÓFONO MEJORADO ---
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
            window.showToast('Voz procesada.', 'bx-microphone');
        };
        
        recognition.onend = () => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
        };

        // EXPLICACIÓN DEL ERROR NETWORK
        recognition.onerror = (e) => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
            if(e.error === 'network') {
                window.showToast('Chrome requiere conexión a internet para convertir tu voz a texto.', 'bx-wifi-off');
            } else if (e.error === 'not-allowed') {
                window.showToast('Permite el acceso al micrófono en el navegador.', 'bx-lock-alt');
            } else {
                window.showToast(`Error: ${e.error}`, 'bx-error');
            }
        };

        recognition.start();
    });

    // --- SUPABASE Y RENDER ---
    async function fetchTasks() {
        syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
        const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
        if (!error) {
            activeTasks = data.filter(t => !t.completada);
            renderTasks(data);
            
            // Progreso
            const completed = data.filter(t => t.completada).length;
            const total = data.length;
            progressBarFill.style.width = total === 0 ? '0%' : `${(completed/total)*100}%`;
            progressText.textContent = `${completed} de ${total} completadas`;
            syncStatus.innerHTML = `<i class='bx bx-cloud-check'></i>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if(tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted)">Añade tu primera tarea arriba.</p>';
            return;
        }

        tasks.forEach(task => {
            const cat = analyzeTaskCategory(task.texto);
            const div = document.createElement('div');
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            div.innerHTML = `
                <button class="icon-btn btn-check" data-id="${task.id}" data-state="${task.completada}"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
                <div class="cat-icon cat-${cat.cat}"><i class='bx ${cat.icon}'></i></div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <span class="task-meta">${cat.name}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn btn-listen" data-text="${task.texto}"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}"><i class='bx bx-trash'></i></button>
                </div>
            `;
            // Eliminar
            div.querySelector('.btn-delete').addEventListener('click', async (e) => {
                await supabase.from('tareas').delete().eq('id', e.currentTarget.dataset.id);
                fetchTasks();
            });
            // Completar
            div.querySelector('.btn-check').addEventListener('click', async (e) => {
                const state = e.currentTarget.dataset.state === 'true';
                await supabase.from('tareas').update({ completada: !state }).eq('id', e.currentTarget.dataset.id);
                fetchTasks();
            });
            // Escuchar
            div.querySelector('.btn-listen').addEventListener('click', (e) => window.readTextAloud(e.currentTarget.dataset.text));
            
            taskList.appendChild(div);
        });
    }

    // AÑADIR TAREA
    btnAdd.addEventListener('click', async () => {
        if (!taskInput.value) return;
        btnAdd.disabled = true;
        await supabase.from('tareas').insert([{ texto: taskInput.value }]);
        taskInput.value = '';
        btnAdd.disabled = false;
        fetchTasks();
    });

    // MODO ENFOQUE ACTIVACIÓN
    navFocus.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeTasks.length === 0) return window.showToast('Sin tareas pendientes para enfocar.', 'bx-info-circle');
        
        currentFocusTask = activeTasks[activeTasks.length - 1]; 
        focusTaskCard.textContent = currentFocusTask.texto;
        
        // Reset Reloj
        clearInterval(timerInterval);
        isTimerRunning = false;
        timeLeft = defaultTime * 60;
        updateTimerDisplay();
        btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`;
        btnTimerToggle.classList.remove('hidden');
        btnTimerComplete.classList.add('hidden');
        btnTimerComplete.innerHTML = `<i class='bx bx-check'></i> ¡Completada!`;
        focusSubtitle.textContent = "Evita distracciones. Tú puedes.";
        
        dashboardView.classList.add('hidden');
        focusView.classList.remove('hidden');
    });

    btnExitFocus.addEventListener('click', () => {
        clearInterval(timerInterval);
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    fetchTasks();
});
