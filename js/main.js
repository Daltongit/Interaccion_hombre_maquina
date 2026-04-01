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
    
    // DOM Reloj y Enfoque
    const dashboardView = document.getElementById('dashboard-view');
    const focusView = document.getElementById('focus-view');
    const focusTaskCard = document.getElementById('focus-task-card');
    const timerDisplay = document.getElementById('timer-display');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerComplete = document.getElementById('btn-timer-complete');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const btnNoise = document.getElementById('btn-noise');

    // Variables de Estado
    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let timeLeft = 0;
    
    // Variables para Ruido Marrón (Web Audio API)
    let audioCtx, noiseSource, filter;
    let isNoisePlaying = false;

    // --- 1. GENERADOR DE RUIDO MARRÓN (FUNCIÓN NOVEDOSA PARA TDAH) ---
    function toggleBrownNoise() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let bufferSize = 2 * audioCtx.sampleRate,
                noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
                output = noiseBuffer.getChannelData(0);
            
            // Simular ruido
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                let white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02; // Filtro matemático para ruido marrón
                lastOut = output[i];
                output[i] *= 3.5; 
            }
            
            noiseSource = audioCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;
            
            // Suavizar el sonido
            filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            
            noiseSource.connect(filter);
            filter.connect(audioCtx.destination);
            noiseSource.start(0);
            isNoisePlaying = true;
        } else {
            if (audioCtx.state === 'running') {
                audioCtx.suspend();
                isNoisePlaying = false;
            } else {
                audioCtx.resume();
                isNoisePlaying = true;
            }
        }
        
        btnNoise.classList.toggle('active', isNoisePlaying);
        btnNoise.innerHTML = isNoisePlaying ? "<i class='bx bx-stop-circle'></i> Pausar Sonido" : "<i class='bx bx-headphone'></i> Activar Sonido de Enfoque";
    }

    btnNoise.addEventListener('click', toggleBrownNoise);

    // --- 2. RELOJ POMODORO FUNCIONAL ---
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
                    window.showToast("¡Tiempo terminado! Muy bien.", "bx-party");
                    btnTimerToggle.classList.add('hidden');
                    
                    if (isNoisePlaying) toggleBrownNoise(); // Apagar sonido
                }
            }, 1000);
        }
    });

    // Cerrar y guardar tarea
    btnTimerComplete.addEventListener('click', async () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        if (isNoisePlaying) toggleBrownNoise();

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
        if (isNoisePlaying) toggleBrownNoise();
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // --- 3. SISTEMA DE DESGLOSE MÁGICO (NOVEDAD) ---
    function generateSubtasks(text) {
        return [
            "Paso 1: Prepara tu espacio y materiales.",
            `Paso 2: Dedica los primeros 5 minutos a iniciar "${text}".`,
            "Paso 3: Revisa lo hecho y tacha la tarea principal."
        ];
    }

    // --- 4. GESTIÓN DEL MICRÓFONO (SOLUCIÓN A BRAVE) ---
    btnDictate.addEventListener('click', () => {
        // Detectar navegador Brave que bloquea el micro
        if (navigator.brave && navigator.brave.isBrave) {
            window.showToast('Estás en Brave. Desactiva los escudos (icono del león) o usa Chrome para usar la voz.', 'bx-shield-x');
            return;
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
            taskInput.value = e.results[0][0].transcript;
            window.showToast('Voz procesada.', 'bx-microphone');
        };
        
        recognition.onend = () => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
        };

        recognition.onerror = (e) => {
            btnDictate.classList.remove('listening');
            voiceIndicator.classList.add('hidden');
            if(e.error === 'network') {
                window.showToast('Error de red. Si usas Brave/Edge, cambia la config de privacidad.', 'bx-wifi-off');
            } else {
                window.showToast(`Error: ${e.error}`, 'bx-error');
            }
        };
        recognition.start();
    });

    // --- 5. CATEGORIZADOR Y RENDERIZADO ---
    function analyzeTaskCategory(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.match(/(ejercicio|gym|gimnasio|correr|pesas)/)) return { cat: 'ejercicio', icon: 'bx-dumbbell', name: 'Ejercicio' };
        if (lowerText.match(/(deberes|tarea|estudiar|leer)/)) return { cat: 'estudio', icon: 'bx-book-open', name: 'Estudio' };
        if (lowerText.match(/(medicina|pastilla|doctor)/)) return { cat: 'salud', icon: 'bx-plus-medical', name: 'Salud' };
        if (lowerText.match(/(limpiar|cocinar|barrer)/)) return { cat: 'hogar', icon: 'bx-home-heart', name: 'Hogar' };
        if (lowerText.match(/(comprar|pagar|supermercado)/)) return { cat: 'compras', icon: 'bx-cart', name: 'Compras' };
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
            
            // Botón de Enfoque y Botón de Desglose
            div.innerHTML = `
                <button class="icon-btn btn-check" data-id="${task.id}" data-state="${task.completada}"><i class='bx ${task.completada ? 'bx-check-circle solid' : 'bx-circle'}'></i></button>
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
                    ${!task.completada ? `<button class="icon-btn btn-focus" style="color: var(--primary);" title="Enfocar"><i class='bx bx-target-lock'></i></button>` : ''}
                    <button class="icon-btn btn-listen" data-text="${task.texto}" title="Escuchar"><i class='bx bx-volume-full'></i></button>
                    <button class="icon-btn btn-delete" style="color:var(--danger)" data-id="${task.id}" title="Eliminar"><i class='bx bx-trash'></i></button>
                </div>
            `;
            
            // EVENTO 1: Iniciar Modo Enfoque desde la Tarea
            const btnFocus = div.querySelector('.btn-focus');
            if (btnFocus) {
                btnFocus.addEventListener('click', () => {
                    currentFocusTask = task;
                    focusTaskCard.textContent = task.texto;
                    
                    let defaultTime = parseInt(localStorage.getItem('focusTimer')) || 25;
                    timeLeft = defaultTime * 60;
                    updateTimerDisplay();
                    
                    btnTimerToggle.innerHTML = `<i class='bx bx-play'></i> Iniciar`;
                    btnTimerToggle.classList.remove('hidden');
                    btnTimerComplete.classList.add('hidden');
                    
                    dashboardView.classList.add('hidden');
                    focusView.classList.remove('hidden');
                });
            }

            // EVENTO 2: Desglose Mágico
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

            // EVENTO 3: Eliminar, Completar y Escuchar
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

    fetchTasks();
});
