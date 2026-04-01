import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Conexión a tu Base de Datos
const supabaseUrl = 'https://vsoglrbjadkkagffdzsf.supabase.co';
const supabaseKey = 'sb_publishable_gzLqFJK-EbbKqxxPMrLkAQ_d-qRJnf7';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add');
    const taskList = document.getElementById('task-list');
    const syncStatus = document.getElementById('sync-status');
    
    const btnCamera = document.getElementById('btn-camera');
    const cameraContainer = document.getElementById('camera-container');
    const cameraStream = document.getElementById('camera-stream');
    const btnCapture = document.getElementById('btn-capture');
    const btnCloseCamera = document.getElementById('btn-close-camera');
    const canvas = document.getElementById('canvas');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const photoPreview = document.getElementById('photo-preview');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');

    let currentPhotoBase64 = null;
    let stream = null;

    // --- CÁMARA ---
    btnCamera.addEventListener('click', async () => {
        cameraContainer.classList.remove('hidden');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraStream.srcObject = stream;
        } catch (err) {
            window.showToast('Error: No se pudo acceder a la cámara.');
            cameraContainer.classList.add('hidden');
        }
    });

    btnCapture.addEventListener('click', () => {
        canvas.width = cameraStream.videoWidth;
        canvas.height = cameraStream.videoHeight;
        canvas.getContext('2d').drawImage(cameraStream, 0, 0);
        currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.5); 
        
        photoPreview.src = currentPhotoBase64;
        photoPreviewContainer.classList.remove('hidden');
        
        stopCamera();
        window.showToast('Foto capturada correctamente.');
    });

    btnCloseCamera.addEventListener('click', stopCamera);

    btnRemovePhoto.addEventListener('click', () => {
        currentPhotoBase64 = null;
        photoPreviewContainer.classList.add('hidden');
    });

    function stopCamera() {
        if (stream) stream.getTracks().forEach(track => track.stop());
        cameraContainer.classList.add('hidden');
    }

    // --- SUPABASE Y RENDERIZADO ---
    function updateSyncStatus(text, color) {
        syncStatus.innerHTML = text;
        syncStatus.style.color = color;
    }

    async function fetchTasks() {
        try {
            updateSyncStatus("<i class='bx bx-loader-alt bx-spin'></i> Cargando...", '#4b5563');
            const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
            
            if (error) throw error;
            
            taskList.innerHTML = '';
            if (data.length === 0) {
                taskList.innerHTML = '<p class="empty-state">No hay tareas. ¡Añade tu primera tarea visual!</p>';
            } else {
                data.forEach(task => renderTask(task));
            }
            updateSyncStatus("<i class='bx bx-cloud'></i> Sincronizado", '#065f46');
        } catch (error) {
            console.error(error);
            window.showToast('Error al conectar con la base de datos.');
        }
    }

    function renderTask(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        
        let imgHTML = task.imagen_b64 ? `<img src="${task.imagen_b64}" alt="Imagen de la tarea">` : '';
        
        card.innerHTML = `
            ${imgHTML}
            <p class="task-text">${task.texto}</p>
            <div class="task-actions">
                <button class="btn-secondary btn-small btn-read" aria-label="Leer tarea en voz alta">
                    <i class='bx bx-volume-full'></i> Escuchar
                </button>
                <button class="btn-danger btn-small btn-delete" aria-label="Eliminar tarea">
                    <i class='bx bx-trash'></i> Eliminar
                </button>
            </div>
        `;

        // Uso de la función de voice-nav.js
        card.querySelector('.btn-read').addEventListener('click', () => {
            window.readTextAloud(task.texto);
            window.showToast('Leyendo tarea...');
        });

        // Eliminar tarea
        card.querySelector('.btn-delete').addEventListener('click', async () => {
            card.style.opacity = '0.5';
            await supabase.from('tareas').delete().eq('id', task.id);
            card.remove();
            window.showToast('Tarea eliminada');
        });

        taskList.appendChild(card);
    }

    // Añadir nueva tarea
    btnAdd.addEventListener('click', async () => {
        const text = taskInput.value.trim();
        if (!text && !currentPhotoBase64) {
            window.showToast('Debes escribir una tarea o tomar una foto.');
            return;
        }

        updateSyncStatus("<i class='bx bx-loader-alt bx-spin'></i> Guardando...", '#4b5563');
        btnAdd.disabled = true;

        try {
            const { error } = await supabase.from('tareas').insert([{ 
                texto: text || "Tarea visual (Sin texto añadido)", 
                imagen_b64: currentPhotoBase64 
            }]);

            if (error) throw error;

            window.showToast('Tarea guardada con éxito.');
            taskInput.value = '';
            if (currentPhotoBase64) btnRemovePhoto.click(); 
            fetchTasks();
        } catch (error) {
            console.error(error);
            window.showToast('Error al guardar la tarea.');
        } finally {
            btnAdd.disabled = false;
        }
    });

    // Iniciar carga de tareas
    fetchTasks();
});
