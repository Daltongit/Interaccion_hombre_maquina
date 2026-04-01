window.readTextAloud = function(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Buscar voces naturales en español
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(voice => voice.lang.includes('es'));
        
        // Priorizar voces de alta calidad (Premium, Google, Microsoft)
        const premiumVoice = spanishVoices.find(v => 
            v.name.includes('Google') || 
            v.name.includes('Microsoft Sabina') || 
            v.name.includes('Premium')
        );

        if (premiumVoice) {
            utterance.voice = premiumVoice;
        } else if (spanishVoices.length > 0) {
            utterance.voice = spanishVoices[0];
        }

        utterance.rate = 0.95; // Velocidad natural y comprensible
        utterance.pitch = 1;
        
        window.speechSynthesis.speak(utterance);
    } else {
        window.showToast('Tu navegador no soporta lectura de voz.', 'bx-error');
    }
};

// Cargar voces al iniciar para evitar el lag de la primera vez
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
}
