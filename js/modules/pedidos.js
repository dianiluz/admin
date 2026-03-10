window.pedidosGlobales = [];
window.usuariosGlobales = [];
window.variacionesGlobales = []; // Nuevo: para la hoja de variaciones

window.renderPedidos = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Gestión de Pedidos (ERP)</h2>
            <div>
                <button class="btn-secundario" id="btn-recargar-pedidos" style="margin-right: 10px;">↻ Recargar</button>
                <button class="btn-primario" id="btn-crear-pedido">+ Crear Pedido</button>
            </div>
        </div>
        <div class="card">
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                <input type="text" id="buscador-pedidos" class="buscador-panel" placeholder="Buscar por ID, cliente, email o teléfono...">
                <select id="filtro-estado-pedido" class="buscador-panel" style="width: auto;">
                    <option value="">Todos los estados</option>
                    <option value="1">1 - Agendado</option>
                    <option value="2">2 - En fabricación</option>
                    <option value="3">3 - Listo para enviar</option>
                    <option value="4">4 - En camino</option>
                    <option value="5">5 - Entregado</option>
                    <option value="6">6 - Cancelado</option>
                </select>
            </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID Pedido</th>
                            <th>Fechas (Est/Real)</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Pago</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-pedidos-body">
                        <tr><td colspan="7" style="text-align:center; padding: 20px;">Cargando pedidos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-recargar-pedidos').addEventListener('click', () => {
        cargarPedidos();
        cargarUsuarios();
        cargarVariaciones();
    });
    
    document.getElementById('btn-crear-pedido').addEventListener('click', window.abrirModalCrearPedido);
    
    const filtrarPedidos = () => {
        const termino = document.getElementById('buscador-pedidos').value.toLowerCase();
        const estadoFiltro = document.getElementById('filtro-estado-pedido').value;
        
        const filtrados = window.pedidosGlobales.filter(p => {
            const coincideTexto = (p.IDpedido && p.IDpedido.toLowerCase().includes(termino)) ||
                                  (p.cliente && p.cliente.toLowerCase().includes(termino)) ||
                                  (p.usuario_email && p.usuario_email.toLowerCase().includes(termino)) ||
                                  (p.telefono && String(p.telefono).includes(termino));
            const coincideEstado = estadoFiltro === "" || String(p.estado).startsWith(estadoFiltro);
            return coincideTexto && coincideEstado;
        });
        renderizarTablaPedidos(filtrados);
    };

    document.getElementById('buscador-pedidos').addEventListener('input', filtrarPedidos);
    document.getElementById('filtro-estado-pedido').addEventListener('change', filtrarPedidos);

    // Cargas iniciales
    cargarPedidos();
    cargarUsuarios();
    cargarVariaciones();
    
    if (!window.productosGlobales || window.productosGlobales.length === 0) {
        fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerCatalogoBase' })
        }).then(r => r.json()).then(d => { if(d.success) window.productosGlobales = d.productos; }).catch(()=>{});
    }
};

// --- CORRECCIÓN 1: BUSCADOR DE CLIENTES (Faltaban los headers para evitar bloqueo CORS) ---
async function cargarUsuarios() {
    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerTodosUsuarios' })
        });
        const data = await response.json();
        if (data.success && data.usuarios) window.usuariosGlobales = data.usuarios;
    } catch(e) { console.warn("Error al cargar usuarios"); }
}

// Carga de la hoja de variaciones
async function cargarVariaciones() {
    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerVariaciones' }) // Asegúrate de que este action exista en tu Apps Script
        });
        const data = await response.json();
        if (data.success && data.variaciones) window.variacionesGlobales = data.variaciones;
    } catch(e) { console.warn("Error al cargar variaciones"); }
}

async function cargarPedidos() {
    const tbody = document.getElementById('tabla-pedidos-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Cargando pedidos...</td></tr>`;
    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerTodosPedidos' })
        });
        const data = await response.json();
        
        if (data.success && data.pedidos) {
            window.pedidosGlobales = data.pedidos;
            renderizarTablaPedidos(window.pedidosGlobales);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-peligro);">Error: ${data.error}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-peligro);">Error de conexión.</td></tr>`;
    }
}

function renderizarTablaPedidos(pedidos) {
    const tbody = document.getElementById('tabla-pedidos-body');
    tbody.innerHTML = '';
    if (pedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron pedidos.</td></tr>`;
        return;
    }

    pedidos.forEach(ped => {
        const total = Number(ped.total || 0).toLocaleString('es-CO');
        const estadoProd = String(ped.estado || '1');
        
        let textoEstado = ""; let claseColor = "";
        switch(estadoProd) {
            case '1': textoEstado = "Agendado"; claseColor = "estado-1"; break;
            case '2': textoEstado = "Fabricación"; claseColor = "estado-2"; break;
            case '2.1': textoEstado = "Diseño"; claseColor = "estado-2"; break;
            case '2.2': textoEstado = "Taller"; claseColor = "estado-2"; break;
            case '3': textoEstado = "Listo"; claseColor = "estado-3"; break;
            case '4': textoEstado = "En camino"; claseColor = "estado-4"; break;
            case '5': textoEstado = "Entregado"; claseColor = "estado-5"; break;
            case '6': textoEstado = "Cancelado"; claseColor = "estado-6"; break;
            default: textoEstado = "Pendiente"; claseColor = "estado-1"; break;
        }

        const clasePago = String(ped.estado_pago).toUpperCase() === 'CONFIRMADO' ? 'estado-pago-confirmado' : 'estado-pago-pendiente';
        const formatearFecha = (fechaISO) => {
            if (!fechaISO) return '--';
            const d = new Date(fechaISO); return isNaN(d) ? '--' : d.toLocaleDateString('es-CO');
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${ped.IDpedido || 'N/A'}</td>
            <td style="font-size: 12px;">Est: ${formatearFecha(ped.fecha_entrega_estimada)}<br>Real: ${formatearFecha(ped.fecha_entrega_real)}</td>
            <td><div>${ped.cliente || 'Sin Nombre'}</div><div style="font-size: 11px; color: var(--color-texto-suave);">${ped.telefono || ''}</div></td>
            <td>$${total}</td>
            <td class="${clasePago}">${(ped.estado_pago || 'Pendiente').toUpperCase()}</td>
            <td><span class="semaforo-estado ${claseColor}">${textoEstado}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-direction:column;">
                    <button class="btn-accion btn-editar" onclick="window.abrirModalGestionPedido('${ped.IDpedido}')">Gestionar</button>
                    <button class="btn-accion btn-ocultar" onclick="window.generarRemisionPDF('${ped.IDpedido}')">PDF</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- GESTIÓN DE PEDIDO EXISTENTE (Se mantiene igual que la versión anterior) ---
window.abrirModalGestionPedido = function(idPedido) {
    const pedido = window.pedidosGlobales.find(p => p.IDpedido === idPedido);
    if (!pedido) return;

    const anticipo = Number(pedido.valor_anticipo || 0).toLocaleString('es-CO');
    const saldo = Number(pedido.saldo_pendiente || 0).toLocaleString('es-CO');
    const total = Number(pedido.total || 0).toLocaleString('es-CO');
    
    const formatInputDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString); return isNaN(d) ? '' : d.toISOString().split('T')[0];
    };

    let htmlProductos = '';
    if (pedido.productos && pedido.productos.length > 0) {
        pedido.productos.forEach(prod => {
            const precioUnitario = Number(prod.precio || 0).toLocaleString('es-CO');
            let nombreProd = 'Producto Personalizado';
            if (window.productosGlobales && window.productosGlobales.length > 0) {
                const prodRef = window.productosGlobales.find(cat => cat.ref === prod.ref_producto);
                if (prodRef) nombreProd = prodRef['*producto'] || prodRef.nombre;
            }
            htmlProductos += `<tr><td>${prod.ref_producto || ''}</td><td>${nombreProd}</td><td>${prod.cantidad || 1}</td><td>$${precioUnitario}</td></tr>`;
        });
    }

    const modalHtml = `
        <div class="modal-overlay" id="modal-pedido">
            <div class="modal-content">
                <button type="button" class="btn-cerrar-x" id="btn-x-pedido">&times;</button>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2>Gestión de Pedido: ${pedido.IDpedido}</h2>
                    <button class="btn-accion btn-eliminar" id="btn-eliminar-pedido" style="padding: 8px 15px;">🗑 Eliminar Pedido</button>
                </div>
                
                <div class="detalle-pedido-grid">
                    <div class="detalle-seccion">
                        <h3>Información de Pago y Fechas</h3>
                        <p><strong>Método:</strong> ${pedido.metodo_pago || ''}</p>
                        <p><strong>Total Pedido:</strong> $${total} | <strong>Saldo:</strong> $${saldo}</p>
                        
                        <div style="margin-top: 15px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; border: 1px solid #10b981;">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor:pointer;">
                                <input type="checkbox" id="check-pago-confirmado" ${String(pedido.estado_pago).toUpperCase() === 'CONFIRMADO' ? 'checked' : ''}>
                                Pago Verificado y en Cuentas
                            </label>
                            <div class="drop-zone" id="drop-zone-soporte" style="margin-top: 10px; padding: 15px;">
                                <p style="color: var(--color-texto-suave); font-size: 12px; margin:0;">Arrastra soporte de pago aquí o clic para subir</p>
                                <input type="file" id="file-soporte-pago" accept="image/*,application/pdf" style="display:none;">
                                <div id="preview-soporte" style="margin-top: 5px; font-size: 12px; font-weight: 600; color: var(--color-exito);"></div>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; margin-top: 15px;">
                            <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Fecha Est. Entrega:</label><input type="date" id="fecha-est" value="${formatInputDate(pedido.fecha_entrega_estimada)}" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Fecha Real Entregado:</label><input type="date" id="fecha-real" value="${formatInputDate(pedido.fecha_entrega_real)}" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;"></div>
                        </div>
                    </div>

                    <div class="detalle-seccion">
                        <h3>Estado y Logística</h3>
                        <form id="form-actualizar-pedido" style="display:flex; flex-direction:column; gap:10px;">
                            <input type="hidden" id="gestion-id-pedido" value="${pedido.IDpedido}">
                            <div>
                                <label style="font-size:12px; font-weight:600;">Estado General</label>
                                <select id="gestion-estado-prod" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;">
                                    <option value="1" ${String(pedido.estado) === '1' ? 'selected' : ''}>1 - Agendado</option>
                                    <option value="2" ${String(pedido.estado) === '2' ? 'selected' : ''}>2 - En fabricación</option>
                                    <option value="2.1" ${String(pedido.estado) === '2.1' ? 'selected' : ''}>↳ 2.1 - Diseño (Producción)</option>
                                    <option value="2.2" ${String(pedido.estado) === '2.2' ? 'selected' : ''}>↳ 2.2 - Taller (Producción)</option>
                                    <option value="3" ${String(pedido.estado) === '3' ? 'selected' : ''}>3 - Listo para enviar</option>
                                    <option value="4" ${String(pedido.estado) === '4' ? 'selected' : ''}>4 - En camino</option>
                                    <option value="5" ${String(pedido.estado) === '5' ? 'selected' : ''}>5 - Entregado</option>
                                    <option value="6" ${String(pedido.estado) === '6' ? 'selected' : ''}>6 - Cancelado</option>
                                </select>
                            </div>
                            <div><label style="font-size:12px; font-weight:600;">Transportadora</label><input type="text" id="gestion-transportadora" value="${pedido.transportadora || ''}" placeholder="Ej. Interrapidisimo" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div><label style="font-size:12px; font-weight:600;">Guía / Rastreo</label><input type="text" id="gestion-guia" value="${pedido.guia || ''}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div class="modal-actions" style="margin-top:10px;"><button type="submit" class="btn-primario" style="width:100%;">Guardar Cambios</button></div>
                        </form>
                    </div>
                </div>

                <div class="detalle-seccion">
                    <h3>Detalle de Productos</h3>
                    <table class="tabla-productos-pedido">
                        <thead><tr><th>Referencia</th><th>Producto</th><th>Cant</th><th>V. Unitario</th></tr></thead>
                        <tbody>${htmlProductos}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('modal-pedido');
    const cerrar = () => modal.remove();
    document.getElementById('btn-x-pedido').addEventListener('click', cerrar);
    
    document.getElementById('btn-eliminar-pedido').addEventListener('click', async () => {
        if (confirm(`¿Estás 100% segura de eliminar el pedido ${pedido.IDpedido}? Esta acción no se puede deshacer.`)) {
            try {
                const response = await fetch(CUPISSA_CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'eliminarPedido', id_pedido: pedido.IDpedido }) });
                const data = await response.json();
                if (data.success) { window.mostrarToast("Pedido eliminado correctamente.", "exito"); cerrar(); cargarPedidos(); }
            } catch (error) { window.mostrarToast("Error de conexión al eliminar.", "error"); }
        }
    });

    const dropZone = document.getElementById('drop-zone-soporte');
    const fileInput = document.getElementById('file-soporte-pago');
    const previewContainer = document.getElementById('preview-soporte');
    let soporteBase64 = null; let mimeTypeSoporte = null; let nombreArchivoSoporte = null;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) procesarArchivoSoporte(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) procesarArchivoSoporte(e.target.files[0]); });

    function procesarArchivoSoporte(file) {
        mimeTypeSoporte = file.type; nombreArchivoSoporte = file.name;
        const reader = new FileReader();
        reader.onload = (event) => { soporteBase64 = event.target.result.split(',')[1]; previewContainer.textContent = `✅ Archivo cargado: ${file.name}`; };
        reader.readAsDataURL(file);
    }

    document.getElementById('form-actualizar-pedido').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]'); btnSubmit.textContent = "Actualizando..."; btnSubmit.disabled = true;
        const payload = {
            action: 'actualizarEstadoPedido', id_pedido: document.getElementById('gestion-id-pedido').value,
            estado: document.getElementById('gestion-estado-prod').value, guia: document.getElementById('gestion-guia').value,
            transportadora: document.getElementById('gestion-transportadora').value, fecha_estimada: document.getElementById('fecha-est').value,
            fecha_real: document.getElementById('fecha-real').value, estado_pago: document.getElementById('check-pago-confirmado').checked ? "CONFIRMADO" : "PENDIENTE",
            soporte_pago: soporteBase64 ? { data: soporteBase64, mimeType: mimeTypeSoporte, name: nombreArchivoSoporte } : null
        };

        try {
            const response = await fetch(CUPISSA_CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const data = await response.json();
            if (data.success) { window.mostrarToast("Pedido actualizado.", "exito"); cerrar(); cargarPedidos(); }
            else { btnSubmit.disabled = false; }
        } catch (error) { btnSubmit.disabled = false; }
    });
};

// --- CREACIÓN DE PEDIDO ERP (NUEVO) ---
window.abrirModalCrearPedido = function() {
    const modalHtml = `
        <div class="modal-overlay" id="modal-crear-pedido">
            <div class="modal-content" style="max-width: 1100px;">
                <button type="button" class="btn-cerrar-x" id="btn-x-crear-pedido">&times;</button>
                <h2 style="margin-bottom: 20px; color: var(--color-primario);">Crear Nuevo Pedido ERP</h2>
                
                <form id="form-crear-pedido-erp">
                    <div class="detalle-seccion" style="margin-bottom: 20px; background:var(--color-fondo); padding:15px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--color-borde); padding-bottom: 10px; margin-bottom: 15px;">
                            <h3>Datos del Cliente</h3>
                            <div style="display:flex; gap:15px; align-items:center;">
                                <div style="position:relative; width:250px;">
                                    <input type="text" id="erp-buscador-cliente" placeholder="Buscar por email o nombre..." style="width:100%; padding:6px; border-radius:4px; border:1px solid #ccc;" autocomplete="off">
                                    <div id="erp-res-clientes" class="resultados-flotantes" style="display:none; width:100%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                                </div>
                                <label style="font-size:12px; cursor:pointer; color:var(--color-exito); font-weight:600;">
                                    <input type="checkbox" id="erp-guardar-cliente" checked> Guardar / Enviar Bienvenida
                                </label>
                            </div>
                        </div>
                        <div class="form-grid">
                            <div class="form-group"><label>CC / NIT</label><input type="text" id="erp-cc"></div>
                            <div class="form-group"><label>Nombre Completo</label><input type="text" id="erp-nombre" required></div>
                            <div class="form-group"><label>Email</label><input type="email" id="erp-email" required></div>
                            <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="text" id="erp-telefono" required></div>
                            <div class="form-group"><label>Ciudad</label><input type="text" id="erp-ciudad" class="calc-envio" placeholder="Ej. Barranquilla" required></div>
                            <div class="form-group"><label>Departamento</label><input type="text" id="erp-departamento" readonly style="background:#e2e8f0; font-weight:600;"></div>
                            
                            <div class="form-group" style="position:relative;">
                                <label>Barrio (Buscar local)</label>
                                <input type="text" id="erp-barrio" class="calc-envio" autocomplete="off" required>
                                <div id="erp-res-barrios" class="resultados-flotantes" style="display:none; width:100%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                            </div>
                            
                            <div class="form-group"><label>Dirección Específica</label><input type="text" id="erp-direccion" required></div>
                        </div>
                    </div>

                    <div class="detalle-seccion" style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--color-borde); padding-bottom: 5px; margin-bottom: 10px;">
                            <h3>Productos</h3>
                            <button type="button" class="btn-accion btn-editar" id="btn-add-prod-erp">+ Agregar Fila</button>
                        </div>
                        <table class="tabla-variaciones" style="width:100%;">
                            <thead>
                                <tr>
                                    <th style="width:30%">Ref / Producto (Minatura)</th>
                                    <th style="width:25%">Variación (Buscar en Hoja)</th>
                                    <th style="width:10%">Cant.</th>
                                    <th style="width:15%">Precio Final ($)</th>
                                    <th style="width:10%; text-align:center;">Guardar Catálogo</th>
                                    <th style="width:5%">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-productos-erp"></tbody>
                        </table>
                    </div>

                    <div class="detalle-seccion" style="margin-bottom: 20px; display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        
                        <div style="background: var(--color-fondo); padding: 15px; border-radius: 8px;">
                            <h4 style="margin-bottom: 10px;">Logística y Método de Pago</h4>
                            <div class="form-group" style="margin-bottom:10px;" id="erp-transportadora-container">
                                <label style="color:var(--color-advertencia);">Transportadora (Envío Nacional)</label>
                                <input type="text" id="erp-transportadora" placeholder="Ej. Interrapidisimo, Envía">
                            </div>
                            <div class="form-group" style="margin-bottom:10px;">
                                <label>Valor de Envío / Domicilio ($)</label>
                                <input type="number" id="erp-envio" value="0" min="0" class="calc-trigger">
                            </div>
                            <div class="form-group" style="margin-bottom:10px;">
                                <label>Método de Pago</label>
                                <select id="erp-metodo-pago" class="calc-trigger">
                                    <option value="Transferencia">Transferencia Directa</option>
                                    <option value="Wompi">Wompi (+2.65% y $700)</option>
                                    <option value="Addi">Addi (Cupissa asume comisión)</option>
                                    <option value="Contraentrega">Contraentrega Efectivo</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:10px;">
                                <label>Tipo de Abono</label>
                                <select id="erp-tipo-abono" class="calc-trigger">
                                    <option value="100">100% (Pago Total)</option>
                                    <option value="50">50% (Mitad)</option>
                                    <option value="20">20% (Anticipo Mínimo)</option>
                                </select>
                            </div>
                        </div>

                        <div style="background: rgba(219, 19, 122, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(219, 19, 122, 0.2);">
                            <h4 style="margin-bottom: 10px; color: var(--color-primario);">Resumen Financiero</h4>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Subtotal Productos:</span> <strong id="erp-lbl-subtotal">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Envío:</span> <strong id="erp-lbl-envio">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: var(--color-advertencia);">
                                <span>Comisión Pasarela (A cargo del cliente):</span> <strong id="erp-lbl-comision">$0</strong>
                            </div>
                            <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--color-borde);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; font-size: 16px;">
                                <span><strong>Total Pedido:</strong></span> <strong id="erp-lbl-total" style="color:var(--color-primario);">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Valor a Pagar / Anticipo:</span> <strong id="erp-lbl-anticipo">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Saldo Pendiente:</span> <strong id="erp-lbl-saldo" style="color: var(--color-peligro);">$0</strong>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secundario" id="btn-cerrar-erp">Cancelar</button>
                        <button type="submit" class="btn-primario">Crear Pedido Oficial</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('modal-crear-pedido');
    const cerrar = () => modal.remove();
    document.getElementById('btn-x-crear-pedido').addEventListener('click', cerrar);
    document.getElementById('btn-cerrar-erp').addEventListener('click', cerrar);

    // AUTOCOMPLETADO DE CLIENTES
    const buscadorCliente = document.getElementById('erp-buscador-cliente');
    const resClientes = document.getElementById('erp-res-clientes');
    buscadorCliente.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        resClientes.innerHTML = '';
        if(val.length < 3) { resClientes.style.display = 'none'; return; }
        
        const matches = (window.usuariosGlobales || []).filter(u => 
            (u.email && u.email.toLowerCase().includes(val)) || 
            (u.nombre && u.nombre.toLowerCase().includes(val))
        ).slice(0, 5);

        if(matches.length > 0) {
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'item-resultado'; div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong>${m.nombre}</strong><br><small>${m.email}</small>`;
                div.onclick = () => {
                    document.getElementById('erp-cc').value = m.cc || '';
                    document.getElementById('erp-nombre').value = m.nombre || '';
                    document.getElementById('erp-email').value = m.email || '';
                    document.getElementById('erp-telefono').value = m.telefono || '';
                    document.getElementById('erp-ciudad').value = m.ciudad || '';
                    document.getElementById('erp-barrio').value = m.barrio || '';
                    document.getElementById('erp-direccion').value = m.direccion || '';
                    document.getElementById('erp-guardar-cliente').checked = false; // Ya existe, no enviar correo de nuevo ni guardarlo como nuevo
                    resClientes.style.display = 'none';
                    buscadorCliente.value = '';
                    calcularEnvioLocal();
                };
                resClientes.appendChild(div);
            });
            resClientes.style.display = 'block';
        } else { resClientes.style.display = 'none'; }
    });

    // CORRECCIÓN 2: AUTOCOMPLETADO DE BARRIOS LOCALES
    const inputBarrio = document.getElementById('erp-barrio');
    const resBarrios = document.getElementById('erp-res-barrios');
    inputBarrio.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        resBarrios.innerHTML = '';
        if(val.length < 2 || !window.BARRIOS_METRO) { resBarrios.style.display = 'none'; return; }
        
        const matches = window.BARRIOS_METRO.filter(b => b.n.toLowerCase().includes(val)).slice(0, 8);
        if(matches.length > 0) {
            matches.forEach(m => {
                const div = document.createElement('div');
                div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `${m.n} <small style="color:var(--color-texto-suave);">(${m.m})</small>`;
                div.onclick = () => {
                    inputBarrio.value = m.n;
                    document.getElementById('erp-ciudad').value = m.m; // Autocompleta la ciudad también
                    resBarrios.style.display = 'none';
                    calcularEnvioLocal();
                };
                resBarrios.appendChild(div);
            });
            resBarrios.style.display = 'block';
        } else { resBarrios.style.display = 'none'; }
    });
    // Ocultar resultados al hacer click fuera
    document.addEventListener('click', (e) => {
        if(!inputBarrio.contains(e.target)) resBarrios.style.display = 'none';
        if(!buscadorCliente.contains(e.target)) resClientes.style.display = 'none';
    });

    // CÁLCULO DE ENVÍO LOCAL, DEPARTAMENTO Y VALIDACIÓN DE CC
    const calcularEnvioLocal = () => {
        const ciudad = document.getElementById('erp-ciudad').value.trim().toUpperCase();
        const barrio = document.getElementById('erp-barrio').value.trim().toUpperCase();
        const locales = ["BARRANQUILLA", "SOLEDAD", "MALAMBO", "GALAPA", "PUERTO COLOMBIA"];
        const contTransp = document.getElementById('erp-transportadora-container');
        const ccInput = document.getElementById('erp-cc');

        let deptEncontrado = "";
        for (const [dept, ciudades] of Object.entries(window.MUNICIPIOS || {})) {
            if (ciudades.map(c=>c.toUpperCase()).includes(ciudad)) { deptEncontrado = dept; break; }
        }
        document.getElementById('erp-departamento').value = deptEncontrado;

        // CORRECCIÓN 3 Y 5: Lógica de CC Obligatoria y Transportadora
        if (locales.includes(ciudad)) {
            contTransp.style.display = 'none';
            ccInput.required = false; // Local = No obligatorio
            if ((ciudad === "BARRANQUILLA" || ciudad === "SOLEDAD") && barrio !== "") {
                const b = (window.BARRIOS_METRO || []).find(x => x.n.toUpperCase() === barrio && x.m === ciudad);
                document.getElementById('erp-envio').value = b ? b.p : 15000;
            } else {
                document.getElementById('erp-envio').value = 15000;
            }
        } else if (ciudad !== "") {
            contTransp.style.display = 'block';
            ccInput.required = true; // Nacional = Obligatorio para la transportadora
        }
        recalcularTotales();
    };

    document.querySelectorAll('.calc-envio').forEach(el => el.addEventListener('blur', calcularEnvioLocal));

    const tbodyProd = document.getElementById('tbody-productos-erp');

    const recalcularTotales = () => {
        let subtotalProd = 0;
        tbodyProd.querySelectorAll('tr').forEach(tr => {
            const cant = Number(tr.querySelector('.prod-cant').value) || 0;
            const precio = Number(tr.querySelector('.prod-precio').value) || 0;
            subtotalProd += (cant * precio);
        });

        const envio = Number(document.getElementById('erp-envio').value) || 0;
        const metodo = document.getElementById('erp-metodo-pago').value;
        const abonoPct = Number(document.getElementById('erp-tipo-abono').value) || 100;

        let baseParaComision = subtotalProd + envio;
        let comision = 0;

        // Wompi = Cliente asume +2.65% y $700 + IVA. Addi = Cero comisión para el cliente.
        if (metodo === 'Wompi') {
            const comisionWompiBase = (baseParaComision * 0.0265) + 700;
            comision = comisionWompiBase + (comisionWompiBase * 0.19);
        }

        const totalFinal = baseParaComision + comision;
        const valorAbono = totalFinal * (abonoPct / 100);
        const saldo = totalFinal - valorAbono;

        document.getElementById('erp-lbl-subtotal').textContent = `$${Math.round(subtotalProd).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-envio').textContent = `$${Math.round(envio).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-comision').textContent = `$${Math.round(comision).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-total').textContent = `$${Math.round(totalFinal).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-anticipo').textContent = `$${Math.round(valorAbono).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-saldo').textContent = `$${Math.round(saldo).toLocaleString('es-CO')}`;
    };

    // CORRECCIÓN 4: AGREGAR FILA CON MINIATURAS Y BUSCADOR DE VARIACIONES
    const agregarFilaProd = () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="position:relative;">
                    <input type="text" class="prod-buscador" placeholder="Buscar / Crear" required style="width:100%; padding:4px;">
                    <div class="res-prod-flotante resultados-flotantes" style="display:none; width:150%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:250px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                    <input type="hidden" class="prod-ref" value="CUSTOM">
                    <input type="hidden" class="prod-nombre">
                </div>
            </td>
            <td>
                <div style="position:relative;">
                    <input type="text" class="prod-variacion" placeholder="Ej. Talla / Color" style="width:100%; padding:4px;" autocomplete="off">
                    <div class="res-var-flotante resultados-flotantes" style="display:none; width:150%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                </div>
            </td>
            <td><input type="number" class="prod-cant calc-trigger" value="1" min="1" required style="width:100%; padding:4px;"></td>
            <td><input type="number" class="prod-precio calc-trigger" value="0" min="0" required style="width:100%; padding:4px;" title="Se auto-sumará el valor de la variación"></td>
            <td style="text-align:center;"><input type="checkbox" class="prod-guardar-cat" title="Agrega el producto al catálogo general"></td>
            <td style="text-align:center;"><button type="button" class="btn-accion btn-eliminar btn-del-prod-erp">X</button></td>
        `;
        tbodyProd.appendChild(tr);
        
        const buscadorProd = tr.querySelector('.prod-buscador');
        const resListProd = tr.querySelector('.res-prod-flotante');
        const inpRef = tr.querySelector('.prod-ref');
        const inpNombre = tr.querySelector('.prod-nombre');
        const inpPrecio = tr.querySelector('.prod-precio');
        
        const buscadorVar = tr.querySelector('.prod-variacion');
        const resListVar = tr.querySelector('.res-var-flotante');

        // Autocompletado Productos (Con Miniaturas)
        buscadorProd.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            resListProd.innerHTML = ''; inpNombre.value = e.target.value; 
            if(val.length < 2) { resListProd.style.display = 'none'; return; }
            
            const matches = (window.productosGlobales || []).filter(p => 
                (p.nombre && p.nombre.toLowerCase().includes(val)) || (p.ref && p.ref.toLowerCase().includes(val))
            ).slice(0, 10);

            if(matches.length > 0) {
                matches.forEach(m => {
                    // Procesar la imagen (si existe) para la miniatura
                    let urlImg = (m.imagenurl || '').split('|')[0].trim() || 'https://via.placeholder.com/30x30?text=CUP';
                    if (urlImg.startsWith('assets/')) urlImg = '/' + urlImg;

                    const div = document.createElement('div');
                    div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                    
                    // Diseño con imagen en miniatura
                    div.innerHTML = `
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${urlImg}" style="width:35px; height:35px; object-fit:cover; border-radius:4px; border:1px solid #ccc;">
                            <div>
                                <strong>${m.ref}</strong> - ${m['*producto'] || m.nombre}<br>
                                <small style="color:var(--color-primario); font-weight:600;">$${Number(m['*precio_base']).toLocaleString('es-CO')}</small>
                            </div>
                        </div>
                    `;
                    div.onclick = () => {
                        buscadorProd.value = `${m.ref} - ${m['*producto'] || m.nombre}`;
                        inpRef.value = m.ref;
                        inpNombre.value = m['*producto'] || m.nombre;
                        inpPrecio.value = m['*precio_base'] || 0;
                        tr.querySelector('.prod-guardar-cat').checked = false; // Si ya existe en bd
                        resListProd.style.display = 'none';
                        recalcularTotales();
                    };
                    resListProd.appendChild(div);
                });
                resListProd.style.display = 'block';
            } else { resListProd.style.display = 'none'; }
        });

        // Autocompletado Variaciones (Busca en la hoja global de variaciones)
        buscadorVar.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            resListVar.innerHTML = ''; 
            if(val.length < 1 || !window.variacionesGlobales) { resListVar.style.display = 'none'; return; }
            
            // Busca coincidencias en la variable global (asumiendo que tiene propiedades valor o nombre)
            const matches = window.variacionesGlobales.filter(v => 
                (v.valor && v.valor.toLowerCase().includes(val)) || 
                (v.nombre && v.nombre.toLowerCase().includes(val)) ||
                (v.variacion && v.variacion.toLowerCase().includes(val))
            ).slice(0, 6);

            if(matches.length > 0) {
                matches.forEach(m => {
                    const nombreVar = m.valor || m.nombre || m.variacion;
                    const incremento = Number(m.incremento || m.precio || 0);
                    const div = document.createElement('div');
                    div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                    div.innerHTML = `<strong>${nombreVar}</strong> <small style="color:var(--color-exito);">+ $${incremento.toLocaleString('es-CO')}</small>`;
                    
                    div.onclick = () => {
                        buscadorVar.value = nombreVar;
                        // Suma automáticamente el incremento al precio base que tenga el input
                        inpPrecio.value = Number(inpPrecio.value) + incremento;
                        resListVar.style.display = 'none';
                        recalcularTotales();
                    };
                    resListVar.appendChild(div);
                });
                resListVar.style.display = 'block';
            } else { resListVar.style.display = 'none'; }
        });

        // Ocultar al hacer clic por fuera
        document.addEventListener('click', (e) => {
            if(!buscadorProd.contains(e.target)) resListProd.style.display = 'none';
            if(!buscadorVar.contains(e.target)) resListVar.style.display = 'none';
        });

        tr.querySelector('.btn-del-prod-erp').addEventListener('click', () => { tr.remove(); recalcularTotales(); });
        tr.querySelectorAll('.calc-trigger').forEach(input => input.addEventListener('input', recalcularTotales));
    };

    document.querySelectorAll('#modal-crear-pedido .calc-trigger').forEach(el => el.addEventListener('input', recalcularTotales));
    document.querySelectorAll('#modal-crear-pedido .calc-trigger').forEach(el => el.addEventListener('change', recalcularTotales));
    document.getElementById('btn-add-prod-erp').addEventListener('click', agregarFilaProd);
    agregarFilaProd();

    document.getElementById('form-crear-pedido-erp').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productosPedido = [];
        tbodyProd.querySelectorAll('tr').forEach(tr => {
            let nombreProd = tr.querySelector('.prod-nombre').value;
            const variacion = tr.querySelector('.prod-variacion').value;
            if(variacion) nombreProd += ` (${variacion})`;

            productosPedido.push({
                ref: tr.querySelector('.prod-ref').value,
                nombre: nombreProd,
                cantidad: Number(tr.querySelector('.prod-cant').value),
                precio: Number(tr.querySelector('.prod-precio').value),
                guardar_en_catalogo: tr.querySelector('.prod-guardar-cat').checked
            });
        });

        if(productosPedido.length === 0) {
            window.mostrarToast("Agrega al menos un producto al pedido.", "error"); return;
        }

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.textContent = "Procesando..."; btnSubmit.disabled = true;

        const payload = {
            action: 'crearPedidoERP',
            enviar_correo_bienvenida: document.getElementById('erp-guardar-cliente').checked, // 2. CORREO BIENVENIDA
            cliente: {
                nuevo: document.getElementById('erp-guardar-cliente').checked,
                cc: document.getElementById('erp-cc').value,
                nombre: document.getElementById('erp-nombre').value,
                email: document.getElementById('erp-email').value,
                telefono: document.getElementById('erp-telefono').value,
                ciudad: document.getElementById('erp-ciudad').value,
                departamento: document.getElementById('erp-departamento').value,
                barrio: document.getElementById('erp-barrio').value,
                direccion: document.getElementById('erp-direccion').value
            },
            pedido: {
                transportadora: document.getElementById('erp-transportadora').value,
                envio: Number(document.getElementById('erp-envio').value),
                metodo_pago: document.getElementById('erp-metodo-pago').value,
                abono_pct: Number(document.getElementById('erp-tipo-abono').value),
                subtotal_str: document.getElementById('erp-lbl-subtotal').textContent,
                comision_str: document.getElementById('erp-lbl-comision').textContent,
                total_str: document.getElementById('erp-lbl-total').textContent,
                anticipo_str: document.getElementById('erp-lbl-anticipo').textContent,
                saldo_str: document.getElementById('erp-lbl-saldo').textContent
            },
            productos: productosPedido
        };

        try {
            const response = await fetch(CUPISSA_CONFIG.API_URL, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                window.mostrarToast("Pedido ERP creado con éxito.", "exito");
                cerrar(); cargarPedidos();
            } else {
                window.mostrarToast("Error: " + data.error, "error");
                btnSubmit.textContent = "Crear Pedido Oficial"; btnSubmit.disabled = false;
            }
        } catch (error) {
            window.mostrarToast("Error de conexión al crear.", "error");
            btnSubmit.textContent = "Crear Pedido Oficial"; btnSubmit.disabled = false;
        }
    });
};

window.generarRemisionPDF = async function(idPedido) {
    const pedido = window.pedidosGlobales.find(p => p.IDpedido === idPedido);
    if (!pedido || !window.jspdf) { window.mostrarToast("Error PDF", "error"); return; }
    if (!window.productosGlobales || window.productosGlobales.length === 0) {
        try {
            const resp = await fetch(CUPISSA_CONFIG.API_URL, {
                method: 'POST', body: JSON.stringify({ action: 'obtenerCatalogoBase' })
            });
            const dataCatalog = await resp.json();
            if (dataCatalog.success && dataCatalog.productos) window.productosGlobales = dataCatalog.productos;
        } catch (e) { }
    }
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    let logoBase64 = null;
    try {
        logoBase64 = await new Promise((resolve) => {
            const img = new Image(); img.crossOrigin = "Anonymous"; img.src = "/assets/logo.png"; 
            img.onload = () => {
                const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0); resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(null);
        });
    } catch (e) { }

    if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 15, 45, 15);
    else { doc.setFontSize(22); doc.setTextColor(219, 19, 122); doc.text("CUPISSA", 14, 25); }
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text("CUPISSA SAS | NIT. 901725692", 14, 35);
    doc.text("BARRANQUILLA, ATLÁNTICO", 14, 40); doc.text("+57 314 767 1380 | contacto@cupissa.com", 14, 45);
    doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("REMISIÓN DE PEDIDO", 120, 25);
    doc.setFontSize(12); doc.text(`N°: ${pedido.IDpedido}`, 120, 32);
    doc.setFont("helvetica", "normal");
    const fecha = pedido.fecha_creacion ? new Date(pedido.fecha_creacion).toLocaleDateString('es-CO') : '';
    doc.text(`Fecha Orden: ${fecha}`, 120, 39);
    doc.setDrawColor(219, 19, 122); doc.setLineWidth(0.5); doc.line(14, 50, 196, 50);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Datos del Cliente:", 14, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${pedido.cliente || ''}`, 14, 67); doc.text(`Teléfono: ${pedido.telefono || ''}`, 14, 73);
    doc.text(`Email: ${pedido.usuario_email || ''}`, 14, 79); doc.text(`Dirección: ${pedido.dirección || ''}`, 14, 85);
    doc.setFont("helvetica", "bold"); doc.text("Logística de Envío:", 120, 60); doc.setFont("helvetica", "normal");
    doc.text(`Transportadora: ${pedido.transportadora || 'N/A'}`, 120, 67);
    doc.text(`Guía: ${pedido.guia || 'Pendiente'}`, 120, 73);
    doc.text(`Estado Pago: ${(pedido.estado_pago || 'Pendiente').toUpperCase()}`, 120, 79);

    const headers = [["Referencia", "Producto", "Cant.", "Vr. Unitario", "Subtotal"]]; const data = [];
    if (pedido.productos) {
        pedido.productos.forEach(p => {
            const precioU = Number(p.precio || 0); const cant = Number(p.cantidad || 1);
            let nombreProd = 'Producto Personalizado';
            if (window.productosGlobales && window.productosGlobales.length > 0) {
                const prodRef = window.productosGlobales.find(cat => cat.ref === p.ref_producto);
                if (prodRef) nombreProd = prodRef['*producto'] || prodRef.nombre;
            }
            data.push([
                p.ref_producto || 'N/A', nombreProd, cant.toString(),
                `$${precioU.toLocaleString('es-CO')}`, `$${(precioU * cant).toLocaleString('es-CO')}`
            ]);
        });
    }

    doc.autoTable({
        startY: 95, head: headers, body: data, theme: 'striped', headStyles: { fillColor: [219, 19, 122] },
        styles: { font: 'helvetica', fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY || 95;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Anticipo: $${Number(pedido.valor_anticipo || 0).toLocaleString('es-CO')}`, 130, finalY + 10);
    doc.text(`Saldo Pendiente: $${Number(pedido.saldo_pendiente || 0).toLocaleString('es-CO')}`, 130, finalY + 17);
    doc.setFontSize(13); doc.setTextColor(219, 19, 122);
    doc.text(`TOTAL PEDIDO: $${Number(pedido.total || 0).toLocaleString('es-CO')}`, 130, finalY + 25);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text("Documento generado automáticamente por el sistema ERP Cupissa.", 14, 280);
    doc.save(`Remision_CUPISSA_${pedido.IDpedido}.pdf`);
    window.mostrarToast(`PDF de la Remisión ${pedido.IDpedido} generado y descargado.`, "exito");
};