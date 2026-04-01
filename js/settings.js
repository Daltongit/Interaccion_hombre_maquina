document.addEventListener('DOMContentLoaded', () => {
    // 1. MODO OSCURO (Theme Toggle)
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    
    // Leer el tema actual
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        themeToggle.checked = true;
        themeLabel.textContent = 'Modo Oscuro';
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeLabel.textContent = 'Modo Oscuro';
            window.showToast('Modo oscuro activado', 'bx-moon');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeLabel.textContent = 'Modo Claro';
            window.showToast('Modo claro activado', 'bx-sun');
        }
    });

    // 2. TEMPORIZADOR DE ENFOQUE
    const timerInput = document.getElementById('timer-setting');
    const btnSaveTimer = document.getElementById('btn-save-timer');
    
    timerInput.value = localStorage.getItem('focusTimer') || 25;

    btnSaveTimer.addEventListener('click', () => {
        let val = parseInt(timerInput.value);
        if(val < 1 || val > 60) {
            window.showToast('Ingresa un tiempo entre 1 y 60 minutos.', 'bx-error');
            return;
        }
        localStorage.setItem('focusTimer', val);
        window.showToast(`Reloj de enfoque guardado a ${val} min.`, 'bx-check');
    });

    // 3. VELOCIDAD DE VOZ
    const speedSlider = document.getElementById('voice-speed');
    const speedLabel = document.getElementById('speed-label');
    
    speedSlider.value = localStorage.getItem('voiceSpeed') || 0.9;
    speedLabel.textContent = `${speedSlider.value}x`;

    speedSlider.addEventListener('input', () => {
        speedLabel.textContent = `${speedSlider.value}x`;
    });

    speedSlider.addEventListener('change', () => {
        localStorage.setItem('voiceSpeed', speedSlider.value);
        window.showToast(`Velocidad de voz ajustada a ${speedSlider.value}x`, 'bx-volume-low');
        
        // Lectura de prueba
        if (window.readTextAloud) {
            window.readTextAloud("Velocidad de voz ajustada.");
        }
    });
});
