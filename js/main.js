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

    // DOM Respiración
    const breatheCircle = document.getElementById('breathe-circle');
    const breatheText = document.getElementById('breathe-text');
    let breatheTimeout1, breatheTimeout2, breatheTimeout3;

    let currentFocusTask = null; 
    let timerInterval = null;
    let isTimerRunning = false;
    let timeLeft = 0;

    // --- 1. CAMPANILLA POMODORO (RETROALIMENTACIÓN AGRADABLE) ---
    function playChime() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1.5);
        
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1.5);
    }

    // --- 2. RESPIRACIÓN 4-7-8 (USABILIDAD REAL CONTRA ANSIEDAD) ---
    function runBreathingCycle() {
        if(focusView.classList.contains('hidden')) return;

        breatheText.textContent = "Inhala...";
        breatheCircle.className = "breathe-circle inhale";

        breatheTimeout1 = setTimeout(() => {
            if(focusView.classList.contains('hidden')) return;
            breatheText.textContent = "Mantén...";
            breatheCircle.className = "breathe-circle hold";

            breatheTimeout2 = setTimeout(() => {
                if(focusView.classList.contains('hidden')) return;
                breatheText.textContent = "Exhala...";
                breatheCircle.className = "breathe-circle exhale";

                breatheTimeout3 = setTimeout(() => {
                    runBreathingCycle(); // Repetir ciclo
                }, 8000);
            }, 7000);
        }, 4000);
    }

    function stopBreathing() {
        clearTimeout(breatheTimeout1);
        clearTimeout(breatheTimeout2);
        clearTimeout(breatheTimeout3);
        breatheCircle.className = "breathe-circle";
        breatheText.textContent = "Prepárate";
    }

    // --- 3. RELOJ POMODORO FUNCIONAL ---
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
            playChime(); // Suena al iniciar

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
                    playChime(); // Suena al terminar
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
        stopBreathing();
        focusView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    // --- 4. SISTEMA DE DESGLOSE MÁGICO INTELIGENTE ---
    function generateSubtasks(text) {
        const t = text.toLowerCase();
        // Inteligencia basada en palabras clave
        if (t.includes('correr') || t.includes('ejercicio') || t.includes('gimnasio')) {
            return ["Paso 1: Ponte ropa cómoda y zapatillas adecuadas.", "Paso 2: Haz 5 minutos de estiramiento suave.", "Paso 3: Empieza a tu propio ritmo, no te apresures."];
        } else if (t.includes('estudiar') || t.includes('leer') || t.includes('deberes') || t.includes('matemáticas')) {
            return ["Paso 1: Despeja tu escritorio y ten agua cerca.", "Paso 2: Lee el título y haz un resumen mental.", "Paso 3: Haz 15 minutos de lectura sin distracciones."];
        } else if (t.includes('cocinar') || t.includes('comer') || t.includes('almuerzo')) {
            return ["Paso 1: Saca y lava todos los ingredientes necesarios.", "Paso 2: Prepara los utensilios y sartenes.", "Paso 3: Sigue la receta paso a paso y limpia al terminar."];
        } else if (t.includes('limpiar') || t.includes('barrer') || t.includes('cuarto')) {
            return ["Paso 1: Recoge toda la basura y ropa del suelo.", "Paso 2: Limpia las superficies (escritorio, mesas).", "Paso 3: Barre o aspira de adentro hacia la puerta."];
        } else if (t.includes('comprar') || t.includes('supermercado') || t.includes('tienda')) {
            return ["Paso 1: Revisa qué falta y haz una lista escrita.", "Paso 2: Lleva fundas reutilizables y tu billetera.", "Paso 3: Cíñete a la lista para evitar gastos extra."];
        }
        // Desglose genérico si no reconoce la palabra
        return [
            `Paso 1: Identifica qué necesitas para empezar "${text}".`,
            "Paso 2: Dedica solo 5 minutos a hacer la parte más fácil.",
            "Paso 3: Toma un respiro y avanza un poco más."
        ];
    }

    // --- 5. CATEGORIZADOR Y RENDERIZADO (CLARIDAD APLICADA) ---
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
            
            // EL BOTÓN AHORA ES CLARO Y CON TEXTO (Criterio de Claridad)
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
            
            // EVENTO 1: Iniciar Modo Enfoque desde la Tarea
            const btnFocus = div.querySelector('.btn-focus-clear');
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
                    
                    // Inicia el ejercicio de respiración
                    runBreathingCycle(); 
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

    // --- 6. MICRÓFONO (SOLUCIÓN A BRAVE) ---
    btnDictate.addEventListener('click', () => {
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
                window.showToast('Error de red. Revisa los escudos de privacidad de tu navegador.', 'bx-wifi-off');
            } else {
                window.showToast(`Error: ${e.error}`, 'bx-error');
            }
        };
        recognition.start();
    });

    fetchTasks();
});
