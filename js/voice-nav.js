document.addEventListener('DOMContentLoaded', () => {
    const btnVoice = document.getElementById('btn-voice');
    const voiceStatus = document.getElementById('voice-status');

    // Verificar si el navegador soporta reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES'; // Idioma español
        recognition.continuous = false;

        // Cuando empieza a escuchar
        recognition.onstart = function () {
            btnVoice.classList.add('listening');
            voiceStatus.style.display = 'block';
            voiceStatus.textContent = 'Escuchando... Di la tarea.';
        };

        // Cuando detecta un resultado
        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            // Limpia la frase "añadir" si el usuario la dice
            let cleanTask = transcript.toLowerCase().replace('añadir', '').trim();

            // Capitalizar la primera letra
            cleanTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);

            // Llama a la función global addTask de main.js
            window.addTask(cleanTask);
            showToast(`Voz detectada: "${cleanTask}"`);
        };

        // Cuando termina o hay error
        recognition.onend = function () {
            btnVoice.classList.remove('listening');
            voiceStatus.style.display = 'none';
        };

        recognition.onerror = function (event) {
            showToast('No se pudo reconocer la voz', 'error');
            btnVoice.classList.remove('listening');
            voiceStatus.style.display = 'none';
        };

        // Evento click para activar el micrófono
        btnVoice.addEventListener('click', () => {
            recognition.start();
        });

    } else {
        // Fallback si el navegador no soporta voz (Eficiencia/Accesibilidad)
        btnVoice.style.display = 'none';
        console.log("El navegador no soporta comandos de voz.");
    }
});