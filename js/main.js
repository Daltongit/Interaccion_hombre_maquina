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
    
    // UI del Reloj y Enfoque
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskTitle = document.getElementById('focus-task-title');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const btnExitFocus = document.getElementById('btn-exit-focus');

    // UI Brain Dump (Caja de Distracciones)
    const dumpInput = document.getElementById('dump-input');
    const btnDump = document.getElementById('btn-dump');
    const dumpList = document.getElementById('dump-list');

    // Estado
    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let defaultTime = 25; 
    let timeLeft = 0;
    let selectedTimeEstimate = 25; // Tiempo por defecto al crear tarea
    const circumference = 2 * Math.PI * 115; 

    timerProgress.style.strokeDasharray = circumference;

    // --- 1. GESTIÓN DEL TIEMPO ESTIMADO (CHIPS) ---
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedTimeEstimate = parseInt(e.currentTarget.dataset.time);
        });
    });

    // --- 2. CAJA DE DISTRACCIONES (BRAIN DUMP) ---
    // Guarda el pensamiento intrusivo silenciosamente en la BD
    btnDump.addEventListener('click', async () => {
        const text = dumpInput.value.trim();
        if (!text) return;
        
        btnDump.disabled = true;
        // Añade a la interfaz temporal
        const li = document.createElement('li');
        li.innerHTML = `<i class='bx bx-check'></i> ${text}`;
        dumpList.appendChild(li);
        
        // Guarda en Supabase con la categoría 'general' y tiempo rápido (5m)
        await supabase.from('tareas').insert([{ 
            texto: `[Idea] ${text}`, 
            categoria: 'general',
            tiempo_estimado: 5
        }]);
        
        dumpInput.value = '';
        btnDump.disabled = false;
        window.showToast("Anotado. No pierdas el enfoque.", "bx-brain");
        fetchTasks(); // Actualiza la lista por debajo
    });
    dumpInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') btnDump.click(); });

    // --- 3. RECOMPENSA Y ALERTAS ---
    function triggerReward() {
        // Confeti de Dopamina
        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        
        // Alerta Visual/Háptica si está activada
        if (localStorage.getItem('visualAlerts') === 'true') {
            document.body.classList.add('screen-flash');
            setTimeout(() => document.body.classList.remove('screen-flash'), 1500);
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]); 
        } else {
            playChime();
        }
    }

    function playChime() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1.5);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1.5);
    }

    // --- 4. RELOJ POMODORO VISUAL ---
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

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
                    btnTimerToggle.classList.add('hidden');
                    triggerReward(); // Llama a la dopamina
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
            triggerReward(); // Felicita al usuario
            fetchTasks(); 
        }
        setTimeout(() => btnExitFocus.click(), 1500); // Espera al confeti
    });

    btnExitFocus.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        dumpList.innerHTML = ''; // Limpia la caja
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // --- 5. DESGLOSE Y CATEGORÍAS ---
    function generateSubtasks(text) {
        const t = text.toLowerCase();
        if (t.includes('correr') || t.includes('ejercicio')) return ["1. Zapatillas listas.", "2. Estirar 5 min.", "3. Ritmo suave."];
        if (t.includes('estudiar') || t.includes('leer')) return ["1. Despejar escritorio.", "2. Leer título.", "3. 15 min sin celular."];
        if (t.includes('limpiar') || t.includes('barrer')) return ["1. Recoger basura.", "2. Limpiar superficies.", "3. Barrer hacia puerta."];
        return [`1. Qué necesitas para "${text}"`, "2. Haz la parte fácil 5m.", "3. Toma aire."];
    }

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
            const estimatedTime = task.tiempo_estimado || 25; // Lee el tiempo de DB
            
            div.className = `task-item ${task.completada ? 'completed' : ''}`;
            div.innerHTML = `
                <button class="icon-btn btn-check" aria-label="Completar" data-id="${task.id}" data-state="${task.completada}"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
                <div class="cat-icon cat-${cat.cat}"><i class='bx ${cat.icon}'></i></div>
                <div class="task-content">
                    <span class="task-text">${task.texto}</span>
                    <div class="task-meta">
                        <span>${cat.name}</span>
                        <span class="time-badge"><i class='bx bx-time'></i> ${estimatedTime}m</span>
                        ${!task.completada ? `<button class="btn-magic" data-text="${task.texto}"><i class='bx bx-magic-wand'></i> Desglosar</button>` : ''}
                    </div>
                    <div class="subtasks-container hidden" id="subtasks-${task.id}"></div>
                </div>
                <div class="task-actions">
                    ${!task.completada ? `<button class="btn-focus-clear" title="Enfocar" data-time="${estimatedTime}"><i class='bx bx-target-lock'></i> Enfocar</button>` : ''}
                    <button class="icon-btn btn-listen" data-text="${task.texto}" title="Escuchar"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}"><i class='bx bx-trash'></i></button>
                </div>
            `;
            
            // Iniciar Enfoque leyendo el tiempo estimado
            const btnFocus = div.querySelector('.btn-focus-clear');
            if (btnFocus) {
                btnFocus.addEventListener('click', (e) => {
                    currentFocusTask = task;
                    focusTaskTitle.textContent = task.texto; 
                    
                    defaultTime = parseInt(e.currentTarget.dataset.time);
                    timeLeft = defaultTime * 60;
                    updateTimerDisplay();
                    
                    btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`;
                    btnTimerToggle.classList.remove('hidden');
                    btnTimerComplete.classList.add('hidden');
                    
                    dashboardView.classList.add('hidden');
                    focusView.classList.remove('hidden');
                });
            }

            // Desglose Mágico
            const btnMagic = div.querySelector('.btn-magic');
            if (btnMagic) {
                btnMagic.addEventListener('click', (e) => {
                    const container = document.getElementById(`subtasks-${task.id}`);
                    if (container.classList.contains('hidden')) {
                        container.innerHTML = generateSubtasks(e.currentTarget.dataset.text).map(s => `<div class="subtask-item"><i class='bx bx-chevron-right'></i> ${s}</div>`).join('');
                        container.classList.remove('hidden');
                        e.currentTarget.innerHTML = "<i class='bx bx-collapse'></i> Ocultar";
                    } else {
                        container.classList.add('hidden');
                        e.currentTarget.innerHTML = "<i class='bx bx-magic-wand'></i> Desglosar";
                    }
                });
            }

            // Eliminar, Completar, Escuchar
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

    // --- AÑADIR TAREA CON ESTIMACIÓN ---
    btnAdd.addEventListener('click', async () => {
        if (!taskInput.value) return;
        btnAdd.disabled = true;
        await supabase.from('tareas').insert([{ 
            texto: taskInput.value,
            tiempo_estimado: selectedTimeEstimate // Se guarda el tiempo seleccionado
        }]);
        taskInput.value = '';
        btnAdd.disabled = false;
        fetchTasks();
    });

    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });

    // --- MICRÓFONO ---
    btnDictate.addEventListener('click', () => {
        if (navigator.brave && navigator.brave.isBrave) {
            window.showToast('Estás en Brave. Usa texto o desactiva escudos.', 'bx-shield-x');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return window.showToast('Navegador no compatible.', 'bx-error');

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.onstart = () => { btnDictate.classList.add('listening'); };
        recognition.onresult = (e) => { taskInput.value = e.results[0][0].transcript; };
        recognition.onend = () => { btnDictate.classList.remove('listening'); };
        recognition.onerror = (e) => { btnDictate.classList.remove('listening'); window.showToast(`Error: ${e.error}`, 'bx-error'); };
        recognition.start();
    });

    fetchTasks();
});
