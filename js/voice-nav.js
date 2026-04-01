// js/voice-nav.js

// Accesibilidad: Función global para leer texto en voz alta
window.readTextAloud = function(text) {
    if ('speechSynthesis' in window) {
        // Detiene cualquier lectura anterior para que no se superpongan los audios
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Buscar voces en español instaladas en el navegador o sistema
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(voice => voice.lang.includes('es'));
        
        // Priorizar voces de alta calidad (Premium, Google, Microsoft) 
        // para que no suene robótico ni molesto (Ayuda cognitiva)
        const premiumVoice = spanishVoices.find(v => 
            v.name.includes('Google') || 
            v.name.includes('Microsoft Sabina') || 
            v.name.includes('Premium')
        );

        // Asignar la mejor voz encontrada
        if (premiumVoice) {
            utterance.voice = premiumVoice;
        } else if (spanishVoices.length > 0) {
            utterance.voice = spanishVoices[0]; // Fallback a la voz por defecto
        }

        // LEER LA VELOCIDAD DESDE LA PÁGINA DE AJUSTES
        // Si el usuario no ha configurado nada, usa 0.9x por defecto (pausado y claro)
        const savedSpeed = localStorage.getItem('voiceSpeed') || 0.9;
        utterance.rate = parseFloat(savedSpeed); 
        utterance.pitch = 1; // Tono natural
        
        // Ejecutar la voz
        window.speechSynthesis.speak(utterance);
    } else {
        // Retroalimentación visual si el navegador no soporta la función
        if (window.showToast) {
            window.showToast('Tu navegador no soporta lectura de voz.', 'bx-error');
        } else {
            console.error("El navegador no soporta speechSynthesis");
        }
    }
};

// Truco de rendimiento: Cargar las voces tan pronto se abre la página
// Esto evita el "silencio" o lag que ocurre la primera vez que se presiona el botón
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => { 
        window.speechSynthesis.getVoices(); 
    };
}
