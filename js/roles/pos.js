window.posProductos = [];
window.posClientes = [];
window.posVariaciones = [];
window.posCarrito = [];
window.posClienteSeleccionado = null;

// ==========================================
// MOTOR DE IMÁGENES Y LÓGICA CORE
// ==========================================
window.manejarErrorImagenPOS = function(imgElement, ref, nombre) {
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

window.obtenerImagenInicialPOS = function(prod) {
    const safeRef = String(prod.ref).replace(/['"]/g, '');
    let urlImagen = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos/${safeRef}/${safeRef}.jpg`;
    if (prod.imagenes_data) {
        try {
            let imgs = typeof prod.imagenes_data === 'string' ? JSON.parse(prod.imagenes_data) : prod.imagenes_data;
            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].url && imgs[0].url !== 'cascada') {
                let rawUrl = String(imgs[0].url);
                urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${rawUrl.replace(/^\//, '')}`;
            }
        } catch(e) {}
    }
    return urlImagen;
};

// COPIA EXACTA DE LA LÓGICA DEL ERP PARA VARIACIONES MÚLTIPLES
window.productoCumpleReglaExactaPOS = function(prodEstado, regla) {
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

// ==========================================
// RENDERIZADO PRINCIPAL
// ==========================================
window.renderPOS = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    const posStyles = `
        <style>
            /* TEMA OSCURO TPV */
            .pos-wrapper { display: flex; height: calc(100vh - 80px); background: #0f172a; color: #f8fafc; margin: -20px; font-family: var(--fuente-cuerpo); overflow: hidden; }
            
            /* COL 1: CATEGORÍAS */
            .pos-sidebar { width: 180px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; overflow-y: auto; padding: 10px; flex-shrink: 0; }
            .pos-cat-btn { background: transparent; border: none; color: #94a3b8; text-align: left; padding: 15px 10px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; transition: 0.2s; display: flex; align-items: center; justify-content: space-between; }
            .pos-cat-btn:hover { background: #334155; color: white; }
            .pos-cat-btn.active { background: var(--color-primario); color: white; }

            /* COL 2: CATÁLOGO */
            .pos-main { flex: 1; display: flex; flex-direction: column; padding: 15px; overflow: hidden; }
            .pos-main-header { display: flex; gap: 15px; margin-bottom: 15px; flex-shrink: 0; }
            .pos-search { flex: 1; background: #1e293b; border: 1px solid #334155; color: white; padding: 15px; border-radius: 8px; font-size: 16px; outline: none; }
            .pos-search:focus { border-color: var(--color-primario); }
            .pos-btn-new-prod { background: #10b981; color: white; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: 0.2s; }
            .pos-btn-new-prod:hover { background: #059669; }

            /* SOLUCIÓN AL COLAPSO DE TARJETAS */
            .pos-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; overflow-y: auto; align-content: start; padding-right: 5px; }
            .pos-prod-card { background: #1e293b; border-radius: 12px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: 0.2s; display: flex; flex-direction: column; height: 240px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
            .pos-prod-card:hover { border-color: var(--color-primario); transform: translateY(-3px); }
            .pos-prod-img { width: 100%; height: 150px; flex-shrink: 0; object-fit: cover; background: #334155; }
            .pos-prod-info { padding: 12px 10px; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
            .pos-prod-title { font-size: 13px; font-weight: 600; color: #f8fafc; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
            .pos-prod-price { font-size: 15px; font-weight: bold; color: var(--color-primario); }

            /* COL 3: TICKET */
            .pos-ticket { width: 350px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; flex-shrink: 0; }
            .pos-ticket-header { padding: 15px; background: #0f172a; border-bottom: 1px solid #334155; flex-shrink: 0; }
            .pos-cliente-btn { width: 100%; background: #334155; color: #f8fafc; border: 1px dashed #64748b; padding: 15px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
            .pos-cliente-btn:hover { background: #475569; }
            
            .pos-cart-list { flex: 1; overflow-y: auto; padding: 10px; }
            .pos-cart-item { background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155; }
            .pos-cart-item-info { flex: 1; padding-right: 10px; }
            .pos-cart-item-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #f8fafc; line-height: 1.2; }
            .pos-cart-item-vars { font-size: 11px; color: #94a3b8; }
            .pos-cart-item-price { font-weight: bold; color: #38bdf8; font-size: 14px; margin-top: 4px; }
            .pos-cart-qty { display: flex; align-items: center; gap: 8px; background: #1e293b; padding: 4px; border-radius: 6px; }
            .pos-cart-qty button { background: #334155; border: none; color: white; border-radius: 4px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; }
            
            .pos-ticket-footer { padding: 20px; background: #0f172a; border-top: 1px solid #334155; flex-shrink: 0; }
            .pos-total-row { display: flex; justify-content: space-between; font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #10b981; }
            .btn-cobrar { width: 100%; background: #10b981; color: white; border: none; padding: 20px; border-radius: 8px; font-size: 22px; font-weight: bold; cursor: pointer; text-transform: uppercase; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
            .btn-cobrar:hover { background: #059669; }

            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #0f172a; }
            ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        </style>
    `;

    dynamicContent.innerHTML = posStyles + `
        <div class="pos-wrapper">
            <div class="pos-sidebar" id="pos-filtros">
                <div style="padding: 10px; text-align: center; color: #64748b; font-size: 12px;">Cargando...</div>
            </div>

            <div class="pos-main">
                <div class="pos-main-header">
                    <input type="text" class="pos-search" id="pos-search" placeholder="🔍 Buscar por nombre o referencia..." autocomplete="off">
                    <button class="pos-btn-new-prod" onclick="window.crearProductoDesdePOS()">+ Añadir Producto</button>
                </div>
                <div class="pos-grid" id="pos-grid">
                    <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:#64748b;">
                        Conectando con la base de datos...
                    </div>
                </div>
            </div>

            <div class="pos-ticket">
                <div class="pos-ticket-header">
                    <button class="pos-cliente-btn" onclick="window.abrirPosCliente()">
                        <span id="pos-lbl-cliente">👤 Cliente de Mostrador</span>
                        <span>✏️</span>
                    </button>
                </div>
                
                <div class="pos-cart-list" id="pos-cart-list">
                    <div style="text-align:center; color:#64748b; margin-top: 50px;">
                        <span style="font-size:40px; display:block; margin-bottom:10px;">🛒</span>
                        El ticket está vacío
                    </div>
                </div>

                <div class="pos-ticket-footer">
                    <div class="pos-total-row">
                        <span>Total:</span>
                        <span id="pos-lbl-total">$0</span>
                    </div>
                    <button class="btn-cobrar" onclick="window.abrirModalCobro()">COBRAR TICKET</button>
                </div>
            </div>
        </div>
    `;

    cargarDatosPOS();

    document.getElementById('pos-search').addEventListener('input', window.filtrarPOS);
};

// ==========================================
// CARGA Y RENDERIZADO
// ==========================================
async function cargarDatosPOS() {
    try {
        const [resProd, resVar, resCli] = await Promise.all([
            window.supabase.from('productos').select('*'),
            window.supabase.from('variaciones').select('*'),
            window.supabase.from('clientes').select('id_cliente, nombre, cc, email, telefono').order('nombre', { ascending: true })
        ]);

        if (resProd.error) throw resProd.error;

        window.posProductos = (resProd.data || []).filter(p => p.activo === true || String(p.activo).toUpperCase() === 'SI');
        window.posVariaciones = resVar.data || [];
        window.posClientes = resCli.data || [];

        renderizarFiltrosPOS();
        renderizarGridPOS(window.posProductos);

    } catch (error) {
        window.mostrarToast("Error BD: Fallo al cargar catálogo", "error");
        document.getElementById('pos-grid').innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:#ef4444;">⚠️ Error de conexión. Revisa consola.</div>`;
    }
}

function renderizarFiltrosPOS() {
    const contenedor = document.getElementById('pos-filtros');
    let categorias = new Set();
    window.posProductos.forEach(p => { if (p.categoria) categorias.add(p.categoria); });
    
    let html = `<button class="pos-cat-btn active" data-cat="TODO">🏠 Todas las Categorías</button>`;
    Array.from(categorias).sort().forEach(c => {
        html += `<button class="pos-cat-btn" data-cat="${c}">${c} <span>❯</span></button>`;
    });
    
    contenedor.innerHTML = html;

    contenedor.querySelectorAll('.pos-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            contenedor.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            window.filtrarPOS();
        });
    });
}

window.filtrarPOS = function() {
    const inputSearch = document.getElementById('pos-search');
    if (!inputSearch) return;

    const termino = inputSearch.value.toLowerCase();
    const btnActivo = document.querySelector('.pos-cat-btn.active');
    const catActiva = btnActivo ? btnActivo.getAttribute('data-cat') : 'TODO';

    const filtrados = window.posProductos.filter(p => {
        const matchTexto = (p.producto && p.producto.toLowerCase().includes(termino)) || 
                           (p.ref && p.ref.toLowerCase().includes(termino));
        const matchCat = catActiva === 'TODO' || p.categoria === catActiva;
        return matchTexto && matchCat;
    });
    
    renderizarGridPOS(filtrados);
};

function renderizarGridPOS(productos) {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (productos.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:#64748b;">No se encontraron artículos.</div>`;
        return;
    }

    productos.forEach(p => {
        const imgUrl = window.obtenerImagenInicialPOS(p);
        const safeRef = String(p.ref).replace(/['"]/g, '');
        const safeNom = String(p.producto || '').replace(/['"]/g, '');
        const precioBase = Number(p.precio_base || 0).toLocaleString('es-CO');
        
        const card = document.createElement('div');
        card.className = 'pos-prod-card';
        // Atributo TITLE añadido para confirmación visual nativa en Hover
        card.title = `Ref: ${p.ref}\n${p.producto}`;
        card.innerHTML = `
            <img src="${imgUrl}" class="pos-prod-img" onerror="window.manejarErrorImagenPOS(this, '${safeRef}', '${safeNom}')" loading="lazy">
            <div class="pos-prod-info">
                <div class="pos-prod-title">${p.producto || 'Sin nombre'}</div>
                <div class="pos-prod-price">$${precioBase}</div>
            </div>
        `;
        
        card.onclick = () => procesarClicProducto(p);
        grid.appendChild(card);
    });
}

window.crearProductoDesdePOS = function() {
    if (typeof window.abrirModalProducto === 'function') {
        window.abrirModalProducto(); 
        const observer = new MutationObserver(async (mutations, obs) => {
            const modal = document.getElementById('modal-producto');
            if (!modal) {
                await cargarDatosPOS();
                window.mostrarToast("Catálogo actualizado.", "exito");
                obs.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });
    } else {
        window.mostrarToast("Módulo de productos no disponible.", "error");
    }
};

// ==========================================
// CARRITO Y VARIACIONES (CON LÓGICA DEL ERP)
// ==========================================
function procesarClicProducto(prod) {
    const tallas = prod.tallas ? prod.tallas.replace('#', '').split(/[,|]/).map(t => t.trim()).filter(t => t) : [];
    const colores = prod.colores ? prod.colores.replace('#', '').split(/[,|]/).map(c => c.trim()).filter(c => c) : [];

    if (tallas.length > 0 || colores.length > 0) {
        abrirModalVariacionesPOS(prod, tallas, colores);
    } else {
        agregarAlCarritoPOS(prod, '', '');
    }
}

function abrirModalVariacionesPOS(prod, tallas, colores) {
    const idModal = "modal-vars-pos";
    let htmlTallas = '';
    let htmlColores = '';

    if (tallas.length > 0) {
        htmlTallas = `
            <h4 style="margin-bottom:10px; color:#f8fafc;">Talla / Dimensión</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
                ${tallas.map(t => `<button type="button" class="pos-var-btn pos-var-talla" data-val="${t}">${t}</button>`).join('')}
            </div>
        `;
    }

    if (colores.length > 0) {
        htmlColores = `
            <h4 style="margin-bottom:10px; color:#f8fafc;">Color</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
                ${colores.map(c => `<button type="button" class="pos-var-btn pos-var-color" data-val="${c}">${c}</button>`).join('')}
            </div>
        `;
    }

    const modalHtml = `
        <div class="modal-overlay" id="${idModal}" style="z-index:9999;">
            <div class="modal-content" style="max-width: 450px; background: #1e293b; color: white; border: 1px solid #334155;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()" style="color:white;">&times;</button>
                <h3 style="color:var(--color-primario); margin-bottom:5px;">Configurar Artículo</h3>
                <p style="font-size:15px; color:#94a3b8; margin-bottom:20px; font-weight:bold;">${prod.producto}</p>
                
                <style>
                    .pos-var-btn { background:#0f172a; border:2px solid #334155; padding:12px 18px; border-radius:8px; cursor:pointer; font-weight:bold; color:#f8fafc; font-size:14px; transition:0.2s; }
                    .pos-var-btn.selected { background:var(--color-primario); border-color:var(--color-primario); color:white; }
                </style>

                ${htmlTallas}
                ${htmlColores}

                <button type="button" class="btn-primario" id="btn-add-var-pos" style="width:100%; padding:18px; font-size:18px; margin-top:10px;">Añadir al Ticket</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    let tallaElegida = '';
    let colorElegido = '';

    document.querySelectorAll(`#${idModal} .pos-var-talla`).forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll(`#${idModal} .pos-var-talla`).forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            tallaElegida = e.target.getAttribute('data-val');
        };
    });

    document.querySelectorAll(`#${idModal} .pos-var-color`).forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll(`#${idModal} .pos-var-color`).forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            colorElegido = e.target.getAttribute('data-val');
        };
    });

    document.getElementById('btn-add-var-pos').onclick = () => {
        if (tallas.length > 0 && !tallaElegida) { window.mostrarToast("Falta seleccionar la talla", "error"); return; }
        if (colores.length > 0 && !colorElegido) { window.mostrarToast("Falta seleccionar el color", "error"); return; }
        
        agregarAlCarritoPOS(prod, tallaElegida, colorElegido);
        document.getElementById(idModal).remove();
    };
}

function calcularPrecioPOS(prodBase, talla, color) {
    let precioTotal = Number(prodBase.precio_base || 0);
    let autoVarsNames = [];
    let estadoSimulado = { ...prodBase, tallas: talla, colores: color };
    let idsAplicables = prodBase.variaciones_ids ? String(prodBase.variaciones_ids).split(',') : [];

    window.posVariaciones.forEach(vg => {
        const forzadoPorId = idsAplicables.includes(String(vg.id));
        const cumpleReglas = window.productoCumpleReglaExactaPOS(estadoSimulado, vg);

        let aplica = false;
        if (cumpleReglas) {
            aplica = true; 
        } else if (forzadoPorId) {
            let contradice = false;
            const cols = String(vg.columna).toLowerCase();
            if (cols.includes('talla') && talla && !String(vg.valor).toUpperCase().includes(talla.toUpperCase())) contradice = true;
            if (cols.includes('color') && color && !String(vg.valor).toUpperCase().includes(color.toUpperCase())) contradice = true;
            if (!contradice) aplica = true;
        }

        if (aplica) {
            precioTotal += Number(vg.incremento || 0);
            const partes = vg.valor ? vg.valor.split(/[,|]/) : [''];
            autoVarsNames.push(partes[partes.length - 1].trim());
        }
    });

    return { precioFinal: precioTotal, extrasAplicados: autoVarsNames };
}

function agregarAlCarritoPOS(prod, talla, color) {
    const { precioFinal, extrasAplicados } = calcularPrecioPOS(prod, talla, color);
    
    let detAux = [];
    if (talla) detAux.push(`T: ${talla}`);
    if (color) detAux.push(`C: ${color}`);
    if (extrasAplicados.length > 0) detAux.push(`+${extrasAplicados.join(', ')}`);
    
    const detallesTexto = detAux.length > 0 ? ` [${detAux.join(' | ')}]` : '';

    const idxExistente = window.posCarrito.findIndex(item => item.ref === prod.ref && item.talla === talla && item.color === color);

    if (idxExistente !== -1) {
        window.posCarrito[idxExistente].cantidad += 1;
    } else {
        window.posCarrito.push({
            id_temp: Date.now(),
            ref: prod.ref,
            nombre_base: prod.producto,
            detalles_personalizacion: prod.producto + detallesTexto,
            vars_string: detallesTexto,
            talla: talla, color: color,
            precio_unitario: precioFinal,
            cantidad: 1
        });
    }
    renderizarCarritoPOS();
}

window.cambiarCantidadPOS = function(idTemp, delta) {
    const idx = window.posCarrito.findIndex(i => i.id_temp === idTemp);
    if (idx !== -1) {
        window.posCarrito[idx].cantidad += delta;
        if (window.posCarrito[idx].cantidad <= 0) window.posCarrito.splice(idx, 1); 
        renderizarCarritoPOS();
    }
}

function renderizarCarritoPOS() {
    const list = document.getElementById('pos-cart-list');
    let total = 0;

    if (window.posCarrito.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#64748b; margin-top: 50px;"><span style="font-size:40px; display:block; margin-bottom:10px;">🛒</span>El ticket está vacío</div>`;
        document.getElementById('pos-lbl-total').textContent = "$0";
        return;
    }

    list.innerHTML = '';
    window.posCarrito.forEach(item => {
        const subtotal = item.precio_unitario * item.cantidad;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'pos-cart-item';
        div.innerHTML = `
            <div class="pos-cart-item-info">
                <div class="pos-cart-item-title" title="${item.nombre_base}">${item.nombre_base}</div>
                <div class="pos-cart-item-vars">${item.vars_string}</div>
                <div class="pos-cart-item-price">$${item.precio_unitario.toLocaleString('es-CO')}</div>
            </div>
            <div class="pos-cart-qty">
                <button onclick="window.cambiarCantidadPOS(${item.id_temp}, -1)">-</button>
                <span style="color:white; width: 15px; text-align:center;">${item.cantidad}</span>
                <button onclick="window.cambiarCantidadPOS(${item.id_temp}, 1)">+</button>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('pos-lbl-total').textContent = `$${total.toLocaleString('es-CO')}`;
}

// ==========================================
// CLIENTES Y COBRO (UI REDISEÑADA)
// ==========================================
window.abrirPosCliente = function() {
    const modalHtml = `
        <div class="modal-overlay" id="modal-pos-cliente" style="z-index:9999;">
            <div class="modal-content" style="max-width: 500px; background:#1e293b; color:white; border:1px solid #334155;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()" style="color:white;">&times;</button>
                <h3 style="color:var(--color-primario); margin-bottom:15px;">👤 Asignar Cliente de Mostrador</h3>
                
                <input type="text" id="pos-search-cliente" class="pos-search" placeholder="🔍 Buscar por CC, Nombre o Tel..." style="margin-bottom:15px;" autocomplete="off">
                
                <div id="pos-lista-clientes" style="max-height: 200px; overflow-y:auto; border:1px solid #334155; border-radius:8px; margin-bottom:15px; background:#0f172a;"></div>

                <div style="border-top:1px dashed #475569; padding-top:15px;">
                    <h4 style="margin-bottom:10px; font-size:13px; color:#cbd5e1;">Registro Rápido</h4>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="number" id="pos-new-cc" placeholder="Cédula" style="flex:1; padding:12px; background:#0f172a; border:1px solid #334155; color:white; border-radius:6px; outline:none;">
                        <input type="number" id="pos-new-tel" placeholder="WhatsApp" style="flex:1; padding:12px; background:#0f172a; border:1px solid #334155; color:white; border-radius:6px; outline:none;">
                    </div>
                    <input type="text" id="pos-new-nombre" placeholder="Nombre Completo" style="width:100%; padding:12px; background:#0f172a; border:1px solid #334155; color:white; border-radius:6px; margin-bottom:10px; outline:none; box-sizing:border-box;">
                    <button type="button" class="btn-primario" id="btn-crear-cliente-pos" style="width:100%; padding:12px;">Crear y Asignar al Ticket</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const buscador = document.getElementById('pos-search-cliente');
    const lista = document.getElementById('pos-lista-clientes');

    const renderClientes = (clientesArray) => {
        lista.innerHTML = '';
        clientesArray.slice(0, 10).forEach(c => {
            const div = document.createElement('div');
            div.style.padding = '12px'; div.style.borderBottom = '1px solid #334155'; div.style.cursor = 'pointer';
            div.innerHTML = `<strong>${c.nombre}</strong> <span style="color:#94a3b8; font-size:11px; float:right;">CC: ${c.cc || 'N/A'}</span>`;
            div.onclick = () => {
                window.posClienteSeleccionado = c;
                document.getElementById('pos-lbl-cliente').textContent = `👤 ${c.nombre.split(' ')[0]}`;
                document.getElementById('modal-pos-cliente').remove();
            };
            lista.appendChild(div);
        });
    };

    renderClientes(window.posClientes);

    buscador.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if(!val) { renderClientes(window.posClientes); return; }
        const filtrados = window.posClientes.filter(c => 
            (c.nombre && c.nombre.toLowerCase().includes(val)) || 
            (String(c.cc).includes(val)) || 
            (String(c.telefono).includes(val))
        );
        renderClientes(filtrados);
    });

    document.getElementById('btn-crear-cliente-pos').onclick = async () => {
        const btn = document.getElementById('btn-crear-cliente-pos');
        btn.textContent = "Guardando..."; btn.disabled = true;

        const nombre = document.getElementById('pos-new-nombre').value;
        const cc = document.getElementById('pos-new-cc').value.replace(/\D/g, '');
        const tel = document.getElementById('pos-new-tel').value.replace(/\D/g, '');
        
        if(!nombre || !cc) { window.mostrarToast("Nombre y CC obligatorios", "error"); btn.textContent = "Crear y Asignar"; btn.disabled = false; return; }
        
        const payload = {
            nombre: nombre, cc: parseInt(cc), telefono: tel ? parseInt(tel) : null,
            email: `pos_${Date.now()}@cupissa.com`, 
            nivel_cuenta: 'CLIENTE', acepta_politicas: true, fecha_registro: new Date().toISOString()
        };

        try {
            const { data, error } = await window.supabase.from('clientes').insert([payload]).select().single();
            if(error) throw error;
            window.posClientes.push(data);
            window.posClienteSeleccionado = data;
            document.getElementById('pos-lbl-cliente').textContent = `👤 ${data.nombre.split(' ')[0]}`;
            window.mostrarToast("Cliente registrado", "exito");
            document.getElementById('modal-pos-cliente').remove();
        } catch(e) { window.mostrarToast("Error BD", "error"); btn.textContent = "Crear y Asignar"; btn.disabled = false; }
    };
};

window.abrirModalCobro = function() {
    if (window.posCarrito.length === 0) { window.mostrarToast("El carrito está vacío", "error"); return; }

    let totalPagar = 0;
    window.posCarrito.forEach(i => totalPagar += (i.precio_unitario * i.cantidad));

    // UI REDISEÑADA Y PULIDA PARA LA CALCULADORA
    const modalHtml = `
        <div class="modal-overlay" id="modal-cobro-pos" style="z-index:9999;">
            <div class="modal-content" style="max-width: 700px; display:flex; gap:20px; background:#0f172a; color:white; border:1px solid #334155; padding: 25px;">
                
                <style>
                    /* Estilos UI Calculadora */
                    .caja-info { background:#1e293b; padding:15px; border-radius:10px; border:1px solid #334155; margin-bottom: 15px; }
                    .caja-label { font-size:12px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; display:block; }
                    .numpad-container { background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; }
                    .numpad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #334155; border: 1px solid #334155; border-radius: 10px; overflow: hidden; }
                    .numpad-btn { background: #1e293b; color: #f8fafc; border: none; padding: 22px; font-size: 26px; font-weight: 500; cursor: pointer; transition: background 0.1s; }
                    .numpad-btn:active { background: #334155; }
                    .numpad-btn.action-c { color: #ef4444; font-weight: bold; }
                    .numpad-btn.action-000 { font-size: 20px; }
                    .quick-cash-btn { background: #334155; color: #38bdf8; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; font-size: 14px; }
                    .quick-cash-btn:hover { background: #475569; }
                </style>

                <div style="flex:1; display:flex; flex-direction:column;">
                    <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()" style="color:white; top: 15px; right: 15px;">&times;</button>
                    <h2 style="color:var(--color-primario); margin-bottom: 20px; font-family: var(--fuente-titulos);">Cobrar Ticket</h2>
                    
                    <div class="caja-info" style="text-align:center;">
                        <span class="caja-label">Total a Pagar</span>
                        <div style="font-size:36px; font-weight:bold; color:#10b981; line-height: 1;">$${totalPagar.toLocaleString('es-CO')}</div>
                    </div>

                    <div class="caja-info">
                        <span class="caja-label">Método de Pago</span>
                        <select id="pos-metodo-pago" style="width:100%; padding:12px; font-size:16px; border-radius:6px; background:#0f172a; color:white; border:1px solid #475569; outline:none; font-weight: 500; cursor:pointer;">
                            <option value="EFECTIVO">💵 Efectivo (Caja)</option>
                            <option value="DATAFONO">💳 Datáfono (Tarjeta)</option>
                            <option value="TRANSFERENCIA">🏦 Transferencia (QR/App)</option>
                        </select>
                    </div>

                    <div class="caja-info" style="display:flex; justify-content:space-between; align-items:center; background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.3);">
                        <span class="caja-label" style="margin:0; color:#38bdf8;">Cambio / Vuelto:</span>
                        <span style="font-weight:bold; color:#38bdf8; font-size:24px;" id="cobro-cambio">$0</span>
                    </div>

                    <button class="btn-cobrar" id="btn-finalizar-pos" style="margin-top:auto; padding: 22px; border-radius: 10px;">FINALIZAR VENTA</button>
                </div>

                <div style="flex:1;" class="numpad-container" id="pos-caja-numpad">
                    <span class="caja-label">Efectivo Recibido</span>
                    <input type="text" id="pos-input-efectivo" readonly value="${totalPagar}" style="width:100%; padding:18px 15px; font-size:28px; font-weight:bold; text-align:right; border:none; border-radius:8px; outline:none; margin-bottom:15px; background:#0f172a; color:white; box-sizing:border-box; letter-spacing: 1px;">
                    
                    <div style="display:flex; gap:8px; margin-bottom:15px;">
                        <button class="quick-cash-btn" style="flex:1;" onclick="window.setEfectivoPOS(${totalPagar})">Exacto</button>
                        <button class="quick-cash-btn" style="flex:1;" onclick="window.setEfectivoPOS(50000)">$50K</button>
                        <button class="quick-cash-btn" style="flex:1;" onclick="window.setEfectivoPOS(100000)">$100K</button>
                    </div>

                    <div class="numpad-grid">
                        <button class="numpad-btn" onclick="window.teclearPOS('1')">1</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('2')">2</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('3')">3</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('4')">4</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('5')">5</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('6')">6</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('7')">7</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('8')">8</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('9')">9</button>
                        <button class="numpad-btn action-c" onclick="window.teclearPOS('C')">C</button>
                        <button class="numpad-btn" onclick="window.teclearPOS('0')">0</button>
                        <button class="numpad-btn action-000" onclick="window.teclearPOS('000')">000</button>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    let valorEfectivoActual = totalPagar.toString();
    const inputEfectivo = document.getElementById('pos-input-efectivo');
    const lblCambio = document.getElementById('cobro-cambio');
    const selectMetodo = document.getElementById('pos-metodo-pago');
    const panelNumpad = document.getElementById('pos-caja-numpad');

    selectMetodo.addEventListener('change', (e) => {
        if(e.target.value === 'EFECTIVO') {
            panelNumpad.style.opacity = '1'; panelNumpad.style.pointerEvents = 'all';
            actualizarCambio();
        } else {
            panelNumpad.style.opacity = '0.4'; panelNumpad.style.pointerEvents = 'none';
            inputEfectivo.value = totalPagar;
            lblCambio.textContent = `$0`;
            lblCambio.style.color = '#94a3b8';
        }
    });

    window.teclearPOS = function(val) {
        if(val === 'C') { valorEfectivoActual = '0'; }
        else {
            if(valorEfectivoActual === '0' || valorEfectivoActual === totalPagar.toString()) valorEfectivoActual = val;
            else valorEfectivoActual += val;
        }
        inputEfectivo.value = Number(valorEfectivoActual).toLocaleString('es-CO');
        actualizarCambio();
    };

    window.setEfectivoPOS = function(monto) {
        valorEfectivoActual = monto.toString();
        inputEfectivo.value = Number(valorEfectivoActual).toLocaleString('es-CO');
        actualizarCambio();
    };

    function actualizarCambio() {
        const recibido = Number(valorEfectivoActual) || 0;
        const cambio = recibido - totalPagar;
        if(cambio > 0 && selectMetodo.value === 'EFECTIVO') {
            lblCambio.textContent = `$${cambio.toLocaleString('es-CO')}`;
            lblCambio.style.color = '#38bdf8';
        } else {
            lblCambio.textContent = `$0`;
            lblCambio.style.color = '#94a3b8';
        }
    }
    actualizarCambio();

    document.getElementById('btn-finalizar-pos').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.textContent = "Procesando..."; btn.disabled = true;

        if (selectMetodo.value === 'DATAFONO') {
            window.mostrarToast("⚠️ Integraremos la API Wompi/Bold pronto. Guardando venta...", "exito");
        }

        const idPed = "POS-" + Date.now().toString().slice(-6);
        const idCli = window.posClienteSeleccionado ? window.posClienteSeleccionado.id_cliente : null;

        const pedData = {
            id_pedido: idPed,
            tipo: "VENTA POS", 
            id_cliente: idCli,
            telefono_envio: window.posClienteSeleccionado ? window.posClienteSeleccionado.telefono : null,
            direccion_envio: "PUNTO DE VENTA (MOSTRADOR)",
            total: totalPagar,
            estado: 5, // 5 = Entregado (porque es físico)
            estado_pago: "CONFIRMADO",
            metodo_pago: selectMetodo.value,
            valor_anticipo: totalPagar,
            saldo_pendiente: 0,
            transportadora: "ENTREGA INMEDIATA"
        };

        const prodsAInsertar = window.posCarrito.map(p => ({
            id_pedido: idPed,
            ref_producto: p.ref,
            detalles_personalizacion: p.detalles_personalizacion,
            cantidad: p.cantidad,
            precio_unitario: p.precio_unitario
        }));

        try {
            const { error: pedErr } = await window.supabase.from('pedidos').insert([pedData]);
            if(pedErr) throw pedErr;

            const { error: prodErr } = await window.supabase.from('pedidos_productos').insert(prodsAInsertar);
            if(prodErr) throw prodErr;

            window.mostrarToast("✅ Venta POS Registrada", "exito");
            
            window.posCarrito = [];
            window.posClienteSeleccionado = null;
            document.getElementById('pos-lbl-cliente').innerHTML = `👤 Cliente de Mostrador <span>✏️</span>`;
            renderizarCarritoPOS();
            document.getElementById('modal-cobro-pos').remove();

        } catch (error) {
            window.mostrarToast("Error BD: " + error.message, "error");
            btn.textContent = "CONFIRMAR VENTA"; btn.disabled = false;
        }
    });
};