// --- 1. CANDADO DE SEGURIDAD ---
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
        userInfoDiv.innerHTML = `<strong>${usuarioActual.nombre}</strong><br><small style="font-size:10px; opacity:0.8;">${usuarioActual.rol}</small>`;
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    
    // ELEMENTOS MENÚ HAMBURGUESA
    const sidebar = document.getElementById('sidebar');
    const btnMenuMobile = document.getElementById('btn-menu-mobile');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // LOGICA ABRIR/CERRAR MENÚ MÓVIL
    if (btnMenuMobile && sidebar && mobileOverlay) {
        btnMenuMobile.addEventListener('click', () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
        });
    }

    // FUNCION FALLBACK (Si un archivo JS no cargó, muestra esto en vez de romperse)
    window.renderPlaceholder = function(nombre) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="card">
                <h2>Módulo: ${nombre}</h2>
                <p>Este módulo está en desarrollo o su archivo JS no cargó correctamente.</p>
            </div>
        `;
    };

    // MAPEO SEGURO DE MÓDULOS
    const modules = {
        dashboard: typeof window.renderDashboard === 'function' ? window.renderDashboard : () => window.renderPlaceholder('Dashboard'),
        productos: typeof window.renderProductos === 'function' ? window.renderProductos : () => window.renderPlaceholder('Productos'),
        pedidos: typeof window.renderPedidos === 'function' ? window.renderPedidos : () => window.renderPlaceholder('Pedidos'),
        usuarios: typeof window.renderUsuarios === 'function' ? window.renderUsuarios : () => window.renderPlaceholder('Usuarios'),
        marketing: () => window.renderPlaceholder('Marketing'),
        comisiones: () => window.renderPlaceholder('Comisiones'),
        reportes: () => window.renderPlaceholder('Reportes')
    };

    // LOGICA DE NAVEGACION
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

            // Ocultar menú automáticamente en móviles al hacer clic en una opción
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('active');
            }
        });
    });

    // INICIAR PRIMER MÓDULO (Dashboard) AL CARGAR
    modules['dashboard']();

    // PWA SOPORTE
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

// LOGOUT
window.cerrarSesionAdmin = function() {
    localStorage.removeItem('cupissa_admin_session');
    localStorage.clear();
    window.location.replace('/login.html');
};

// SERVICE WORKER
// --- LÓGICA DE ACTUALIZACIÓN Y SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // 1. Busca actualizaciones silenciosamente al cargar
            reg.update();

            // 2. Si detecta una nueva versión en el servidor
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Muestra una alerta nativa para actualizar
                        if (confirm("✨ Hay una nueva versión de la App disponible con mejoras. ¿Deseas actualizar ahora?")) {
                            newWorker.postMessage('SKIP_WAITING');
                        }
                    }
                });
            });
        }).catch(err => console.warn('SW no cargado', err));

        // 3. Cuando el nuevo Service Worker toma el control, recarga la página sola
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });
    });
}

// 4. Lógica del Botón Manual "Actualizar App"
const btnActualizar = document.getElementById('btn-actualizar-app');
if (btnActualizar) {
    btnActualizar.addEventListener('click', () => {
        btnActualizar.textContent = "Actualizando...";
        
        // Borramos todo el caché guardado por la PWA
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        }
        
        // Forzamos la recarga limpia desde el servidor
        setTimeout(() => {
            window.location.reload(true);
        }, 500);
    });
}