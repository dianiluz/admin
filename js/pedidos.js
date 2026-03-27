window.pedidosGlobales = [];
window.clientesGlobales = [];
window.productosGlobales = [];
window.variacionesGlobales = [];

window.mostrarToast = function(mensaje, tipo = 'exito') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-cupissa ${tipo === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `<span style="font-size: 18px;">${tipo === 'exito' ? '✅' : '⚠️'}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
};

window.manejarErrorImagen = function(imgElement, ref, nombre) {
    if (!imgElement) return;
    let intento = parseInt(imgElement.getAttribute('data-intento') || '0');
    const baseUrl = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos`;
    const logoUrl = `https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png`;
    const nombreFmt = String(nombre || '').toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '-');
    const refFmt = String(ref || '').replace(/['"]/g, '');
    
    const rutasCascada = [
        `${baseUrl}/${refFmt}.png`, `${baseUrl}/${refFmt}.jpg`,
        `${baseUrl}/${nombreFmt}-${refFmt}.png`, `${baseUrl}/${nombreFmt}-${refFmt}.jpg`,
        `${baseUrl}/${nombreFmt}.png`, `${baseUrl}/${nombreFmt}.jpg`
    ];

    if (intento < rutasCascada.length) {
        imgElement.setAttribute('data-intento', intento + 1);
        imgElement.src = rutasCascada[intento];
    } else {
        imgElement.onerror = null; imgElement.src = logoUrl;
    }
};

window.obtenerImagenProducto = function(prod) {
    const safeRef = String(prod.ref).replace(/['"]/g, '');
    let urlImagen = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos/${safeRef}/${safeRef}.jpg`;
    if (prod.imagenes_data) {
        try {
            let imgs = typeof prod.imagenes_data === 'string' ? JSON.parse(prod.imagenes_data) : prod.imagenes_data;
            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].url && imgs[0].url !== 'cascada') {
                let rawUrl = String(imgs[0].url);
                urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${rawUrl.replace(/^\//, '')}`;
            } else if (imgs && !Array.isArray(imgs) && typeof imgs === 'object') {
                let rawUrl = String(imgs.principal || Object.values(imgs)[0] || '');
                if (rawUrl && rawUrl !== 'undefined') {
                    urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${rawUrl.replace(/^\//, '')}`;
                }
            }
        } catch(e) {}
    }
    return urlImagen;
};

// --- MOTOR ESTRICTO DE MÚLTIPLES CONDICIONES ---
window.productoCumpleReglaExacta = function(prodEstado, regla) {
    if (!regla.columna || !regla.valor) return true; 

    const separadorCol = String(regla.columna).includes(',') ? ',' : '|';
    const separadorVal = String(regla.valor).includes(',') ? ',' : '|';

    const cols = String(regla.columna).split(separadorCol).map(s => s.trim().toLowerCase());
    const vals = String(regla.valor).split(separadorVal).map(s => s.trim().toUpperCase());

    if (cols.length !== vals.length) return false;

    for (let i = 0; i < cols.length; i++) {
        const colBuscada = cols[i].replace(/_/g, ''); 
        const valBuscado = vals[i];

        let valReal = "";
        let colEncontrada = false;

        for (let key in prodEstado) {
            if (key.toLowerCase().replace(/_/g, '') === colBuscada || key.toLowerCase().includes(colBuscada)) {
                valReal = String(prodEstado[key] || '').toUpperCase().trim();
                colEncontrada = true;
                break;
            }
        }

        if (!colEncontrada || valReal === "" || valReal === "NULL" || valReal === "UNDEFINED") return false;

        const valoresRealesArray = valReal.split(/[,|]/).map(v => v.trim());
        const cumpleFiltro = valoresRealesArray.some(vr => vr === valBuscado || vr.includes(valBuscado) || valBuscado.includes(vr));
        
        if (!cumpleFiltro && valReal !== valBuscado) {
            return false; 
        }
    }
    return true; 
};

window.crearProductoDesdeERP = function(nombreInicial) {
    if (typeof window.abrirModalProducto === 'function') {
        window.abrirModalProducto(); 
        setTimeout(() => {
            const inputNombre = document.getElementById('prod-nombre');
            if (inputNombre) inputNombre.value = nombreInicial;
            const modales = document.querySelectorAll('#modal-producto');
            const modalProd = modales[modales.length - 1]; 
            if (modalProd) {
                modalProd.style.zIndex = '999999';
                const btnX = modalProd.querySelector('.btn-cerrar-x') || modalProd.querySelector('#btn-x');
                const btnCancelar = modalProd.querySelector('#btn-cerrar-modal');
                const forzarCierre = (e) => { e.preventDefault(); e.stopPropagation(); modalProd.remove(); };
                if (btnX) btnX.addEventListener('click', forzarCierre);
                if (btnCancelar) btnCancelar.addEventListener('click', forzarCierre);
            }
            document.querySelectorAll('.res-prod-flotante').forEach(el => el.style.display = 'none');
        }, 150);
    } else {
        window.mostrarToast("El módulo de productos no está cargado. Ve a Productos primero.", "error");
    }
};

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
                            <th>Cliente Info</th>
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
        cargarPedidos(); cargarClientes(); cargarCatalogoBase();
    });
    
    document.getElementById('btn-crear-pedido').addEventListener('click', window.abrirModalCrearPedido);
    
    const filtrarPedidos = () => {
        const termino = document.getElementById('buscador-pedidos').value.toLowerCase();
        const estadoFiltro = document.getElementById('filtro-estado-pedido').value;
        const filtrados = window.pedidosGlobales.filter(p => {
            const idPed = String(p.id_pedido || "");
            const cli = window.clientesGlobales.find(c => c.id_cliente === p.id_cliente) || {};
            const coincideTexto = idPed.toLowerCase().includes(termino) ||
                                  (cli.nombre && cli.nombre.toLowerCase().includes(termino)) ||
                                  (cli.email && cli.email.toLowerCase().includes(termino)) ||
                                  (p.telefono_envio && String(p.telefono_envio).includes(termino));
            const coincideEstado = estadoFiltro === "" || String(p.estado).startsWith(estadoFiltro);
            return coincideTexto && coincideEstado;
        });
        renderizarTablaPedidos(filtrados);
    };

    document.getElementById('buscador-pedidos').addEventListener('input', filtrarPedidos);
    document.getElementById('filtro-estado-pedido').addEventListener('change', filtrarPedidos);

    cargarPedidos(); cargarClientes(); cargarCatalogoBase();
};

async function cargarCatalogoBase() {
    try {
        const { data: prodData } = await window.supabase.from('productos').select('*');
        const { data: varData } = await window.supabase.from('variaciones').select('*');
        window.productosGlobales = prodData || [];
        window.variacionesGlobales = varData || [];
    } catch(e) { console.warn("Error cargando catálogo", e); }
}

async function cargarClientes() {
    try {
        const { data, error } = await window.supabase.from('clientes').select('*');
        if (!error && data) window.clientesGlobales = data;
    } catch(e) {}
}

async function cargarPedidos() {
    const tbody = document.getElementById('tabla-pedidos-body');
    if (!tbody) return;
    try {
        if(window.clientesGlobales.length === 0) await cargarClientes();
        const { data, error } = await window.supabase.from('pedidos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        window.pedidosGlobales = data || [];
        renderizarTablaPedidos(window.pedidosGlobales);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error BD: ${error.message}</td></tr>`;
    }
}

function renderizarTablaPedidos(pedidos) {
    const tbody = document.getElementById('tabla-pedidos-body');
    tbody.innerHTML = '';
    if (pedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron pedidos en la Base de Datos.</td></tr>`;
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
        const fEst = ped.fecha_entrega_estimada ? new Date(ped.fecha_entrega_estimada).toLocaleDateString('es-CO') : '--';
        const fReal = ped.fecha_entrega_real ? new Date(ped.fecha_entrega_real).toLocaleDateString('es-CO') : '--';
        const cli = window.clientesGlobales.find(c => c.id_cliente === ped.id_cliente) || {};

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${ped.id_pedido || 'N/A'}</td>
            <td style="font-size: 12px;">Est: ${fEst}<br>Real: ${fReal}</td>
            <td><div>${cli.nombre || 'Cliente N/A'}</div><div style="font-size: 11px; color: var(--color-texto-suave);">${ped.telefono_envio || cli.telefono || ''}</div></td>
            <td>$${total}</td>
            <td class="${clasePago}">${(ped.estado_pago || 'Pendiente').toUpperCase()}</td>
            <td><span class="semaforo-estado ${claseColor}">${textoEstado}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-direction:column;">
                    <button class="btn-accion btn-editar" onclick="window.abrirModalGestionPedido('${ped.id_pedido}')">Gestionar</button>
                    <button class="btn-accion btn-ocultar" onclick="window.generarRemisionPDF('${ped.id_pedido}')">PDF</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.aplicarProductoAFila = function(tr, m) {
    const buscadorProd = tr.querySelector('.prod-buscador');
    const inpRef = tr.querySelector('.prod-ref');
    const inpNombre = tr.querySelector('.prod-nombre');
    const inpPrecio = tr.querySelector('.prod-precio');
    const tdVariaciones = tr.querySelector('.td-variaciones');
    const thumb = tr.querySelector('.prod-thumb');

    buscadorProd.value = `${m.ref} - ${m.producto || m.nombre}`;
    inpRef.value = m.ref;
    inpNombre.value = m.producto || m.nombre;
    inpPrecio.value = m.precio_base || 0;
    
    const urlImg = window.obtenerImagenProducto(m);
    const safeRef = String(m.ref).replace(/['"]/g, '');
    const safeNom = String(m.producto || '').replace(/['"]/g, '');

    thumb.src = urlImg;
    thumb.onerror = function() { window.manejarErrorImagen(this, safeRef, safeNom); };
    thumb.style.display = 'block';
    
    let idsAplicables = m.variaciones_ids ? String(m.variaciones_ids).split(',') : [];
    let reglasAplicables = [];

    if (window.variacionesGlobales && m.ref !== 'CUSTOM') {
        window.variacionesGlobales.forEach(vg => {
            if (idsAplicables.includes(String(vg.id)) || window.productoCumpleReglaExacta(m, vg)) {
                reglasAplicables.push(vg);
            }
        });
    }

    let reglasTalla = reglasAplicables.filter(vg => String(vg.columna).toLowerCase().includes('talla'));
    let reglasColor = reglasAplicables.filter(vg => String(vg.columna).toLowerCase().includes('color'));
    let reglasBaseExtra = reglasAplicables.filter(vg => !String(vg.columna).toLowerCase().includes('talla') && !String(vg.columna).toLowerCase().includes('color'));

    let varBaseInc = 0;
    let varBaseNames = [];
    reglasBaseExtra.forEach(vg => {
        varBaseInc += Number(vg.incremento || 0);
        const partesValor = vg.valor ? vg.valor.split(/[,|]/) : [''];
        varBaseNames.push(partesValor[partesValor.length - 1].trim());
    });

    tr.setAttribute('data-base-inc', varBaseInc);
    let infoBaseHtml = varBaseNames.length > 0 ? `<div style="font-size:10px; color:#db137a; font-weight:bold; margin-bottom:5px;">Aplica Auto: ${varBaseNames.join(', ')} (+$${varBaseInc.toLocaleString('es-CO')})</div>` : '';

    let opcHtml = '';
    
    const tallas = m.tallas ? m.tallas.replace('#', '').split(/[,|]/).map(t => t.trim()).filter(t => t) : [];
    if (tallas.length > 0) {
        opcHtml += `<div style="margin-bottom:5px;"><label style="font-size:10px; font-weight:bold;">Talla / Edad:</label><select class="prod-talla-sel calc-trigger" style="width:100%; padding:4px; font-size:11px; border:1px solid #ccc; border-radius:3px;"><option value="0" data-name="">Seleccionar...</option>`;
        tallas.forEach(t => {
            let incTalla = 0;
            let tempProd = { ...m, tallas: t }; 
            reglasTalla.forEach(vg => {
                if (window.productoCumpleReglaExacta(tempProd, vg)) incTalla += Number(vg.incremento || 0);
            });
            let textOpt = incTalla > 0 ? `${t} (+$${incTalla.toLocaleString('es-CO')})` : t;
            opcHtml += `<option value="${incTalla}" data-name="${t}">${textOpt}</option>`;
        });
        opcHtml += `</select></div>`;
    }

    const colores = m.colores ? m.colores.replace('#', '').split(/[,|]/).map(c => c.trim()).filter(c => c) : [];
    if (colores.length > 0) {
        opcHtml += `<div style="margin-bottom:5px;"><label style="font-size:10px; font-weight:bold;">Color:</label><select class="prod-color-sel calc-trigger" style="width:100%; padding:4px; font-size:11px; border:1px solid #ccc; border-radius:3px;"><option value="0" data-name="">Seleccionar...</option>`;
        colores.forEach(c => {
            let incColor = 0;
            let tempProd = { ...m, colores: c };
            reglasColor.forEach(vg => {
                if (window.productoCumpleReglaExacta(tempProd, vg)) incColor += Number(vg.incremento || 0);
            });
            let textOpt = incColor > 0 ? `${c} (+$${incColor.toLocaleString('es-CO')})` : c;
            opcHtml += `<option value="${incColor}" data-name="${c}">${textOpt}</option>`;
        });
        opcHtml += `</select></div>`;
    }

    let compHtml = `
        <div style="margin-top:5px; border-top:1px solid #eee; padding-top:5px;">
            <label style="font-size:10px; font-weight:bold; color:var(--color-primario);">+ Extras Opcionales Libre</label>
            <div class="contenedor-complementos"></div>
            <button type="button" class="btn-secundario btn-add-comp" style="font-size:10px; padding:4px; margin-top:2px; width:100%;">+ Añadir Complemento</button>
        </div>
    `;

    tdVariaciones.innerHTML = infoBaseHtml + opcHtml + compHtml;
    
    const btnAddComp = tdVariaciones.querySelector('.btn-add-comp');
    const contComp = tdVariaciones.querySelector('.contenedor-complementos');
    btnAddComp.addEventListener('click', () => {
        const div = document.createElement('div');
        div.style.display = 'flex'; div.style.gap = '5px'; div.style.marginTop = '4px';
        div.innerHTML = `
            <input type="text" class="comp-nombre" placeholder="Ej. Vincha Roja" style="width:60%; padding:4px; font-size:11px; border:1px solid #ccc;">
            <input type="number" class="comp-precio calc-trigger" value="0" min="0" placeholder="$0" style="width:30%; padding:4px; font-size:11px; border:1px solid #ccc;">
            <button type="button" class="btn-eliminar-comp" style="width:10%; color:white; background:red; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">X</button>
        `;
        contComp.appendChild(div);
        div.querySelector('.btn-eliminar-comp').onclick = () => { div.remove(); if(window.recalcularTotalesGlobal) window.recalcularTotalesGlobal(); };
        div.querySelector('.comp-precio').addEventListener('input', window.recalcularTotalesGlobal);
    });

    tr.querySelectorAll('.calc-trigger').forEach(input => {
        input.removeEventListener('change', window.recalcularTotalesGlobal);
        input.addEventListener('change', window.recalcularTotalesGlobal);
    });
    
    if (window.recalcularTotalesGlobal) window.recalcularTotalesGlobal();
};

window.abrirModalCrearPedido = async function() {
    if (!window.productosGlobales || window.productosGlobales.length === 0) await cargarCatalogoBase();
    if (!window.clientesGlobales || window.clientesGlobales.length === 0) await cargarClientes();

    const modalHtml = `
        <div class="modal-overlay" id="modal-crear-pedido">
            <div class="modal-content" style="max-width: 1200px; height: 95vh; overflow-y:auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x-crear-pedido">&times;</button>
                <h2 style="margin-bottom: 20px; color: var(--color-primario);">Crear Nuevo Pedido ERP</h2>
                
                <form id="form-crear-pedido-erp">
                    <div class="detalle-seccion" style="margin-bottom: 20px; background:var(--color-fondo); padding:15px; border-radius:8px;">
                        <div style="margin-bottom: 15px; position:relative;">
                            <label style="font-weight: bold; color: var(--color-primario); display:block; margin-bottom:5px;">Buscador de Clientes</label>
                            <input type="text" id="erp-buscador-cliente" placeholder="🔍 Escribe nombre, email o CC..." style="width:100%; padding:10px; border-radius:4px; border:1px solid var(--color-primario); font-size: 14px;" autocomplete="off">
                            <div id="erp-res-clientes" class="resultados-flotantes" style="display:none; width:100%; position:absolute; top:100%; left:0; z-index:9999; background:#fff; border:1px solid #ccc; max-height:250px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--color-borde); padding-bottom: 10px; margin-bottom: 15px;">
                            <h3>Datos del Cliente</h3>
                            <label style="font-size:12px; cursor:pointer; color:var(--color-exito); font-weight:600;">
                                <input type="checkbox" id="erp-guardar-cliente" checked> Guardar en Base de Datos
                            </label>
                        </div>
                        <div class="form-grid">
                            <input type="hidden" id="erp-id-cliente" value="">
                            <div class="form-group"><label>CC / NIT</label><input type="text" id="erp-cc"></div>
                            <div class="form-group"><label>Nombre Completo</label><input type="text" id="erp-nombre" required></div>
                            <div class="form-group"><label>Email</label><input type="email" id="erp-email"></div>
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
                                    <th style="width:35%">Ref / Producto</th>
                                    <th style="width:40%">Tallas, Colores y Extras</th>
                                    <th style="width:10%">Cant.</th>
                                    <th style="width:10%">Precio Base ($)</th>
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
                                    <option value="Wompi">Wompi (El cliente asume comisión)</option>
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
                            <div class="form-group" style="margin-top:15px; background: rgba(219, 19, 122, 0.1); padding: 10px; border-radius: 4px; border: 1px solid rgba(219, 19, 122, 0.3);">
                                <label style="cursor:pointer; display:flex; align-items:center; gap:8px; color: var(--color-primario); font-weight:bold;">
                                    <input type="checkbox" id="erp-aplica-cupicoins" checked style="width:16px; height:16px;">
                                    Otorgar CupiCoins a este pedido
                                </label>
                            </div>
                        </div>

                        <div style="background: rgba(219, 19, 122, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(219, 19, 122, 0.2);">
                            <h4 style="margin-bottom: 10px; color: var(--color-primario);">Resumen Financiero Exacto</h4>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Subtotal Productos y Extras:</span> <strong id="erp-lbl-subtotal">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Envío:</span> <strong id="erp-lbl-envio">$0</strong>
                            </div>
                            <hr style="margin: 10px 0; border: 0; border-top: 1px dashed var(--color-borde);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                <span>Total Neto Base:</span> <strong id="erp-lbl-base">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: var(--color-advertencia);">
                                <span>Comisión Wompi (+ IVA):</span> <strong id="erp-lbl-comision">$0</strong>
                            </div>
                            <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--color-borde);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; font-size: 16px;">
                                <span><strong>Total Pedido (Con Comisiones):</strong></span> <strong id="erp-lbl-total" style="color:var(--color-primario);">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; background: #e0f2fe; padding: 5px; border-radius:4px;">
                                <span><strong>Anticipo a Cobrar AHORA:</strong></span> <strong id="erp-lbl-anticipo">$0</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Saldo Pendiente (Neto):</span> <strong id="erp-lbl-saldo" style="color: var(--color-peligro);">$0</strong>
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

    const buscadorCliente = document.getElementById('erp-buscador-cliente');
    const resClientes = document.getElementById('erp-res-clientes');

    buscadorCliente.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        resClientes.innerHTML = '';
        if (val.length < 3) { resClientes.style.display = 'none'; return; }

        const matches = window.clientesGlobales.filter(u => 
            (u.nombre && u.nombre.toLowerCase().includes(val)) || 
            (u.cc && String(u.cc).includes(val)) || 
            (u.email && u.email.toLowerCase().includes(val))
        ).slice(0, 10);

        if (matches.length > 0) {
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'item-resultado';
                div.style.padding = '10px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong style="color:var(--color-primario);">${m.nombre}</strong><br><small>${m.email || 'Sin correo'} | CC: ${m.cc || ''}</small>`;
                div.onclick = () => {
                    document.getElementById('erp-id-cliente').value = m.id_cliente || '';
                    document.getElementById('erp-cc').value = m.cc || '';
                    document.getElementById('erp-nombre').value = m.nombre || '';
                    document.getElementById('erp-email').value = m.email || '';
                    document.getElementById('erp-telefono').value = m.telefono || '';
                    document.getElementById('erp-ciudad').value = m.ciudad || '';
                    document.getElementById('erp-departamento').value = m.departamento || '';
                    document.getElementById('erp-direccion').value = m.direccion || '';
                    document.getElementById('erp-barrio').value = m.barrio || '';
                    resClientes.style.display = 'none'; buscadorCliente.value = m.nombre;
                };
                resClientes.appendChild(div);
            });
            resClientes.style.display = 'block';
        } else {
            resClientes.innerHTML = `<div style="padding:15px; text-align:center; font-size:12px; color:#666;">Cliente no encontrado.<br>Llena los datos abajo para crearlo.</div>`;
            resClientes.style.display = 'block';
        }
    });

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
                    inputBarrio.value = m.n; document.getElementById('erp-ciudad').value = m.m;
                    resBarrios.style.display = 'none'; calcularEnvioLocal();
                };
                resBarrios.appendChild(div);
            });
            resBarrios.style.display = 'block';
        } else { resBarrios.style.display = 'none'; }
    });

    document.addEventListener('click', (e) => {
        if(!inputBarrio.contains(e.target)) resBarrios.style.display = 'none';
        if(!buscadorCliente.contains(e.target)) resClientes.style.display = 'none';
    });

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
        if (locales.includes(ciudad)) {
            contTransp.style.display = 'none'; ccInput.required = false; 
            if ((ciudad === "BARRANQUILLA" || ciudad === "SOLEDAD") && barrio !== "") {
                const b = (window.BARRIOS_METRO || []).find(x => x.n.toUpperCase() === barrio && x.m === ciudad);
                document.getElementById('erp-envio').value = b ? b.p : 15000;
            } else { document.getElementById('erp-envio').value = 15000; }
        } else if (ciudad !== "") {
            contTransp.style.display = 'block'; ccInput.required = true; 
        }
        window.recalcularTotalesGlobal();
    };

    document.querySelectorAll('.calc-envio').forEach(el => el.addEventListener('blur', calcularEnvioLocal));

    const tbodyProd = document.getElementById('tbody-productos-erp');

    window.recalcularTotalesGlobal = () => {
        let subtotalProd = 0;
        
        tbodyProd.querySelectorAll('tr').forEach(tr => {
            const cant = Number(tr.querySelector('.prod-cant').value) || 0;
            const precioBase = Number(tr.querySelector('.prod-precio').value) || 0;
            const ref = tr.querySelector('.prod-ref').value;
            const prodCat = window.productosGlobales.find(p => p.ref === ref) || {};

            let varInc = Number(tr.getAttribute('data-base-inc') || 0);

            const tallaSel = tr.querySelector('.prod-talla-sel');
            if (tallaSel && tallaSel.value) varInc += Number(tallaSel.value);

            const colorSel = tr.querySelector('.prod-color-sel');
            if (colorSel && colorSel.value) varInc += Number(colorSel.value);

            tr.querySelectorAll('.comp-precio').forEach(inp => { varInc += (Number(inp.value) || 0); });

            subtotalProd += (cant * (precioBase + varInc));
        });

        const envio = Number(document.getElementById('erp-envio').value) || 0;
        const metodo = document.getElementById('erp-metodo-pago').value;
        const abonoPct = Number(document.getElementById('erp-tipo-abono').value) || 100;

        let baseTotalNeto = subtotalProd + envio; 
        let netoAbono = baseTotalNeto * (abonoPct / 100); 
        let saldoPendienteNeto = baseTotalNeto - netoAbono; 

        let comision = 0;
        let anticipoACobrar = netoAbono;

        if (metodo === 'Wompi' && netoAbono > 0) {
            anticipoACobrar = (netoAbono + 833) / 0.968465;
            comision = anticipoACobrar - netoAbono;
        }

        let totalPedidoConComision = baseTotalNeto + comision;

        document.getElementById('erp-lbl-subtotal').textContent = `$${Math.round(subtotalProd).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-envio').textContent = `$${Math.round(envio).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-base').textContent = `$${Math.round(baseTotalNeto).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-comision').textContent = `$${Math.round(comision).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-total').textContent = `$${Math.round(totalPedidoConComision).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-anticipo').textContent = `$${Math.round(anticipoACobrar).toLocaleString('es-CO')}`;
        document.getElementById('erp-lbl-saldo').textContent = `$${Math.round(saldoPendienteNeto).toLocaleString('es-CO')}`;
    };

    const agregarFilaProd = () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px; position:relative;">
                    <img class="prod-thumb" src="https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png" style="width:40px; height:40px; object-fit:cover; border-radius:4px; display:none;">
                    <div style="flex:1;">
                        <input type="text" class="prod-buscador" placeholder="Buscar Producto..." required style="width:100%; padding:4px;">
                        <div class="res-prod-flotante resultados-flotantes" style="display:none; width:150%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:250px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                    </div>
                    <input type="hidden" class="prod-ref" value="CUSTOM">
                    <input type="hidden" class="prod-nombre">
                </div>
            </td>
            <td class="td-variaciones" style="font-size:12px; color:#666;">Selecciona un producto primero</td>
            <td><input type="number" class="prod-cant calc-trigger" value="1" min="1" required style="width:100%; padding:4px;"></td>
            <td><input type="number" class="prod-precio calc-trigger" value="0" min="0" required style="width:100%; padding:4px;"></td>
            <td style="text-align:center;"><button type="button" class="btn-accion btn-eliminar btn-del-prod-erp">X</button></td>
        `;
        tbodyProd.appendChild(tr);
        
        const buscadorProd = tr.querySelector('.prod-buscador');
        const resListProd = tr.querySelector('.res-prod-flotante');

        buscadorProd.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            resListProd.innerHTML = ''; tr.querySelector('.prod-nombre').value = e.target.value; 
            if(val.length < 2) { resListProd.style.display = 'none'; return; }
            
            const matches = (window.productosGlobales || []).filter(p => 
                (p.producto && p.producto.toLowerCase().includes(val)) || (p.ref && p.ref.toLowerCase().includes(val))
            ).slice(0, 10);

            if(matches.length > 0) {
                matches.forEach(m => {
                    const div = document.createElement('div');
                    div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                    const urlImg = window.obtenerImagenProducto(m);
                    const safeRef = String(m.ref).replace(/['"]/g, '');
                    const safeNom = String(m.producto || '').replace(/['"]/g, '');

                    div.innerHTML = `
                        <div style="display:flex; gap:10px; align-items:center;">
                            <img src="${urlImg}" onerror="window.manejarErrorImagen(this, '${safeRef}', '${safeNom}')" style="width:30px; height:30px; object-fit:cover; border-radius:4px;">
                            <div><strong>${m.ref}</strong> - ${m.producto || m.nombre}<br><small style="color:var(--color-primario);">$${Number(m.precio_base || 0).toLocaleString('es-CO')}</small></div>
                        </div>
                    `;

                    div.onclick = () => { window.aplicarProductoAFila(tr, m); resListProd.style.display = 'none'; };
                    resListProd.appendChild(div);
                });
                resListProd.style.display = 'block';
            } else { 
                resListProd.innerHTML = `
                    <div style="padding:15px; text-align:center;">
                        <p style="font-size:12px; margin-bottom:10px; color:#666;">Producto no encontrado.</p>
                        <button type="button" class="btn-primario" id="btn-inline-create" style="width:100%; padding:8px; font-size:12px;">+ Crear "${val}" en Catálogo</button>
                    </div>
                `;
                resListProd.style.display = 'block'; 
                
                document.getElementById('btn-inline-create').onclick = () => {
                    window.filaEsperandoProducto = tr; 
                    window.nombreEsperandoProducto = val;
                    window.crearProductoDesdeERP(val);
                    resListProd.style.display = 'none';
                    
                    const observer = new MutationObserver(async (mutations, obs) => {
                        const modal = document.getElementById('modal-producto');
                        if (!modal) {
                            await cargarCatalogoBase();
                            const nuevoProd = window.productosGlobales.find(p => p.producto === window.nombreEsperandoProducto);
                            if (nuevoProd && window.filaEsperandoProducto) {
                                window.aplicarProductoAFila(window.filaEsperandoProducto, nuevoProd);
                            }
                            window.filaEsperandoProducto = null;
                            obs.disconnect();
                        }
                    });
                    observer.observe(document.body, { childList: true });
                };
            }
        });
        document.addEventListener('click', (e) => { if(!buscadorProd.contains(e.target)) resListProd.style.display = 'none'; });
        tr.querySelector('.btn-del-prod-erp').addEventListener('click', () => { tr.remove(); window.recalcularTotalesGlobal(); });
        tr.querySelectorAll('.calc-trigger').forEach(input => input.addEventListener('input', window.recalcularTotalesGlobal));
    };

    document.querySelectorAll('#modal-crear-pedido .calc-trigger').forEach(el => el.addEventListener('input', window.recalcularTotalesGlobal));
    document.querySelectorAll('#modal-crear-pedido .calc-trigger').forEach(el => el.addEventListener('change', window.recalcularTotalesGlobal));
    document.getElementById('btn-add-prod-erp').addEventListener('click', agregarFilaProd);
    agregarFilaProd();

    document.getElementById('form-crear-pedido-erp').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productosPedido = [];
        tbodyProd.querySelectorAll('tr').forEach(tr => {
            let nombreExtendido = tr.querySelector('.prod-nombre').value;
            const precioBase = Number(tr.querySelector('.prod-precio').value) || 0;

            let varInc = Number(tr.getAttribute('data-base-inc') || 0);
            let extras = [];
            
            let baseVars = tr.getAttribute('data-base-vars');
            if (baseVars) extras.push(baseVars);

            const tallaSel = tr.querySelector('.prod-talla-sel');
            if(tallaSel && tallaSel.selectedIndex > 0) {
                let txt = tallaSel.options[tallaSel.selectedIndex].getAttribute('data-name');
                nombreExtendido += ` [Talla: ${txt}]`;
                varInc += Number(tallaSel.value);
            }
            
            const colorSel = tr.querySelector('.prod-color-sel');
            if(colorSel && colorSel.selectedIndex > 0) {
                let txt = colorSel.options[colorSel.selectedIndex].getAttribute('data-name');
                nombreExtendido += ` [Color: ${txt}]`;
                varInc += Number(colorSel.value);
            }

            tr.querySelectorAll('.comp-nombre').forEach((inp, idx) => {
                const cName = inp.value.trim(); const cPrice = Number(tr.querySelectorAll('.comp-precio')[idx].value) || 0;
                if(cName) { extras.push(`${cName}`); varInc += cPrice; }
            });

            if(extras.length > 0) nombreExtendido += ` [+ ${extras.join(', ')}]`;

            productosPedido.push({
                ref_producto: tr.querySelector('.prod-ref').value || `CUP-TEMP-${Date.now().toString().slice(-4)}`,
                detalles_personalizacion: nombreExtendido,
                cantidad: parseInt(tr.querySelector('.prod-cant').value) || 1,
                precio_unitario: parseFloat(precioBase + varInc)
            });
        });

        if(productosPedido.length === 0) { window.mostrarToast("Agrega productos al pedido.", "error"); return; }

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.textContent = "Procesando..."; btnSubmit.disabled = true;

        const idPed = "CUP-" + Date.now().toString().slice(-8);
        let idClienteFinal = document.getElementById('erp-id-cliente').value;
        const esClienteNuevo = !idClienteFinal; 
        const emailCliente = document.getElementById('erp-email').value || `cliente_${idPed}@cupissa.com`;
        const nombreCliente = document.getElementById('erp-nombre').value;
        const ccVal = document.getElementById('erp-cc').value.replace(/\D/g, '');

        if (document.getElementById('erp-guardar-cliente').checked) {
            const telVal = document.getElementById('erp-telefono').value.replace(/\D/g, '');
            
            const { data: clienteDB, error: cliErr } = await window.supabase.from('clientes').upsert({
                id_cliente: idClienteFinal || undefined, 
                email: emailCliente,
                nombre: nombreCliente,
                cc: ccVal ? parseInt(ccVal) : null,
                telefono: telVal ? parseInt(telVal) : null,
                ciudad: document.getElementById('erp-ciudad').value,
                departamento: document.getElementById('erp-departamento').value,
                barrio: document.getElementById('erp-barrio').value,
                direccion: document.getElementById('erp-direccion').value
            }, { onConflict: 'email' }).select().single();
            
            if (clienteDB) idClienteFinal = clienteDB.id_cliente;
        }

        const telPed = document.getElementById('erp-telefono').value.replace(/\D/g, '');
        const pedData = {
            id_pedido: idPed,
            tipo: "VENTA ERP",
            id_cliente: idClienteFinal || null,
            telefono_envio: telPed ? parseInt(telPed) : null,
            direccion_envio: document.getElementById('erp-direccion').value,
            total: parseInt(document.getElementById('erp-lbl-total').textContent.replace(/\D/g, '')),
            estado: 1,
            estado_pago: "PENDIENTE",
            metodo_pago: document.getElementById('erp-metodo-pago').value,
            valor_anticipo: parseInt(document.getElementById('erp-lbl-anticipo').textContent.replace(/\D/g, '')),
            saldo_pendiente: parseInt(document.getElementById('erp-lbl-saldo').textContent.replace(/\D/g, '')),
            transportadora: document.getElementById('erp-transportadora').value,
            aplica_cupicoins: document.getElementById('erp-aplica-cupicoins').checked,
            cupicoins_otorgados: false
        };

        try {
            const { error: pedErr } = await window.supabase.from('pedidos').insert([pedData]);
            if(pedErr) throw pedErr;

            const prodsAInsertar = productosPedido.map(p => ({
                id_pedido: idPed,
                ref_producto: p.ref_producto,
                detalles_personalizacion: p.detalles_personalizacion,
                cantidad: p.cantidad,
                precio_unitario: p.precio_unitario
            }));

            const { error: prodErr } = await window.supabase.from('pedidos_productos').insert(prodsAInsertar);
            if(prodErr) throw prodErr;

            // --- LLAMADA A APPS SCRIPT PARA CORREOS Y AUTH ---
            try {
                if (document.getElementById('erp-guardar-cliente').checked && esClienteNuevo && document.getElementById('erp-email').value) {
                    const claveTemp = ccVal ? `Cupi${ccVal}` : `Cupissa${Date.now().toString().slice(-4)}*`;
                    fetch(CUPISSA_CONFIG.API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'crearUsuarioAuthYBienvenida',
                            email: emailCliente,
                            nombre: nombreCliente,
                            clave_temporal: claveTemp
                        })
                    });
                }
                fetch(CUPISSA_CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'enviarCorreoConfirmacion',
                        pedido: { idpedido: idPed, total: pedData.total, valor_anticipo: pedData.valor_anticipo, saldo_pendiente: pedData.saldo_pendiente },
                        usuario: { nombre: nombreCliente, email: emailCliente },
                        productos: prodsAInsertar.map(p => ({ producto: p.detalles_personalizacion, cantidad: p.cantidad, precio: p.precio_unitario }))
                    })
                });
            } catch (errMails) { console.log("Aviso: Fallo enviando correos", errMails); }
            // ------------------------------------------------

            window.mostrarToast("Pedido ERP creado con éxito.", "exito");
            cerrar(); cargarPedidos();
        } catch (error) {
            window.mostrarToast("Error BD: " + error.message, "error");
            btnSubmit.textContent = "Crear Pedido Oficial"; btnSubmit.disabled = false;
        }
    });
};

window.abrirModalGestionPedido = async function(idPedido) {
    const pedido = window.pedidosGlobales.find(p => p.id_pedido === idPedido);
    if (!pedido) return;
    const cli = window.clientesGlobales.find(c => c.id_cliente === pedido.id_cliente) || {};
    const { data: prodsDB } = await window.supabase.from('pedidos_productos').select('*').eq('id_pedido', idPedido);
    
    const anticipo = Number(pedido.valor_anticipo || 0).toLocaleString('es-CO');
    const saldo = Number(pedido.saldo_pendiente || 0).toLocaleString('es-CO');
    const total = Number(pedido.total || 0).toLocaleString('es-CO');

    let htmlProductos = '';
    if (prodsDB && prodsDB.length > 0) {
        prodsDB.forEach(prod => {
            const precioUnitario = Number(prod.precio_unitario || 0).toLocaleString('es-CO');
            let detalles = prod.detalles_personalizacion || 'Producto Personalizado';
            let urlImg = 'https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png';
            let safeRef = String(prod.ref_producto || '').replace(/['"]/g, '');
            let safeNom = '';

            const pCat = window.productosGlobales.find(p => p.ref === prod.ref_producto);
            if (pCat) { urlImg = window.obtenerImagenProducto(pCat); safeNom = String(pCat.producto || '').replace(/['"]/g, ''); }

            htmlProductos += `
                <tr>
                    <td style="display:flex; align-items:center; gap:10px;">
                        <img src="${urlImg}" onerror="window.manejarErrorImagen(this, '${safeRef}', '${safeNom}')" style="width:35px; height:35px; object-fit:cover; border-radius:4px; flex-shrink:0;">
                        <span style="font-weight:600;">${prod.ref_producto || ''}</span>
                    </td>
                    <td style="font-size:12px;">${detalles}</td>
                    <td>${prod.cantidad || 1}</td>
                    <td style="font-weight:bold; color:var(--color-primario);">$${precioUnitario}</td>
                </tr>`;
        });
    } else { htmlProductos = '<tr><td colspan="4" style="text-align:center;">No hay productos.</td></tr>'; }

    const modalHtml = `
        <div class="modal-overlay" id="modal-pedido">
            <div class="modal-content" style="max-width:900px; max-height: 95vh; overflow-y:auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x-pedido">&times;</button>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2>Gestión de Pedido: ${pedido.id_pedido}</h2>
                    <button class="btn-accion btn-eliminar" id="btn-eliminar-pedido" style="padding: 8px 15px;">🗑 Eliminar</button>
                </div>
                
                <div class="detalle-pedido-grid">
                    <div class="detalle-seccion">
                        <h3>Info de Pago y Fechas</h3>
                        <p><strong>Método:</strong> ${pedido.metodo_pago || ''}</p>
                        <p><strong>Total Pedido:</strong> $${total} | <strong>Saldo:</strong> $${saldo}</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; border: 1px solid #10b981;">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor:pointer;">
                                <input type="checkbox" id="check-pago-confirmado" ${String(pedido.estado_pago).toUpperCase() === 'CONFIRMADO' ? 'checked' : ''}> Pago Verificado
                            </label>
                        </div>
                        <div style="display:flex; gap:10px; margin-top: 15px;">
                            <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Fecha Est. Entrega:</label><input type="date" id="fecha-est" value="${pedido.fecha_entrega_estimada ? pedido.fecha_entrega_estimada.split('T')[0] : ''}" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Fecha Real Entregado:</label><input type="date" id="fecha-real" value="${pedido.fecha_entrega_real ? pedido.fecha_entrega_real.split('T')[0] : ''}" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;"></div>
                        </div>
                    </div>

                    <div class="detalle-seccion">
                        <h3>Estado y Logística</h3>
                        <form id="form-actualizar-pedido" style="display:flex; flex-direction:column; gap:10px;">
                            <div>
                                <label style="font-size:12px; font-weight:600;">Estado General</label>
                                <select id="gestion-estado-prod" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;">
                                    <option value="1" ${String(pedido.estado) === '1' ? 'selected' : ''}>1 - Agendado</option>
                                    <option value="2" ${String(pedido.estado) === '2' ? 'selected' : ''}>2 - En fabricación</option>
                                    <option value="2.1" ${String(pedido.estado) === '2.1' ? 'selected' : ''}>↳ 2.1 - Diseño</option>
                                    <option value="2.2" ${String(pedido.estado) === '2.2' ? 'selected' : ''}>↳ 2.2 - Taller</option>
                                    <option value="3" ${String(pedido.estado) === '3' ? 'selected' : ''}>3 - Listo para enviar</option>
                                    <option value="4" ${String(pedido.estado) === '4' ? 'selected' : ''}>4 - En camino</option>
                                    <option value="5" ${String(pedido.estado) === '5' ? 'selected' : ''}>5 - Entregado</option>
                                    <option value="6" ${String(pedido.estado) === '6' ? 'selected' : ''}>6 - Cancelado</option>
                                </select>
                            </div>
                            <div><label style="font-size:12px; font-weight:600;">Transportadora</label><input type="text" id="gestion-transportadora" value="${pedido.transportadora || ''}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div><label style="font-size:12px; font-weight:600;">Guía</label><input type="number" id="gestion-guia" value="${pedido.guia || ''}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;"></div>
                            <div style="background: rgba(219,19,122,0.1); padding: 8px; border-radius: 4px; border: 1px solid rgba(219,19,122,0.3); margin-top:5px;">
                                <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:bold; color:var(--color-primario); cursor:pointer;">
                                    <input type="checkbox" id="gestion-aplica-cupicoins" ${pedido.aplica_cupicoins !== false ? 'checked' : ''} ${pedido.cupicoins_otorgados ? 'disabled' : ''}> 
                                    ${pedido.cupicoins_otorgados ? '✅ CupiCoins ya otorgados' : 'Otorgar CupiCoins al Entregar'}
                                </label>
                            </div>
                            <div class="modal-actions" style="margin-top:10px;"><button type="submit" class="btn-primario" style="width:100%;">Guardar Cambios</button></div>
                        </form>
                    </div>
                </div>

                <div class="detalle-seccion">
                    <h3>Detalle de Productos</h3>
                    <table class="tabla-productos-pedido" style="width:100%;">
                        <thead style="background:#fce7f3; text-align:left;"><tr><th style="padding:8px;">Referencia</th><th>Producto + Detalles</th><th>Cant</th><th>V. Unitario</th></tr></thead>
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
        if (confirm("¿Eliminar este pedido? Es irreversible.")) {
            try {
                await window.supabase.from('pedidos_productos').delete().eq('id_pedido', pedido.id_pedido);
                await window.supabase.from('pedidos').delete().eq('id_pedido', pedido.id_pedido);
                window.mostrarToast("Pedido eliminado.", "exito"); cerrar(); cargarPedidos(); 
            } catch (e) { window.mostrarToast("Error", "error"); }
        }
    });

    document.getElementById('form-actualizar-pedido').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]'); btnSubmit.disabled = true;
        try {
            const guia = document.getElementById('gestion-guia').value.replace(/\D/g, '');
            const est = parseInt(document.getElementById('gestion-estado-prod').value) || 1;
            const pago = document.getElementById('check-pago-confirmado').checked ? "CONFIRMADO" : "PENDIENTE";
            const aplicaCupi = document.getElementById('gestion-aplica-cupicoins').checked;

            const payload = {
                estado: est, guia: guia ? parseInt(guia) : null, transportadora: document.getElementById('gestion-transportadora').value,
                fecha_entrega_estimada: document.getElementById('fecha-est').value || null,
                fecha_entrega_real: document.getElementById('fecha-real').value || null,
                estado_pago: pago, aplica_cupicoins: aplicaCupi
            };

            if (est === 5 && pago === 'CONFIRMADO' && aplicaCupi && !pedido.cupicoins_otorgados) {
                if (cli && cli.id_cliente) {
                    const { data: histo } = await window.supabase.from('cupicoins_historial').select('*').eq('id_cliente', cli.id_cliente).eq('motivo', `Pedido ${pedido.id_pedido}`);
                    if (!histo || histo.length === 0) {
                        const pts = Math.floor(Number(pedido.total || 0) / 1000) * 5;
                        if (pts > 0) {
                            const saldo = Number(cli.cupicoins_totales || 0);
                            await window.supabase.from('clientes').update({ cupicoins_totales: saldo + pts }).eq('id_cliente', cli.id_cliente);
                            await window.supabase.from('cupicoins_historial').insert([{ id_cliente: cli.id_cliente, movimiento: pts, motivo: `Pedido ${pedido.id_pedido}` }]);
                            window.mostrarToast(`¡Se otorgaron ${pts} CupiCoins!`, "exito");
                            payload.cupicoins_otorgados = true; 
                        }
                    }
                }
            }

            const { error } = await window.supabase.from('pedidos').update(payload).eq('id_pedido', pedido.id_pedido);
            if (error) throw error;
            window.mostrarToast("Actualizado.", "exito"); cerrar(); cargarPedidos(); 
        } catch (error) { window.mostrarToast("Error BD", "error"); btnSubmit.disabled = false; }
    });
};

window.generarRemisionPDF = async function(idPedido) {
    const pedido = window.pedidosGlobales.find(p => p.id_pedido === idPedido);
    if (!pedido || !window.jspdf) { window.mostrarToast("Error PDF", "error"); return; }
    
    const cli = window.clientesGlobales.find(c => c.id_cliente === pedido.id_cliente) || {};
    const { data: prodsDB } = await window.supabase.from('pedidos_productos').select('*').eq('id_pedido', idPedido);
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(219, 19, 122); doc.text("CUPISSA", 14, 25);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text("CUPISSA SAS | NIT. 901725692", 14, 35);
    doc.text("BARRANQUILLA, ATLÁNTICO", 14, 40); doc.text("+57 314 767 1380 | contacto@cupissa.com", 14, 45);
    doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("REMISIÓN DE PEDIDO", 120, 25);
    doc.setFontSize(12); doc.text(`N°: ${pedido.id_pedido}`, 120, 32);
    doc.setFont("helvetica", "normal");
    const fecha = pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-CO') : '--';
    doc.text(`Fecha Orden: ${fecha}`, 120, 39);
    doc.setDrawColor(219, 19, 122); doc.setLineWidth(0.5); doc.line(14, 50, 196, 50);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Datos del Cliente:", 14, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${cli.nombre || ''}`, 14, 67); doc.text(`Teléfono: ${pedido.telefono_envio || cli.telefono || ''}`, 14, 73);
    doc.text(`Email: ${cli.email || ''}`, 14, 79); doc.text(`Dirección: ${pedido.direccion_envio || ''}`, 14, 85);
    doc.setFont("helvetica", "bold"); doc.text("Logística de Envío:", 120, 60); doc.setFont("helvetica", "normal");
    doc.text(`Transportadora: ${pedido.transportadora || 'N/A'}`, 120, 67);
    doc.text(`Guía: ${pedido.guia || 'Pendiente'}`, 120, 73);
    doc.text(`Estado Pago: ${(pedido.estado_pago || 'Pendiente').toUpperCase()}`, 120, 79);

    const headers = [["Referencia", "Producto", "Cant.", "Vr. Unitario", "Subtotal"]]; const data = [];
    if (prodsDB) {
        prodsDB.forEach(p => {
            const precioU = Number(p.precio_unitario || 0); const cant = Number(p.cantidad || 1);
            let detalles = p.detalles_personalizacion || 'Producto Personalizado';
            data.push([ p.ref_producto || 'N/A', detalles, cant.toString(), `$${precioU.toLocaleString('es-CO')}`, `$${(precioU * cant).toLocaleString('es-CO')}` ]);
        });
    }

    doc.autoTable({
        startY: 95, head: headers, body: data, theme: 'striped', headStyles: { fillColor: [219, 19, 122] },
        styles: { font: 'helvetica', fontSize: 10 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' } }
    });

    const finalY = doc.lastAutoTable.finalY || 95;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Anticipo: $${Number(pedido.valor_anticipo || 0).toLocaleString('es-CO')}`, 130, finalY + 10);
    doc.text(`Saldo Pendiente: $${Number(pedido.saldo_pendiente || 0).toLocaleString('es-CO')}`, 130, finalY + 17);
    doc.setFontSize(13); doc.setTextColor(219, 19, 122);
    doc.text(`TOTAL PEDIDO: $${Number(pedido.total || 0).toLocaleString('es-CO')}`, 130, finalY + 25);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text("Documento generado automáticamente por el sistema ERP Cupissa.", 14, 280);
    doc.save(`Remision_CUPISSA_${pedido.id_pedido}.pdf`);
};