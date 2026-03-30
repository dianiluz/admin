// js/panel-admin.js
const db = window.supabase; 

if (!localStorage.getItem('cupissa_admin_session')) {
    window.location.replace('login.html');
}

const sessionData = localStorage.getItem('cupissa_admin_session');
let usuarioActual = { nombre: "Admin", rol: "ADMIN", email: "admin@cupissa.com" };

if (sessionData) {
    try { usuarioActual = JSON.parse(sessionData); } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    const userInfoDiv = document.querySelector('.user-info');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `<strong>${usuarioActual.nombre}</strong><br><small style="font-size:10px; opacity:0.8; color:#db137a;">${usuarioActual.rol}</small>`;
    }

    const logoImg = document.querySelector('.logo-container img');
    if(logoImg) {
        logoImg.src = "https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png";
        logoImg.onerror = () => logoImg.alt = "CUPISSA"; 
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const sidebar = document.getElementById('sidebar');
    const btnMenuMobile = document.getElementById('btn-menu-mobile');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // SEGURIDAD RBAC (Oculta botones no autorizados - Solo ADMIN entra aquí por ahora)
    navButtons.forEach(btn => {
        const rolesPermitidos = (btn.getAttribute('data-roles') || 'ADMIN').split(',');
        if (!rolesPermitidos.includes(usuarioActual.rol) && usuarioActual.rol !== 'ADMIN') {
            btn.style.display = 'none'; 
        }
    });

    document.querySelectorAll('.nav-category').forEach(cat => {
        let tieneBotonesVisibles = false;
        let siguienteElemento = cat.nextElementSibling;
        while(siguienteElemento && siguienteElemento.tagName === 'BUTTON') {
            if(siguienteElemento.style.display !== 'none') tieneBotonesVisibles = true;
            siguienteElemento = siguienteElemento.nextElementSibling;
        }
        if(!tieneBotonesVisibles) cat.style.display = 'none';
    });

    if (btnMenuMobile && sidebar && mobileOverlay) {
        btnMenuMobile.onclick = () => { sidebar.classList.add('open'); mobileOverlay.classList.add('active'); };
        mobileOverlay.onclick = () => { sidebar.classList.remove('open'); mobileOverlay.classList.remove('active'); };
    }

    // MAPA DE MÓDULOS MODO DIOS (NÚCLEO)
    const modules = {
        dashboard: () => typeof window.renderDashboard === 'function' ? window.renderDashboard() : renderPlaceholder('Dashboard Principal'),
        pedidos: () => typeof window.renderPedidos === 'function' ? window.renderPedidos() : renderPlaceholder('Gestión de Pedidos y Ventas'),
        productos: () => typeof window.renderProductos === 'function' ? window.renderProductos() : renderPlaceholder('Catálogo y Variaciones'),
        inventario: () => typeof window.renderInventario === 'function' ? window.renderInventario() : renderPlaceholder('Inventario y Bodega (Auditoría)'),
        logistica: () => typeof window.renderLogistica === 'function' ? window.renderLogistica() : renderPlaceholder('Logística y Despachos'),
        usuarios: () => typeof window.renderUsuarios === 'function' ? window.renderUsuarios() : renderPlaceholder('Directorio y Equipo'),
        finanzas: () => typeof window.renderAuditoriaFinanzas === 'function' ? window.renderAuditoriaFinanzas() : renderPlaceholder('Auditoría Financiera y Cajas'),
        marketing: () => typeof window.renderMarketing === 'function' ? window.renderMarketing() : renderPlaceholder('Marketing y Descuentos'),
        comisiones: () => typeof window.renderComisiones === 'function' ? window.renderComisiones() : renderPlaceholder('Comisiones UGC')
    };

    function renderPlaceholder(nombre) {
        const dynamicContent = document.getElementById('dynamic-content');
        if (dynamicContent) {
            dynamicContent.innerHTML = `
                <div class="card" style="text-align:center; padding: 50px 20px; border-top: 4px solid var(--color-primario);">
                    <h2 style="color:var(--color-primario); font-family:'Bree Serif'; margin-bottom:10px;">Módulo: ${nombre}</h2>
                    <p style="color:var(--color-texto-suave);">Sección en construcción o archivo JS no enlazado.</p>
                </div>`;
        }
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            
            navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (sectionTitle) sectionTitle.textContent = e.currentTarget.textContent.replace(/[^\w\s]/gi, '').trim();
            
            if (modules[target]) modules[target]();

            if (window.innerWidth <= 768 && sidebar && mobileOverlay) {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('active');
            }
        });
    });

    const primerBotonVisible = Array.from(navButtons).find(b => b.style.display !== 'none');
    if (primerBotonVisible) primerBotonVisible.click();
});

if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { window.location.reload(); refreshing = true; }
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("✨ ¡Nueva versión de Cupissa ERP disponible! ¿Actualizar ahora?")) {
                            newWorker.postMessage('SKIP_WAITING');
                        }
                    }
                });
            });
        });
    });
}

const btnActualizar = document.getElementById('btn-actualizar-app');
if (btnActualizar) {
    btnActualizar.addEventListener('click', () => {
        btnActualizar.textContent = "Limpiando...";
        if ('caches' in window) caches.keys().then(names => { for (let name of names) caches.delete(name); });
        setTimeout(() => window.location.reload(true), 1000);
    });
}

window.cerrarSesionAdmin = function() {
    localStorage.removeItem('cupissa_admin_session');
    localStorage.clear();
    window.location.replace('login.html');
};

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.onclick = window.cerrarSesionAdmin;