import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ableqoayqflvukplslpf.supabase.co';
const supabaseKey = 'sb_publishable_-Q4UugMBj7mWvtk0JNRUTA_qpTStCh7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const prioritySelect = document.getElementById('task-priority');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    const btnDictate = document.getElementById('btn-dictate');
    
    const dashboardView = document.getElementById('dashboard-view');
    const statsView = document.getElementById('stats-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskTitle = document.getElementById('focus-task-title');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const btnExitFocus = document.getElementById('btn-exit-focus');

    const dumpInput = document.getElementById('dump-input');
    const btnDump = document.getElementById('btn-dump');
    const dumpList = document.getElementById('dump-list');

    let allTasksData = []; 
    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let defaultTime = 25; 
    let timeLeft = 0;
    let selectedTimeEstimate = 25;
    const circumference = 2 * Math.PI * 115; 

    if(timerProgress) timerProgress.style.strokeDasharray = circumference;

    // --- 1. GAMIFICACIÓN ---
    function calculateLevel(tasks) {
        const completedCount = tasks.filter(t => t.completada).length;
        const xp = completedCount * 50; 
        const level = Math.floor(xp / 200) + 1; 
        const xpInCurrentLevel = xp % 200;
        const progressPercentage = (xpInCurrentLevel / 200) * 100;

        document.getElementById('user-level').textContent = level;
        document.getElementById('user-xp').textContent = xp;
        document.getElementById('level-bar-fill').style.width = `${progressPercentage}%`;
        
        const lastLevel = parseInt(localStorage.getItem('savedLevel')) || 1;
        if (level > lastLevel) {
            window.showToast(`¡Subiste al Nivel ${level}! Eres increíble.`, 'bx-star');
            if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 100 });
            localStorage.setItem('savedLevel', level);
        }
    }

    // --- 2. NAVEGACIÓN Y FILTROS ---
    document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); switchView(dashboardView, e.currentTarget); });
    document.getElementById('nav-stats').addEventListener('click', (e) => { e.preventDefault(); switchView(statsView, e.currentTarget); updateStats(); });
    
    function switchView(viewToShow, activeNav) {
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        activeNav.classList.add('active');
        [dashboardView, statsView, focusView].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderTasks(allTasksData); 
        });
    });

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedTimeEstimate = parseInt(e.currentTarget.dataset.time);
        });
    });

    // --- 3. ATAJOS DE TECLADO ---
    const btnHelp = document.getElementById('btn-help');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); document.getElementById('nav-dashboard').click(); taskInput.focus(); }
        if (e.altKey && e.key.toLowerCase() === 'm') { e.preventDefault(); btnDictate.click(); }
        if (e.altKey && e.key.toLowerCase() === 'e') { e.preventDefault(); const fb = document.querySelector('.task-item:not(.completed) .btn-focus-clear'); if(fb) fb.click(); }
        if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); btnHelp.click(); }
        if (e.key === 'Escape') {
            if(!shortcutsModal.classList.contains('hidden')) btnCloseModal.click();
            else if(!focusView.classList.contains('hidden')) btnExitFocus.click();
        }
    });

    btnHelp.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => shortcutsModal.classList.add('hidden'));

    // --- 4. COMANDOS DE VOZ AVANZADOS ---
    btnDictate.addEventListener('click', () => {
        if (navigator.brave && navigator.brave.isBrave) return window.showToast('En Brave desactiva escudos para usar voz.', 'bx-shield-x');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return window.showToast('Navegador no compatible.', 'bx-error');

        const recognition = new SpeechRecognition(); recognition.lang = 'es-ES';
        recognition.onstart = () => { btnDictate.classList.add('listening'); document.getElementById('voice-indicator').classList.remove('hidden'); };
        
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript.toLowerCase();
            
            let priorityFound = 'media';
            if (transcript.includes('prioridad alta') || transcript.includes('urgente')) priorityFound = 'alta';
            else if (transcript.includes('prioridad baja')) priorityFound = 'baja';
            
            if (transcript.includes('activar modo oscuro') || transcript.includes('quitar modo oscuro')) { document.getElementById('theme-toggle')?.click(); } 
            else if (transcript.includes('leer tareas') || transcript.includes('leer mis tareas')) {
                const pending = allTasksData.filter(t => !t.completada);
                if(pending.length===0) window.readTextAloud("No hay tareas pendientes.");
                else window.readTextAloud("Tienes " + pending.length + " tareas pendientes. " + pending.map(t => t.texto).join(". "));
            }
            else if (transcript.includes('añadir tarea')) {
                const cleanTask = transcript.replace('añadir tarea', '').replace('prioridad alta', '').replace('prioridad media', '').replace('prioridad baja', '').trim();
                if(cleanTask) {
                    taskInput.value = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
                    prioritySelect.value = priorityFound;
                    btnAdd.click(); 
                    window.showToast(`Tarea añadida por voz (Prio: ${priorityFound}).`, 'bx-bot');
                }
            }
            else { taskInput.value = transcript.charAt(0).toUpperCase() + transcript.slice(1); window.showToast('Voz capturada.', 'bx-microphone'); }
        };
        recognition.onend = () => { btnDictate.classList.remove('listening'); document.getElementById('voice-indicator').classList.add('hidden'); };
        recognition.start();
    });

    // --- 5. LÓGICAS DEL RELOJ Y DESCARGA ---
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
                else { clearInterval(timerInterval); isTimerRunning = false; timerDisplay.textContent = "00:00"; timerProgress.style.strokeDashoffset = circumference; btnTimerToggle.classList.add('hidden'); triggerReward(); }
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
        await supabase.from('tareas').insert([{ texto: `[Descarga] ${text}`, categoria: 'general', tiempo_estimado: 5, prioridad: 'baja' }]);
        dumpInput.value = ''; btnDump.disabled = false; window.showToast("Anotado.", "bx-brain"); fetchTasks();
    });
    dumpInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') btnDump.click(); });

    // --- 6. GESTIÓN DE DATOS Y RENDERIZADO ---
    function updateStats() {
        const completed = allTasksData.filter(t => t.completada);
        const pending = allTasksData.filter(t => !t.completada);
        document.getElementById('stat-completed').textContent = completed.length;
        document.getElementById('stat-pending').textContent = pending.length;
        const totalMinutes = completed.reduce((acc, t) => acc + (t.tiempo_estimado || 25), 0);
        document.getElementById('stat-time').textContent = `${totalMinutes}m`;
    }

    function getPriorityWeight(pri) { return pri === 'alta' ? 3 : pri === 'media' ? 2 : 1; }

    function analyzeCategory(text) {
        const t = text.toLowerCase();
        if (t.match(/(ejercicio|gym|correr)/)) return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        if (t.match(/(deberes|estudiar|leer)/)) return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        return { cat: 'general', icon: 'bx-list-check', name: 'General' };
    }

    async function fetchTasks() {
        syncStatus.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
        const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
        if (!error) {
            allTasksData = data;
            renderTasks(data);
            calculateLevel(data);
            updateStats();
            
            const completed = data.filter(t => t.completada).length;
            const percentage = data.length === 0 ? 0 : Math.round((completed / data.length) * 100);
            document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
            document.getElementById('progress-text').textContent = `${percentage}% completadas`;
            
            syncStatus.innerHTML = `<i class='bx bx-cloud-check'></i>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        
        let sortedTasks = [...tasks].sort((a, b) => {
            if (a.completada !== b.completada) return a.completada ? 1 : -1;
            return getPriorityWeight(b.prioridad) - getPriorityWeight(a.prioridad);
        });

        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        sortedTasks.forEach(task => {
            if (activeFilter === 'pending' && task.completada) return;
            if (activeFilter === 'completed' && !task.completada) return;

            const cat = analyzeCategory(task.texto);
            const prioClass = `prio-${task.prioridad || 'media'}`;
            const prioLabel = task.prioridad ? task.prioridad.toUpperCase() : 'MEDIA';
            
            const div = document.createElement('div');
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="Marcar como completada"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
                <div class="cat-icon cat-${cat.cat}"><i class='bx ${cat.icon}'></i></div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <div class="task-meta">
                        <span class="priority-badge ${prioClass}" aria-label="Prioridad ${prioLabel}">${prioLabel}</span>
                        <span class="time-badge"><i class='bx bx-time'></i> ${task.tiempo_estimado || 25}m</span>
                    </div>
                </div>
                <div class="task-actions">
                    ${!task.completada ? `<button class="btn-focus-clear" data-time="${task.tiempo_estimado || 25}" aria-label="Enfocar en esta tarea"><i class='bx bx-target-lock'></i> Enfocar</button>` : ''}
                    <button class="icon-btn btn-listen" data-text="${task.texto}" aria-label="Leer tarea en voz alta"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}" aria-label="Eliminar tarea"><i class='bx bx-trash'></i></button>
                </div>
            `;
            
            div.querySelector('.btn-delete').addEventListener('click', async (e) => { await supabase.from('tareas').delete().eq('id', e.currentTarget.dataset.id); fetchTasks(); });
            div.querySelector('.btn-check').addEventListener('click', async (e) => { const state = task.completada; await supabase.from('tareas').update({ completada: !state }).eq('id', task.id); fetchTasks(); });
            div.querySelector('.btn-listen').addEventListener('click', (e) => window.readTextAloud(e.currentTarget.dataset.text));

            const btnFocus = div.querySelector('.btn-focus-clear');
            if (btnFocus) {
                btnFocus.addEventListener('click', (e) => {
                    currentFocusTask = task; focusTaskTitle.textContent = task.texto; 
                    defaultTime = parseInt(e.currentTarget.dataset.time); timeLeft = defaultTime * 60; updateTimerDisplay();
                    btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`; btnTimerToggle.classList.remove('hidden'); btnTimerComplete.classList.add('hidden');
                    dashboardView.classList.add('hidden'); statsView.classList.add('hidden'); focusView.classList.remove('hidden');
                });
            }
            
            taskList.appendChild(div);
        });
    }

    btnAdd.addEventListener('click', async () => {
        if (!taskInput.value) return;
        btnAdd.disabled = true;
        await supabase.from('tareas').insert([{ texto: taskInput.value, tiempo_estimado: selectedTimeEstimate, prioridad: prioritySelect.value }]);
        taskInput.value = ''; btnAdd.disabled = false; fetchTasks();
    });

    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });

    fetchTasks();
});
