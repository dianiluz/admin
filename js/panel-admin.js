// panel-admin.js

// --- 1. CONEXIÓN A SUPABASE ---
// La variable 'supabase' ya viene inicializada desde utils.js de forma global
const db = window.supabase; 

// --- 2. CANDADO DE SEGURIDAD ---
// Si no hay sesión, rebota al login inmediatamente
if (!localStorage.getItem('cupissa_admin_session')) {
    window.location.replace('login.html');
}

const sessionData = localStorage.getItem('cupissa_admin_session');
let usuarioActual = { nombre: "Admin", rol: "ADMIN", email: "admin@cupissa.com" };

if (sessionData) {
    try { usuarioActual = JSON.parse(sessionData); } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    
    // INFO DE USUARIO EN CABECERA
    const userInfoDiv = document.querySelector('.user-info');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `<strong>${usuarioActual.nombre}</strong><br><small style="font-size:10px; opacity:0.8; color:#db137a;">${usuarioActual.rol}</small>`;
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const sidebar = document.getElementById('sidebar');
    const btnMenuMobile = document.getElementById('btn-menu-mobile');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // LOGICA MENÚ MÓVIL
    if (btnMenuMobile && sidebar && mobileOverlay) {
        btnMenuMobile.onclick = () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        };
        mobileOverlay.onclick = () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
        };
    }

    // MAPEO DE MÓDULOS (Dashboard, Productos, etc.)
    const modules = {
        dashboard: () => typeof window.renderDashboard === 'function' ? window.renderDashboard() : renderPlaceholder('Dashboard'),
        productos: () => typeof window.renderProductos === 'function' ? window.renderProductos() : renderPlaceholder('Productos'),
        pedidos: () => typeof window.renderPedidos === 'function' ? window.renderPedidos() : renderPlaceholder('Pedidos'),
        usuarios: () => typeof window.renderUsuarios === 'function' ? window.renderUsuarios() : renderPlaceholder('Usuarios'),
        marketing: () => typeof window.renderMarketing === 'function' ? window.renderMarketing() : renderPlaceholder('Marketing'),
        comisiones: () => typeof window.renderComisiones === 'function' ? window.renderComisiones() : renderPlaceholder('Comisiones'), // <-- ¡ACTUALIZADO!
        reportes: () => renderPlaceholder('Reportes')
    };

    function renderPlaceholder(nombre) {
        const dynamicContent = document.getElementById('dynamic-content');
        if (dynamicContent) {
            dynamicContent.innerHTML = `
                <div class="card">
                    <h2 style="color:var(--color-primario); font-family:'Bree Serif';">Módulo: ${nombre}</h2>
                    <p>Conexión exitosa con Supabase. Optimizando vista...</p>
                </div>`;
        }
    }

    // NAVEGACIÓN
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            
            // Estética de botones (Color rosa Cupissa al activar)
            navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Título de sección
            if (sectionTitle) sectionTitle.textContent = e.currentTarget.textContent;
            
            // Carga de módulo
            if (modules[target]) {
                modules[target]();
            }

            // Cerrar menú en móvil tras click
            if (window.innerWidth <= 768 && sidebar && mobileOverlay) {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('active');
            }
        });
    });

    // Cargar Dashboard por defecto al iniciar
    if (modules['dashboard']) modules['dashboard']();
});

// --- 3. GESTIÓN DE PWA Y ACTUALIZACIONES ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("✨ ¡Nueva versión de Cupissa disponible! ¿Actualizar ahora?")) {
                            newWorker.postMessage('SKIP_WAITING');
                        }
                    }
                });
            });
        });
    });
}

// BOTÓN MANUAL DE ACTUALIZACIÓN
const btnActualizar = document.getElementById('btn-actualizar-app');
if (btnActualizar) {
    btnActualizar.addEventListener('click', () => {
        btnActualizar.textContent = "Limpiando caché...";
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        }
        setTimeout(() => window.location.reload(true), 1000);
    });
}

// LOGOUT SEGURO
window.cerrarSesionAdmin = function() {
    localStorage.removeItem('cupissa_admin_session');
    localStorage.clear();
    window.location.replace('login.html');
};

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = window.cerrarSesionAdmin;
}