// DOBLE VALIDACIÓN POR SI FALLA EL HTML
if (!localStorage.getItem('cupissa_admin_session')) {
    window.location.replace('/login.html');
}

// ... aquí sigue el resto de tu código panel-admin.js ...
let usuarioActual = { nombre: "Admin", rol: "ADMIN", email: "admin@cupissa.com" };

if (sessionData) {
    try {
        usuarioActual = JSON.parse(sessionData);
    } catch(e) {
        console.error("Error leyendo sesión.");
    }
}

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
            } else {
                console.error(`Módulo ${target} no encontrado`);
            }
        });
    });

    // Inicialización por defecto
    if (window.renderDashboard) {
        window.renderDashboard();
    } else {
        // Fallback si no carga dashboard
        window.renderPlaceholder = function(nombre) {
            document.getElementById('dynamic-content').innerHTML = `<div class="card"><h2>${nombre}</h2><p>Módulo en desarrollo.</p></div>`;
        }
        window.renderPlaceholder('Dashboard');
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

// --- FUNCIÓN GLOBAL PARA CERRAR SESIÓN ---
window.cerrarSesionAdmin = function() {
    console.log("Cerrando sesión de forma segura...");
    localStorage.removeItem('cupissa_admin_session');
    window.location.replace('login.html');
};

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.warn('Error al registrar SW', err));
    });
}