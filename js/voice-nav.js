window.readTextAloud = function(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(voice => voice.lang.includes('es'));
        const premiumVoice = spanishVoices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Microsoft'));

        if (premiumVoice) utterance.voice = premiumVoice;
        else if (spanishVoices.length > 0) utterance.voice = spanishVoices[0];

        const savedSpeed = localStorage.getItem('voiceSpeed') || 0.9;
        utterance.rate = parseFloat(savedSpeed); 
        
        window.speechSynthesis.speak(utterance);
    }
};

if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

document.addEventListener('mouseover', (e) => {
    if(localStorage.getItem('hoverReader') === 'true') {
        const target = e.target.closest('button, a, input, select, .task-item');
        if(target && !target.dataset.read) {
            const textToRead = target.getAttribute('aria-label') || target.innerText || target.placeholder || "Elemento interactivo";
            if(textToRead.trim() !== '') window.readTextAloud(textToRead);
            target.dataset.read = "true";
            target.addEventListener('mouseleave', () => { target.dataset.read = ""; }, {once:true});
        }
    }
});

document.addEventListener('focusin', (e) => {
    if(localStorage.getItem('hoverReader') === 'true') {
        const textToRead = e.target.getAttribute('aria-label') || e.target.innerText || e.target.placeholder;
        if(textToRead) window.readTextAloud(textToRead);
    }
});
