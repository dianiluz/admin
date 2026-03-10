// --- 1. VALIDACIÓN DE SEGURIDAD (CANDADO) ---
const sessionData = localStorage.getItem('cupissa_admin_session');
if (!sessionData) {
    // Si no hay sesión, lo expulsamos inmediatamente antes de que cargue algo
    window.location.href = 'login.html';
    throw new Error("Acceso denegado. Redirigiendo al login...");
}

// Extraemos los datos del usuario logueado para usarlos en el panel
const usuarioActual = JSON.parse(sessionData);

/**
 * CUPISSA - Panel Admin
 * Controlador principal de navegación y PWA
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 2. ACTUALIZAR INFO DEL USUARIO EN LA BARRA SUPERIOR ---
    const userInfoDiv = document.querySelector('.user-info');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `<strong>${usuarioActual.nombre}</strong><br><small style="font-size:10px; opacity:0.8;">${usuarioActual.rol}</small>`;
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const btnLogout = document.getElementById('btn-logout');

    // Mapeo de Módulos
    const modules = {
        dashboard: window.renderDashboard,
        productos: window.renderProductos,
        pedidos: window.renderPedidos,
        usuarios: window.renderUsuarios,
        marketing: () => window.renderPlaceholder('Marketing'),
        comisiones: () => window.renderPlaceholder('Comisiones'),
        reportes: () => window.renderPlaceholder('Reportes')
    };

    // Lógica de Navegación
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const target = button.getAttribute('data-target');

            navButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            sectionTitle.textContent = button.textContent;
            
            if (modules[target]) {
                modules[target]();
            }
        });
    });

    // --- 3. GESTIÓN DE LOGOUT (CERRAR SESIÓN DE VERDAD) ---

    // Inicialización por defecto
    if (window.renderDashboard) {
        window.renderDashboard();
    }

    // Soporte PWA (Instalación)
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
            .catch(err => console.warn('Error al registrar SW', err));
    });
}

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

// --- FUNCIÓN GLOBAL PARA CERRAR SESIÓN ---
window.cerrarSesionAdmin = function() {
    console.log("Cerrando sesión de forma segura...");
    
    // 1. Destruimos la llave de acceso
    localStorage.removeItem('cupissa_admin_session');
    
    // 2. Redirigimos usando replace() 
    // Esto borra el panel del historial del navegador, 
    // así no pueden usar la flecha de "Atrás" para volver a entrar.
    window.location.replace('login.html');
};