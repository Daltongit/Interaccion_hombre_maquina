import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES DEL DOM ---
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    const btnDictate = document.getElementById('btn-dictate');
    const voiceIndicator = document.getElementById('voice-indicator');
    
    // Vistas y Navegación
    const dashboardView = document.getElementById('dashboard-view');
    const statsView = document.getElementById('stats-view');
    const focusView = document.getElementById('focus-view');
    const navDashboard = document.getElementById('nav-dashboard');
    const navStats = document.getElementById('nav-stats');
    
    // Reloj
    const focusTaskTitle = document.getElementById('focus-task-title');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const btnExitFocus = document.getElementById('btn-exit-focus');

    // Brain Dump
    const dumpInput = document.getElementById('dump-input');
    const btnDump = document.getElementById('btn-dump');
    const dumpList = document.getElementById('dump-list');

    // Filtros y Modal
    const filterBtns = document.querySelectorAll('.filter-btn');
    const btnHelp = document.getElementById('btn-help');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Estados
    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let defaultTime = 25; 
    let timeLeft = 0;
    let selectedTimeEstimate = 25;
    const circumference = 2 * Math.PI * 115; 
    let allTasksData = []; // Caché local para filtros rápidos

    timerProgress.style.strokeDasharray = circumference;

    // --- 1. SISTEMA DE NAVEGACIÓN Y TABS ---
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        navDashboard.classList.add('active');
        navStats.classList.remove('active');
        dashboardView.classList.remove('hidden');
        statsView.classList.add('hidden');
        focusView.classList.add('hidden');
    });

    navStats.addEventListener('click', (e) => {
        e.preventDefault();
        navStats.classList.add('active');
        navDashboard.classList.remove('active');
        statsView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        focusView.classList.add('hidden');
        updateStats(); // Refresca matemáticas
    });

    // --- 2. SISTEMA DE FILTROS DINÁMICOS (Eficiencia) ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const filterType = e.currentTarget.dataset.filter;
            
            document.querySelectorAll('.task-item').forEach(item => {
                const isCompleted = item.classList.contains('completed');
                if (filterType === 'all') item.classList.remove('hidden');
                else if (filterType === 'pending' && !isCompleted) item.classList.remove('hidden');
                else if (filterType === 'completed' && isCompleted) item.classList.remove('hidden');
                else item.classList.add('hidden');
            });
        });
    });

    // --- 3. ATAJOS DE TECLADO (Accesibilidad Motora) ---
    document.addEventListener('keydown', (e) => {
        // Alt + N: Enfocar Input Principal
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            navDashboard.click();
            taskInput.focus();
        }
        // Alt + M: Activar Micrófono
        if (e.altKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            btnDictate.click();
        }
        // Alt + E: Iniciar modo enfoque con la primera pendiente
        if (e.altKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const firstPendingBtn = document.querySelector('.task-item:not(.completed) .btn-focus-clear');
            if(firstPendingBtn) firstPendingBtn.click();
            else window.showToast('No hay tareas pendientes', 'bx-info-circle');
        }
        // Alt + H: Ayuda
        if (e.altKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            btnHelp.click();
        }
        // Esc: Salir de modales o enfoque
        if (e.key === 'Escape') {
            if(!shortcutsModal.classList.contains('hidden')) btnCloseModal.click();
            else if(!focusView.classList.contains('hidden')) btnExitFocus.click();
        }
    });

    btnHelp.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));

    // --- 4. COMANDOS DE VOZ AVANZADOS (La Killer Feature) ---
    btnDictate.addEventListener('click', () => {
        if (navigator.brave && navigator.brave.isBrave) {
            return window.showToast('En Brave debes desactivar escudos para usar voz.', 'bx-shield-x');
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return window.showToast('Navegador no compatible.', 'bx-error');

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        
        recognition.onstart = () => {
            btnDictate.classList.add('listening');
            voiceIndicator.classList.remove('hidden');
        };
        
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript.toLowerCase();
            
            // INTELIGENCIA DE COMANDOS 
            if (transcript.includes('activar modo oscuro') || transcript.includes('quitar modo oscuro')) {
                const themeBtn = document.getElementById('theme-toggle');
                if(themeBtn) {
                    themeBtn.checked = !themeBtn.checked;
                    themeBtn.dispatchEvent(new Event('change'));
                }
                window.showToast('Ejecutando comando visual...', 'bx-bot');
            } 
            else if (transcript.includes('leer tareas') || transcript.includes('leer mis tareas')) {
                const pending = allTasksData.filter(t => !t.completada);
                if (pending.length === 0) window.readTextAloud("No tienes tareas pendientes. ¡Felicidades!");
                else {
                    const textToRead = "Tus tareas pendientes son: " + pending.map((t, i) => `${i+1}. ${t.texto}`).join(". ");
                    window.readTextAloud(textToRead);
                    window.showToast('Leyendo tareas...', 'bx-volume-full');
                }
            } 
            else if (transcript.includes('ir a ajustes') || transcript.includes('abrir ajustes')) {
                window.location.href = "configuracion.html";
            }
            else {
                // Si no es un comando, lo pone en el input de tareas normal
                taskInput.value = transcript.charAt(0).toUpperCase() + transcript.slice(1);
                window.showToast('Voz capturada. Presiona Añadir.', 'bx-microphone');
            }
        };
        
        recognition.onend = () => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
        };
        recognition.start();
    });

    // --- 5. LÓGICA DE TIEMPOS Y RENDERIZADO ---
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedTimeEstimate = parseInt(e.currentTarget.dataset.time);
        });
    });

    function updateStats() {
        const completed = allTasksData.filter(t => t.completada);
        const pending = allTasksData.filter(t => !t.completada);
        
        document.getElementById('stat-completed').textContent = completed.length;
        document.getElementById('stat-pending').textContent = pending.length;
        
        // Sumar minutos de enfoque ganados
        const totalMinutes = completed.reduce((acc, t) => acc + (t.tiempo_estimado || 25), 0);
        document.getElementById('stat-time').textContent = `${totalMinutes}m`;
        
        // Barra de progreso global
        const total = allTasksData.length;
        const percentage = total === 0 ? 0 : Math.round((completed.length / total) * 100);
        document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = `${percentage}%`;
    }

    // Funciones del Reloj y Brain Dump (Mantenidas del código anterior)
    // ... [Para evitar exceso de texto, aquí asume las funciones de updateTimerDisplay, btnTimerToggle, btnDump, etc. que te di en la respuesta pasada. Funcionan idéntico].
    
    // (Pego resumido la mecánica del reloj para completitud del archivo)
    function triggerReward() {
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (localStorage.getItem('visualAlerts') === 'true') {
            document.body.classList.add('screen-flash');
            setTimeout(() => document.body.classList.remove('screen-flash'), 1500);
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]); 
        } else {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1.5);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
            osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 1.5);
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const offset = circumference - ((timeLeft / (defaultTime * 60)) * circumference);
        timerProgress.style.strokeDashoffset = offset;
    }

    btnTimerToggle.addEventListener('click', () => {
        if (isTimerRunning) { clearInterval(timerInterval); isTimerRunning = false; btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Reanudar`; } 
        else {
            isTimerRunning = true; btnTimerToggle.innerHTML = `<i class='bx bx-pause'></i> Pausar`; btnTimerComplete.classList.remove('hidden');
            timerInterval = setInterval(() => {
                if (timeLeft > 0) { timeLeft--; updateTimerDisplay(); } 
                else {
                    clearInterval(timerInterval); isTimerRunning = false; timerDisplay.textContent = "00:00"; timerProgress.style.strokeDashoffset = circumference;
                    btnTimerToggle.classList.add('hidden'); triggerReward();
                }
            }, 1000);
        }
    });

    btnTimerComplete.addEventListener('click', async () => {
        clearInterval(timerInterval); isTimerRunning = false;
        if (currentFocusTask) {
            btnTimerComplete.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            await supabase.from('tareas').update({ completada: true }).eq('id', currentFocusTask.id);
            triggerReward(); fetchTasks(); 
        }
        setTimeout(() => btnExitFocus.click(), 1500); 
    });

    btnExitFocus.addEventListener('click', () => {
        clearInterval(timerInterval); isTimerRunning = false; dumpList.innerHTML = '';
        focusView.classList.add('hidden'); dashboardView.classList.remove('hidden');
    });

    btnDump.addEventListener('click', async () => {
        const text = dumpInput.value.trim(); if (!text) return;
        btnDump.disabled = true;
        const li = document.createElement('li'); li.innerHTML = `<i class='bx bx-check'></i> ${text}`; dumpList.appendChild(li);
        await supabase.from('tareas').insert([{ texto: `[Descarga] ${text}`, categoria: 'general', tiempo_estimado: 5 }]);
        dumpInput.value = ''; btnDump.disabled = false; window.showToast("Anotado.", "bx-brain"); fetchTasks();
    });
    dumpInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') btnDump.click(); });

    // --- 6. SUPABASE Y RENDERIZADO ---
    function analyzeTaskCategory(text) {
        const t = text.toLowerCase();
        if (t.match(/(ejercicio|gym|correr|pesas)/)) return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        if (t.match(/(deberes|tarea|estudiar|leer)/)) return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        if (t.match(/(medicina|pastilla|doctor)/)) return { cat: 'salud', icon: 'bx-plus-medical', name: 'Salud' };
        if (t.match(/(limpiar|cocinar|cuarto)/)) return { cat: 'hogar', icon: 'bx-home-heart', name: 'Hogar' };
        if (t.match(/(comprar|supermercado|pagar)/)) return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    async function fetchTasks() {
        syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
        const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
        if (!error) {
            allTasksData = data; // Guarda en caché
            renderTasks(data);
            updateStats();
            syncStatus.innerHTML = `<i class='bx bx-cloud-check'></i>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if(tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted)">¡Añade tu primera tarea para empezar!</p>';
            return;
        }

        // Aplica el filtro activo actual al renderizar
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        tasks.forEach(task => {
            const cat = analyzeTaskCategory(task.texto);
            const div = document.createElement('div');
            const estimatedTime = task.tiempo_estimado || 25; 
            
            // Lógica de visibilidad por filtro
            let isHidden = false;
            if (activeFilter === 'pending' && task.completada) isHidden = true;
            if (activeFilter === 'completed' && !task.completada) isHidden = true;

            div.className = `task-item ${task.completada ? 'completed' : ''} ${isHidden ? 'hidden' : ''}`;
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="Completar" data-id="${task.id}" data-state="${task.completada}"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
                <div class="cat-icon cat-${cat.cat}"><i class='bx ${cat.icon}'></i></div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <div class="task-meta">
                        <span>${cat.name}</span>
                        <span class="time-badge"><i class='bx bx-time'></i> ${estimatedTime}m</span>
                    </div>
                </div>
                <div class="task-actions">
                    ${!task.completada ? `<button class="btn-focus-clear" title="Enfocar" data-time="${estimatedTime}"><i class='bx bx-target-lock'></i> Enfocar</button>` : ''}
                    <button class="icon-btn btn-listen" data-text="${task.texto}" title="Escuchar"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}"><i class='bx bx-trash'></i></button>
                </div>
            `;
            
            const btnFocus = div.querySelector('.btn-focus-clear');
            if (btnFocus) {
                btnFocus.addEventListener('click', (e) => {
                    currentFocusTask = task; focusTaskTitle.textContent = task.texto; 
                    defaultTime = parseInt(e.currentTarget.dataset.time); timeLeft = defaultTime * 60;
                    updateTimerDisplay();
                    btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`; btnTimerToggle.classList.remove('hidden'); btnTimerComplete.classList.add('hidden');
                    dashboardView.classList.add('hidden'); statsView.classList.add('hidden'); focusView.classList.remove('hidden');
                });
            }

            div.querySelector('.btn-delete').addEventListener('click', async (e) => { await supabase.from('tareas').delete().eq('id', e.currentTarget.dataset.id); fetchTasks(); });
            div.querySelector('.btn-check').addEventListener('click', async (e) => { const state = e.currentTarget.dataset.state === 'true'; await supabase.from('tareas').update({ completada: !state }).eq('id', e.currentTarget.dataset.id); fetchTasks(); });
            div.querySelector('.btn-listen').addEventListener('click', (e) => window.readTextAloud(e.currentTarget.dataset.text));
            
            taskList.appendChild(div);
        });
    }

    btnAdd.addEventListener('click', async () => {
        if (!taskInput.value) return;
        btnAdd.disabled = true;
        await supabase.from('tareas').insert([{ texto: taskInput.value, tiempo_estimado: selectedTimeEstimate }]);
        taskInput.value = ''; btnAdd.disabled = false; fetchTasks();
    });
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });

    fetchTasks();
});
