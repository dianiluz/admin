/**
 * CUPISSA - Panel Admin
 * Controlador principal de navegación y PWA
 */
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const btnLogout = document.getElementById('btn-logout');

    // 1. Mapeo de Módulos
    const modules = {
        dashboard: window.renderDashboard,
        productos: window.renderProductos,
        pedidos: window.renderPedidos,
        usuarios: window.renderUsuarios,
        marketing: () => window.renderPlaceholder('Marketing'),
        comisiones: () => window.renderPlaceholder('Comisiones'),
        reportes: () => window.renderPlaceholder('Reportes')
    };

    // 2. Lógica de Navegación
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const target = button.getAttribute('data-target');

            // Actualizar UI
            navButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            sectionTitle.textContent = button.textContent;
            
            // Cargar Función del Módulo
            if (modules[target]) {
                modules[target]();
            } else {
                console.error(`Módulo ${target} no encontrado`);
            }
        });
    });

    // 3. Gestión de Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Aquí puedes añadir limpieza de localStorage/sesión
            window.location.href = 'login.html';
        });
    }

    // 4. Inicialización por defecto
    if (window.renderDashboard) {
        window.renderDashboard();
    }

    // 5. Soporte PWA (Instalación)
    let deferredPrompt;
    const btnInstalar = document.getElementById('btn-instalar-pwa');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (btnInstalar) btnInstalar.style.display = 'block';
    });

    if (btnInstalar) {
        btnInstalar.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    btnInstalar.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
    }
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registrado', reg))
            .catch(err => console.warn('Error al registrar SW', err));
    });
}