// Retroalimentación: Lógica global para los Toasts
window.showToast = function(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    
    // Desaparece después de 3 segundos
    setTimeout(() => { toast.remove(); }, 3000);
};
