document.addEventListener('DOMContentLoaded', () => {
    // 1. MODO OSCURO (Theme Toggle)
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
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

    // 2. MODO DISLEXIA / LECTURA FÁCIL
    const dyslexiaToggle = document.getElementById('dyslexia-toggle');
    const dyslexiaLabel = document.getElementById('dyslexia-label');
    const isDyslexia = localStorage.getItem('dyslexiaMode') === 'true';

    if (isDyslexia) {
        dyslexiaToggle.checked = true;
        dyslexiaLabel.textContent = 'Activado';
        document.documentElement.classList.add('dyslexia-mode');
    }

    dyslexiaToggle.addEventListener('change', () => {
        if (dyslexiaToggle.checked) {
            document.documentElement.classList.add('dyslexia-mode');
            localStorage.setItem('dyslexiaMode', 'true');
            dyslexiaLabel.textContent = 'Activado';
            window.showToast('Modo lectura fácil activado', 'bx-text');
        } else {
            document.documentElement.classList.remove('dyslexia-mode');
            localStorage.setItem('dyslexiaMode', 'false');
            dyslexiaLabel.textContent = 'Desactivado';
            window.showToast('Modo lectura fácil desactivado', 'bx-text');
        }
    });

    // 3. ALERTAS VISUALES (SORDERA)
    const visualAlertsToggle = document.getElementById('visual-alerts-toggle');
    const visualAlertsLabel = document.getElementById('visual-alerts-label');
    const hasVisualAlerts = localStorage.getItem('visualAlerts') === 'true';

    if (hasVisualAlerts) {
        visualAlertsToggle.checked = true;
        visualAlertsLabel.textContent = 'Activado';
    }

    visualAlertsToggle.addEventListener('change', () => {
        if (visualAlertsToggle.checked) {
            localStorage.setItem('visualAlerts', 'true');
            visualAlertsLabel.textContent = 'Activado';
            window.showToast('Alertas visuales y hápticas activadas', 'bx-bell');
            // Demostración de la alerta visual al activarla
            document.body.classList.add('screen-flash');
            setTimeout(() => document.body.classList.remove('screen-flash'), 1000);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
            localStorage.setItem('visualAlerts', 'false');
            visualAlertsLabel.textContent = 'Desactivado';
            window.showToast('Alertas visuales desactivadas', 'bx-bell-off');
        }
    });

    // 4. TEMPORIZADOR DE ENFOQUE
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

    // 5. VELOCIDAD DE VOZ
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
    });
});
