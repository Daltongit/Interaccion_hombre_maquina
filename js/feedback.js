// Función para mostrar mensajes de retroalimentación en pantalla
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    toast.className = 'toast';
    toast.textContent = message;

    // Cambiar color si es un error
    if (type === 'error') {
        toast.style.backgroundColor = 'var(--danger)';
    }

    container.appendChild(toast);

    // Desaparece automáticamente después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}