document.addEventListener('DOMContentLoaded', () => {
    const setupToggle = (id, labelId, storageKey, activeText, inactiveText, classToToggle, toastIcon) => {
        const toggle = document.getElementById(id);
        const label = document.getElementById(labelId);
        if(!toggle) return;
        const isActive = localStorage.getItem(storageKey) === 'true' || (storageKey === 'theme' && localStorage.getItem('theme') === 'dark');
        
        if(isActive) { toggle.checked = true; label.textContent = activeText; }
        
        toggle.addEventListener('change', () => {
            if(toggle.checked) {
                if(classToToggle === 'theme') { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
                else { document.documentElement.classList.add(classToToggle); localStorage.setItem(storageKey, 'true'); }
                label.textContent = activeText;
                window.showToast(activeText + ' activado', toastIcon);
            } else {
                if(classToToggle === 'theme') { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); }
                else { document.documentElement.classList.remove(classToToggle); localStorage.setItem(storageKey, 'false'); }
                label.textContent = inactiveText;
                window.showToast(inactiveText + ' activado', toastIcon);
            }
        });
    };

    setupToggle('theme-toggle', 'theme-label', 'theme', 'Modo Oscuro', 'Modo Claro', 'theme', 'bx-moon');
    setupToggle('dyslexia-toggle', 'dyslexia-label', 'dyslexiaMode', 'Activado', 'Desactivado', 'dyslexia-mode', 'bx-text');
    setupToggle('zen-toggle', 'zen-label', 'zenMode', 'Activado', 'Desactivado', 'zen-mode', 'bx-hide');
    
    const visualToggle = document.getElementById('visual-alerts-toggle');
    const visualLabel = document.getElementById('visual-alerts-label');
    if(visualToggle) {
        if(localStorage.getItem('visualAlerts') === 'true') { visualToggle.checked = true; visualLabel.textContent = 'Activado'; }
        visualToggle.addEventListener('change', () => {
            localStorage.setItem('visualAlerts', visualToggle.checked);
            visualLabel.textContent = visualToggle.checked ? 'Activado' : 'Desactivado';
            if(visualToggle.checked) {
                document.body.classList.add('screen-flash'); setTimeout(() => document.body.classList.remove('screen-flash'), 1000);
            }
        });
    }

    const hoverToggle = document.getElementById('hover-reader-toggle');
    const hoverLabel = document.getElementById('hover-reader-label');
    if(hoverToggle) {
        if(localStorage.getItem('hoverReader') === 'true') { hoverToggle.checked = true; hoverLabel.textContent = 'Activado'; }
        hoverToggle.addEventListener('change', () => {
            localStorage.setItem('hoverReader', hoverToggle.checked);
            hoverLabel.textContent = hoverToggle.checked ? 'Activado' : 'Desactivado';
            if(hoverToggle.checked && window.readTextAloud) window.readTextAloud("Lector automático activado.");
        });
    }

    const timerInput = document.getElementById('timer-setting');
    const btnSaveTimer = document.getElementById('btn-save-timer');
    if(timerInput && btnSaveTimer) {
        timerInput.value = localStorage.getItem('focusTimer') || 25;
        btnSaveTimer.addEventListener('click', () => {
            let val = parseInt(timerInput.value);
            if(val < 1 || val > 60) return window.showToast('Ingresa un tiempo entre 1 y 60 minutos.', 'bx-error');
            localStorage.setItem('focusTimer', val);
            window.showToast(`Reloj guardado a ${val} min.`, 'bx-check');
        });
    }

    const speedSlider = document.getElementById('voice-speed');
    const speedLabel = document.getElementById('speed-label');
    if(speedSlider && speedLabel) {
        speedSlider.value = localStorage.getItem('voiceSpeed') || 0.9;
        speedLabel.textContent = `${speedSlider.value}x`;
        speedSlider.addEventListener('input', () => speedLabel.textContent = `${speedSlider.value}x`);
        speedSlider.addEventListener('change', () => {
            localStorage.setItem('voiceSpeed', speedSlider.value);
            window.showToast(`Velocidad ajustada a ${speedSlider.value}x`, 'bx-volume-low');
        });
    }
});
