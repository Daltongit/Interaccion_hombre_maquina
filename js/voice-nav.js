// Accesibilidad: Función global para leer texto en voz alta
window.readTextAloud = function(text) {
    if ('speechSynthesis' in window) {
        // Detiene cualquier lectura anterior
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES'; // Idioma español
        utterance.rate = 0.9; // Velocidad un poco más lenta para mejor comprensión
        
        window.speechSynthesis.speak(utterance);
    } else {
        window.showToast('Tu navegador no soporta lectura de voz.');
    }
};
