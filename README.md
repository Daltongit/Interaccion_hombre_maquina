# Sistema de Gestión de Tareas - TaskPro

Diseño de una interfaz de usuario aplicando estrictamente criterios de usabilidad para un sistema de gestión de tareas, enfocado en eficiencia y accesibilidad.

## Criterios de Usabilidad Aplicados (Justificación)

1. **Claridad:** La interfaz utiliza iconos intuitivos de Boxicons acompañados de etiquetas textuales (`aria-labels` en el código) para que los botones sean fáciles de identificar.
2. **Consistencia:** Se implementó el archivo `variables.css` para manejar una paleta de colores de alto contraste coherente (Tema oscuro con acentos en azul y verde) en toda la aplicación.
3. **Eficiencia:** Además del input manual, se integró una **API de Comandos de Voz** (función novedosa) que permite a los usuarios dictar y añadir tareas con un solo clic, reduciendo las interacciones necesarias.
4. **Retroalimentación:** Sistema de notificaciones tipo "Toast" implementado en `feedback.js`. Al completar, añadir o eliminar una tarea, o al usar el micrófono, el sistema muestra mensajes flotantes y cambios de color (bordes gradientes animados) informando al usuario del estado actual.
5. **Accesibilidad:** Diseño de alto contraste (fondo oscuro con letras blancas/grises). Uso de unidades relativas (`rem`) para la tipografía, permitiendo escalar textos.
6. **Facilidad de navegación:** Un menú lateral persistente que indica claramente en qué pantalla se encuentra el usuario (clase `.active`), facilitando moverse entre la lista de tareas y la configuración.

## Instalación
Al estar construido con HTML/CSS/Vanilla JS y recursos en la nube (CDNs), no requiere instalación local de paquetes (como npm). Simplemente se debe abrir el archivo `index.html` en cualquier navegador moderno.