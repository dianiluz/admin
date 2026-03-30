window.productosGlobales = [];
window.variacionesGlobales = [];

// --- CONEXIÓN DIFERIDA (Esperamos a que la librería cargue sin estrellarnos) ---
let dbAdmin = null;

function inicializarDbAdmin() {
    if (!dbAdmin && typeof window.supabase !== 'undefined' && typeof CUPISSA_CONFIG !== 'undefined') {
        if (typeof window.supabase.from === 'function') {
            dbAdmin = window.supabase;
        } else if (typeof window.supabase.createClient === 'function') {
            dbAdmin = window.supabase.createClient(CUPISSA_CONFIG.supabase.url, CUPISSA_CONFIG.supabase.key);
            window.supabase = dbAdmin;
        }
    }
    return dbAdmin;
}

// --- PARCHE DE SEGURIDAD PARA TOASTS ---
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

// --- MOTOR GLOBAL CASCADA DE IMÁGENES ---
window.manejarErrorImagen = function(imgElement, ref, nombre) {
    if (!imgElement || typeof CUPISSA_CONFIG === 'undefined') return;
    
    let intento = parseInt(imgElement.getAttribute('data-intento') || '0');
    const baseUrl = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos`;
    const logoUrl = `https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png`;
    
    const nombreFmt = String(nombre || '').toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '-');
    const refFmt = String(ref || '').replace(/['"]/g, '');
    
    const rutasCascada = [
        `${baseUrl}/${refFmt}.png`,
        `${baseUrl}/${refFmt}.jpg`,
        `${baseUrl}/${nombreFmt}-${refFmt}.png`,
        `${baseUrl}/${nombreFmt}-${refFmt}.jpg`,
        `${baseUrl}/${nombreFmt}.png`,
        `${baseUrl}/${nombreFmt}.jpg`
    ];

    if (intento < rutasCascada.length) {
        imgElement.setAttribute('data-intento', intento + 1);
        imgElement.src = rutasCascada[intento];
    } else {
        imgElement.onerror = null;
        imgElement.src = logoUrl;
    }
};

// --- EVALUADOR DE VARIACIONES ---
window.productoCumpleCondicion = function(prod, columnasStr, valoresStr) {
    if (!columnasStr || !valoresStr) return true;

    const separadorCol = String(columnasStr).includes(',') ? ',' : '|';
    const separadorVal = String(valoresStr).includes(',') ? ',' : '|';

    const colsRegla = String(columnasStr).split(separadorCol).map(s => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const valsRegla = String(valoresStr).split(separadorVal).map(s => s.trim().toUpperCase());

    let prodLimpio = {};
    for (let key in prod) {
        let keyLimpia = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
        prodLimpio[keyLimpia] = String(prod[key] || '').toUpperCase().trim();
    }

    let cumpleTodas = true;
    for (let i = 0; i < colsRegla.length; i++) {
        const colBusqueda = colsRegla[i];
        const valorBuscado = valsRegla[i] || "";
        
        let llaveEncontrada = null;
        for(let keyProd in prodLimpio) {
            if (colBusqueda === 'subcategoria' && keyProd === 'categoria') continue;
            if(keyProd.includes(colBusqueda) || colBusqueda.includes(keyProd)) {
                llaveEncontrada = keyProd;
                break;
            }
        }
        
        if (llaveEncontrada) {
            const valorReal = prodLimpio[llaveEncontrada];
            if (valorReal === "" || valorReal.includes("TOD")) continue; 
            if (valorReal !== valorBuscado && !valorReal.includes(valorBuscado) && !valorBuscado.includes(valorReal)) {
                cumpleTodas = false;
                break;
            }
        } else {
            cumpleTodas = false; 
            break;
        }
    }
    return cumpleTodas;
};

window.crearProductoDesdeERP = function(nombreInicial) {
    if (typeof window.abrirModalProducto === 'function') {
        window.abrirModalProducto(); 
        setTimeout(() => {
            const inputNombre = document.getElementById('prod-nombre');
            if (inputNombre) inputNombre.value = nombreInicial;
        }, 100);
    } else {
        window.mostrarToast("El módulo de productos no está cargado.", "error");
    }
};

window.renderProductos = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Gestión del Catálogo</h2>
            <button class="btn-primario" id="btn-crear-producto">+ Crear Producto</button>
        </div>
        <div class="card">
            <div style="margin-bottom: 15px;">
                <input type="text" id="buscador-productos" class="buscador-panel" placeholder="Buscar por nombre, ref o categoría...">
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Img</th>
                            <th>Referencia</th>
                            <th>Producto</th>
                            <th>Mundo / Categoría</th>
                            <th>Precio Base</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-productos-body"></tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('btn-crear-producto').onclick = () => window.abrirModalProducto();
    
    document.getElementById('buscador-productos').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = window.productosGlobales.filter(p => 
            (p.ref || "").toLowerCase().includes(term) || 
            (p.producto || "").toLowerCase().includes(term) ||
            (p.categoria || "").toLowerCase().includes(term)
        );
        renderizarTablaProductos(filtrados);
    };

    cargarProductos();
};

async function cargarProductos() {
    const tbody = document.getElementById('tabla-productos-body');
    if (!tbody) return;
    try {
        const db = inicializarDbAdmin();
        if (!db) throw new Error("No hay conexión a Supabase activa.");
        
        const { data: prodData, error: errProd } = await db.from('productos').select('*').order('ref', { ascending: true });
        if(errProd) throw errProd;
        window.productosGlobales = prodData || [];
        
        const { data: varData } = await db.from('variaciones').select('*').order('id', { ascending: true });
        window.variacionesGlobales = varData || [];

        renderizarTablaProductos(window.productosGlobales);
    } catch (error) { 
        console.error("Error al cargar:", error); 
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error BD: ${error.message}</td></tr>`;
    }
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '';
    productos.forEach(prod => {
        
        const nombreReal = prod.producto || 'Sin Nombre';
        const safeRef = String(prod.ref).replace(/['"]/g, '');
        const safeNom = String(nombreReal).replace(/['"]/g, '');

        let urlImagen = `https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/productos/${safeRef}/${safeRef}.jpg`;
        if(typeof CUPISSA_CONFIG !== 'undefined' && CUPISSA_CONFIG.github) {
             urlImagen = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos/${safeRef}/${safeRef}.jpg`;
        }

        if (prod.imagenes_data) {
            try {
                let imgs = typeof prod.imagenes_data === 'string' ? JSON.parse(prod.imagenes_data) : prod.imagenes_data;
                if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].url && imgs[0].url !== 'cascada') {
                    let rawUrl = String(imgs[0].url);
                    urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/dianiluz/cupissa/main/${rawUrl.replace(/^\//, '')}`;
                } else if (imgs && !Array.isArray(imgs) && typeof imgs === 'object') {
                    let rawUrl = String(imgs.principal || Object.values(imgs)[0] || '');
                    if (rawUrl && rawUrl !== 'undefined') {
                        urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/dianiluz/cupissa/main/${rawUrl.replace(/^\//, '')}`;
                    }
                }
            } catch(e) {}
        }
        
        const precioReal = prod.precio_base || 0;
        const estadoTexto = prod.activo !== false ? 'SI' : 'NO';
        const claseEstado = prod.activo !== false ? 'estado-activo' : 'estado-inactivo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${urlImagen}" 
                     style="width:50px; height:50px; object-fit:cover; border-radius:4px;" 
                     onerror="window.manejarErrorImagen(this, '${safeRef}', '${safeNom}')">
            </td>
            <td><strong>${prod.ref}</strong></td>
            <td>${nombreReal} ${prod.x_temp === 'X' ? '⭐' : ''}</td>
            <td><span style="font-size:12px;">${prod.mundo || ''} <br> <small style="color:#db137a;">${prod.categoria || ''}</small></span></td>
            <td>$${Number(precioReal).toLocaleString()}</td>
            <td><span class="semaforo-estado ${claseEstado}">${estadoTexto}</span></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <button class="btn-accion btn-editar" onclick="window.editarProducto('${prod.ref}')">Editar</button>
                    <button class="btn-accion btn-eliminar" onclick="window.eliminarProducto('${prod.ref}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.eliminarProducto = async (ref) => {
    if (confirm(`¿Estás segura de ELIMINAR la ref ${ref}? Esta acción es irreversible.`)) {
        try {
            const db = inicializarDbAdmin();
            const { error } = await db.from('productos').delete().eq('ref', ref);
            if (error) throw error;
            window.mostrarToast("Producto eliminado del catálogo.", "exito");
            cargarProductos(); 
        } catch (err) {
            window.mostrarToast("Error al eliminar: " + err.message, "error");
        }
    }
};

window.editarProducto = (ref) => {
    const p = window.productosGlobales.find(prod => prod.ref === ref);
    if (p) window.abrirModalProducto(p);
};

window.abrirModalProducto = function(productoEdicion = null) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    document.querySelectorAll('.crop-container').forEach(c => c.remove());

    const esEdicion = productoEdicion !== null;
    const refCalculada = esEdicion ? productoEdicion.ref : generarSiguienteReferencia();
    const nombreProd = productoEdicion ? (productoEdicion.producto || '') : '';
    const precioProd = productoEdicion ? (productoEdicion.precio_base || 0) : 0;
    
    window.imagenesListTemp = [];
    if (productoEdicion && productoEdicion.imagenes_data) {
        try {
            const arr = typeof productoEdicion.imagenes_data === 'string' ? JSON.parse(productoEdicion.imagenes_data) : productoEdicion.imagenes_data;
            if (Array.isArray(arr)) {
                window.imagenesListTemp = arr;
            } else if (arr && typeof arr === 'object') {
                const rawUrl = String(arr.principal || Object.values(arr)[0] || '');
                if (rawUrl && rawUrl !== 'undefined') {
                    window.imagenesListTemp.push({
                        color: 'Original',
                        base64: null,
                        url: rawUrl,
                        ref: productoEdicion.ref,
                        nombre: productoEdicion.producto
                    });
                }
            }
        } catch(e) {}
    }

    if (esEdicion && window.imagenesListTemp.length === 0) {
        window.imagenesListTemp.push({
            color: 'Original (Antigua)',
            base64: null,
            url: 'cascada', 
            ref: productoEdicion.ref,
            nombre: productoEdicion.producto
        });
    }

    let tallasProd = productoEdicion ? (productoEdicion.tallas || '') : '';
    const tallasProdLimpio = tallasProd.startsWith('#') ? tallasProd.substring(1) : tallasProd;
    const modalidadProd = productoEdicion ? (productoEdicion.modalidad || '') : '';

    let seleccionadasIds = [];
    if (productoEdicion && productoEdicion.variaciones_ids) {
        seleccionadasIds = typeof productoEdicion.variaciones_ids === 'string' ? productoEdicion.variaciones_ids.split(',') : [String(productoEdicion.variaciones_ids)];
    }

    let checkListHtml = '';
    window.variacionesGlobales.forEach((v) => {
        const idVar = String(v.id);
        let aplicaAuto = false;
        if (esEdicion) aplicaAuto = window.productoCumpleCondicion(productoEdicion, v.columna, v.valor);
        
        const isChecked = (seleccionadasIds.includes(idVar) || aplicaAuto) ? 'checked' : '';
        checkListHtml += `
            <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f0f0f0; font-size:12px; cursor:pointer;">
                <input type="checkbox" class="check-var" value="${idVar}" ${isChecked}>
                <span>${(v.columna||'')} > <b>${(v.valor||'')}</b> <span style="color:#db137a">(+$${Number(v.incremento).toLocaleString()})</span></span>
            </label>
        `;
    });

    const modalHtml = `
        <div class="modal-overlay" id="modal-producto">
            <div class="modal-content" style="max-width: 950px; height: 95vh; overflow-y: auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x">&times;</button>
                <h2 style="color:#db137a; font-family:'Bree Serif';">Editor Cupissa: ${refCalculada}</h2>
                
                <div id="div-crear-producto" class="form-grid">
                    <div class="form-group"><label>Ref</label><input type="text" id="prod-ref" value="${refCalculada}" readonly style="background:#fdf2f8;"></div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select id="prod-activo">
                            <option value="true" ${productoEdicion?.activo !== false ? 'selected' : ''}>SI (Visible)</option>
                            <option value="false" ${productoEdicion?.activo === false ? 'selected' : ''}>NO (Oculto)</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label>Nombre del Producto *</label><input type="text" id="prod-nombre" value="${nombreProd}" required></div>
                    
                    <div class="form-group" style="position:relative;">
                        <label>Mundo</label>
                        <input type="text" id="prod-mundo" value="${productoEdicion?.mundo || ''}" autocomplete="off">
                        <div id="sugg-mundo" class="suggestions-panel" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:150px; overflow-y:auto; z-index:100;"></div>
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label>Categoría</label>
                        <input type="text" id="prod-categoria" value="${productoEdicion?.categoria || ''}" autocomplete="off">
                        <div id="sugg-categoria" class="suggestions-panel" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:150px; overflow-y:auto; z-index:100;"></div>
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label>Subcategoría</label>
                        <input type="text" id="prod-sub" value="${productoEdicion?.subcategoria || ''}" autocomplete="off">
                        <div id="sugg-sub" class="suggestions-panel" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:150px; overflow-y:auto; z-index:100;"></div>
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label>Temática</label>
                        <input type="text" id="prod-tematica" value="${productoEdicion?.tematica || ''}" autocomplete="off">
                        <div id="sugg-tematica" class="suggestions-panel" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:150px; overflow-y:auto; z-index:100;"></div>
                    </div>

                    <div class="form-group"><label>Para Quién (Opcional)</label><input type="text" id="prod-para-quien" value="${productoEdicion?.para_quien || ''}"></div>
                    <div class="form-group"><label>Temporada a la que pertenece</label><input type="text" id="prod-temporada" value="${productoEdicion?.temporada || ''}"></div>
                    
                    <div class="form-group">
                        <label>¿Es Personalizable?</label>
                        <select id="prod-personalizable">
                            <option value="NO" ${productoEdicion?.personalizable === 'NO' ? 'selected' : ''}>NO</option>
                            <option value="SI" ${productoEdicion?.personalizable === 'SI' ? 'selected' : ''}>SI (Mostrar caja de texto)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Complementos (Separar con |)</label>
                        <input type="text" id="prod-complementos" value="${productoEdicion?.complementos || ''}" placeholder="Ej: Vincha | Medias de encaje">
                    </div>

                    <div class="form-group"><label>Tallas Base (separar con |)</label><input type="text" id="prod-tallas" value="${tallasProdLimpio}"></div>
                    <div class="form-group"><label>Colores (Meta-Tags, separar con |)</label><input type="text" id="prod-colores" value="${productoEdicion?.colores || ''}" placeholder="Ej: Rojo | Blanco"></div>

                    <div class="form-group" style="grid-column: 1 / -1; display:flex; gap:15px; align-items:center;">
                        <div>
                            <label>Modalidad</label>
                            <div style="display:flex; gap:15px; padding-top:5px;">
                                <label style="cursor:pointer;"><input type="checkbox" id="check-compra" style="width:auto;"> Compra</label>
                                <label style="cursor:pointer;"><input type="checkbox" id="check-alquiler" style="width:auto;"> Alquiler</label>
                            </div>
                        </div>
                        <div style="flex:1;">
                            <label>Página de Inicio (X-Temp)</label>
                            <div style="padding-top:5px;">
                                <label style="color:#db137a; font-weight:bold; cursor:pointer;">
                                    <input type="checkbox" id="prod-x-temp" ${productoEdicion?.x_temp === 'X' ? 'checked' : ''} style="width:18px; height:18px;"> ⭐ Activo
                                </label>
                            </div>
                        </div>
                        <div style="flex:1;">
                            <label style="color:#10b981; font-weight:bold;">Precio Base *</label>
                            <input type="number" id="prod-precio" value="${precioProd}" style="border-color:#10b981; font-size:16px;">
                        </div>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1; background:#fdf2f8; padding:15px; border-radius:10px; border:2px dashed #db137a;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <label style="color:#db137a; font-weight:bold;">📸 Galería de Colores</label>
                            <span style="font-size:11px; color:#666;">Guardado inteligente SEO</span>
                        </div>
                        <div id="galeria-preview" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 15px;"></div>
                        <div style="display:flex; gap:10px; background:#fff; padding:10px; border-radius:8px;">
                            <input type="text" id="img-color-input" placeholder="Color de la foto (Ej: Rojo)" style="flex:1;">
                            <button type="button" id="btn-activar-camara" class="btn-secundario" style="margin:0;">Buscar Imagen a Recortar</button>
                            <input type="file" id="file-input-multi" accept="image/*" style="display:none;">
                        </div>
                    </div>

                    <div style="grid-column: 1 / -1; display:grid; grid-template-columns: 1fr 1fr; gap:20px; border:1px solid #db137a; padding:15px; border-radius:10px;">
                        <div>
                            <label style="color:#db137a; font-weight:bold;">+ Nueva Variación Global</label>
                            <input type="text" id="m-col" placeholder="Columnas (ej: CATEGORIA)" style="width:100%; margin-bottom:5px;">
                            <input type="text" id="m-val" placeholder="Valores (ej: NIÑAS)" style="width:100%; margin-bottom:5px;">
                            <input type="number" id="m-inc" placeholder="Incremento $" style="width:100%; margin-bottom:10px;">
                            <button type="button" id="btn-manual-add" class="btn-primario" style="width:100%;">Añadir a BD</button>
                        </div>
                        <div>
                            <label style="color:#db137a; font-weight:bold;">Variaciones Aplicadas</label>
                            <div id="container-checks" style="max-height:180px; overflow-y:auto; border:1px solid #eee; padding:5px;">
                                ${checkListHtml}
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions" style="grid-column: 1 / -1; text-align:right;">
                        <button type="button" id="btn-cerrar-modal" class="btn-secundario">Cancelar</button>
                        <button type="button" id="btn-submit-prod" class="btn-primario">GUARDAR PRODUCTO</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="crop-container" id="crop-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:500000; justify-content:center; align-items:center;">
            <div style="background:white; padding:20px; border-radius:10px; max-width:600px; width:90%;">
                <div style="height:400px; background:#eee; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                    <img id="image-to-crop" style="max-width:100%; max-height:100%;">
                </div>
                <div style="margin-top:15px; text-align:right;">
                    <button type="button" id="btn-cancel-crop" class="btn-secundario">Cancelar</button>
                    <button type="button" id="btn-do-crop" class="btn-primario">Aplicar Recorte y Adjuntar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const btnGuardar = document.getElementById('btn-submit-prod');
    btnGuardar.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const nombreVal = document.getElementById('prod-nombre').value.trim();
            if (!nombreVal) throw new Error("Debes escribir el Nombre del Producto.");

            btnGuardar.disabled = true; 
            btnGuardar.textContent = "Procesando...";

            let nombreValFormateado = nombreVal.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '-');
            let imagenesModificadas = false;

            if (window.imagenesListTemp.some(img => img.base64)) {
                imagenesModificadas = true;
            } else {
                const fotosEnEditor = window.imagenesListTemp.filter(img => img.url !== 'cascada').length;
                let fotosEnBD = 0;
                if (productoEdicion && productoEdicion.imagenes_data) {
                    const arr = typeof productoEdicion.imagenes_data === 'string' ? JSON.parse(productoEdicion.imagenes_data) : productoEdicion.imagenes_data;
                    if (Array.isArray(arr)) fotosEnBD = arr.length;
                    else if (arr && typeof arr === 'object') fotosEnBD = 1;
                }
                if (fotosEnEditor !== fotosEnBD) {
                    imagenesModificadas = true;
                }
            }

            let dataImagenesAGuardar = null;

            if (imagenesModificadas) {
                let imagenesFinales = [];
                for (let idx = 0; idx < window.imagenesListTemp.length; idx++) {
                    let img = window.imagenesListTemp[idx];
                    if (img.base64) {
                        let colorLimpio = (img.color || 'defecto').toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '-');
                        let fileNamePath = `${refCalculada}/${nombreValFormateado}-${refCalculada}-${colorLimpio}.jpg`; 
                        
                        const res = await fetch(CUPISSA_CONFIG.API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'subirFotoGithub', token: CUPISSA_CONFIG.API_TOKEN, nombre_archivo: fileNamePath, base64: img.base64 })
                        });
                        const data = await res.json();
                        if (data.success) {
                            imagenesFinales.push({ color: img.color, url: data.url }); 
                        } else {
                            throw new Error("GitHub rechazó la foto: " + data.error);
                        }
                    } else if (img.url !== 'cascada') {
                        imagenesFinales.push({ color: img.color, url: img.url });
                    }
                }
                dataImagenesAGuardar = imagenesFinales.length > 0 ? JSON.stringify(imagenesFinales) : null;
            } else {
                dataImagenesAGuardar = esEdicion ? productoEdicion.imagenes_data : null;
            }

            let variacionesSeleccionadas = [];
            const checkboxes = document.querySelectorAll('.check-var');
            for (let i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checked) variacionesSeleccionadas.push(String(checkboxes[i].value).trim());
            }
            const strVariaciones = variacionesSeleccionadas.length > 0 ? variacionesSeleccionadas.join(',') : "";

            const checkCompra = document.getElementById('check-compra').checked;
            const checkAlquiler = document.getElementById('check-alquiler').checked;
            let modalidadResult = "";
            if (checkCompra && checkAlquiler) modalidadResult = "#COMPRA|ALQUILER";
            else if (checkCompra) modalidadResult = "#COMPRA";
            else if (checkAlquiler) modalidadResult = "#ALQUILER";

            let tallasGuardar = document.getElementById('prod-tallas').value.trim();
            if (tallasGuardar !== '' && !tallasGuardar.startsWith('#')) { tallasGuardar = '#' + tallasGuardar; }

            const dataToSave = {
                activo: document.getElementById('prod-activo').value === 'true',
                producto: nombreVal,
                mundo: document.getElementById('prod-mundo').value,
                categoria: document.getElementById('prod-categoria').value,
                subcategoria: document.getElementById('prod-sub').value,
                tematica: document.getElementById('prod-tematica').value,
                para_quien: document.getElementById('prod-para-quien').value,
                tallas: tallasGuardar, 
                colores: document.getElementById('prod-colores').value,
                modalidad: modalidadResult,
                temporada: document.getElementById('prod-temporada').value,
                x_temp: document.getElementById('prod-x-temp').checked ? 'X' : '',
                precio_base: Number(document.getElementById('prod-precio').value) || 0,
                variaciones_ids: strVariaciones, 
                personalizable: document.getElementById('prod-personalizable').value,
                complementos: document.getElementById('prod-complementos').value,
                imagenes_data: dataImagenesAGuardar
            };

            const db = inicializarDbAdmin();
            if (esEdicion) {
                const { error } = await db.from("productos").update(dataToSave).eq('ref', refCalculada);
                if(error) throw error;
            } else {
                dataToSave.ref = refCalculada;
                dataToSave.fecha_creacion = new Date().toISOString();
                const { error } = await db.from("productos").insert([dataToSave]);
                if(error) throw error;
            }

            window.mostrarToast("¡Producto Guardado con Éxito!", "exito");
            document.getElementById('modal-producto').remove();
            cargarProductos(); 

        } catch (error) {
            console.error(error);
            window.mostrarToast(error.message, "error");
            btnGuardar.disabled = false; 
            btnGuardar.textContent = "GUARDAR PRODUCTO";
        }
    });

    document.getElementById('btn-x').onclick = () => document.getElementById('modal-producto').remove();
    document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-producto').remove();

    if (esEdicion && modalidadProd) {
        if (modalidadProd.includes('COMPRA')) document.getElementById('check-compra').checked = true;
        if (modalidadProd.includes('ALQUILER')) document.getElementById('check-alquiler').checked = true;
    }

    const configAutocompletado = [
        { inputId: 'prod-mundo', suggId: 'sugg-mundo', columna: 'mundo' },
        { inputId: 'prod-categoria', suggId: 'sugg-categoria', columna: 'categoria' },
        { inputId: 'prod-sub', suggId: 'sugg-sub', columna: 'subcategoria' },
        { inputId: 'prod-tematica', suggId: 'sugg-tematica', columna: 'tematica' }
    ];

    configAutocompletado.forEach(cfg => {
        const input = document.getElementById(cfg.inputId);
        const panel = document.getElementById(cfg.suggId);
        if (!input || !panel) return;
        const valoresExistentes = [...new Set(window.productosGlobales.map(p => p[cfg.columna]).filter(v => v && v.trim() !== '' && !v.startsWith('#')).map(v => v.trim()))].sort();
        input.addEventListener('input', function() {
            const val = this.value.trim().toLowerCase();
            panel.innerHTML = '';
            if (val.length < 1) { panel.style.display = 'none'; return; }
            const filtrados = valoresExistentes.filter(v => v.toLowerCase().includes(val));
            if (filtrados.length > 0) {
                filtrados.forEach(v => {
                    const div = document.createElement('div');
                    div.style.padding = "8px 10px"; div.style.cursor = "pointer"; div.style.borderBottom = "1px solid #eee"; div.style.fontSize = "13px";
                    div.textContent = v;
                    div.onclick = function() { input.value = v; panel.style.display = 'none'; };
                    panel.appendChild(div);
                });
                panel.style.display = 'block';
            } else { panel.style.display = 'none'; }
        });
        document.addEventListener('click', function(e) { if (e.target !== input) panel.style.display = 'none'; });
    });

    const fileInputMulti = document.getElementById('file-input-multi');
    const cropContainer = document.getElementById('crop-container');
    const imageToCrop = document.getElementById('image-to-crop');
    let cropper = null;

    document.getElementById('btn-activar-camara').onclick = () => {
        const colorInput = document.getElementById('img-color-input').value.trim();
        if (!colorInput) {
            window.mostrarToast("⚠️ Escribe el nombre del color ANTES de buscar la foto.", "error");
            document.getElementById('img-color-input').focus();
            return;
        }
        fileInputMulti.click();
    };

    fileInputMulti.onchange = (ev) => {
        const colorInput = document.getElementById('img-color-input').value.trim();
        if (!colorInput) {
            window.mostrarToast("⚠️ Escribe el nombre del color.", "error");
            ev.target.value = '';
            return;
        }
        const file = ev.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        
        imageToCrop.onload = () => {
            cropContainer.style.display = 'flex';
            if(cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, { viewMode: 1 });
        };
        
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('btn-do-crop').addEventListener('click', (e) => {
        e.preventDefault();
        try {
            const colorDesignado = document.getElementById('img-color-input').value.trim();
            if (!colorDesignado) throw new Error("⚠️ El color es obligatorio.");
            if (!cropper) throw new Error("La herramienta de recorte no está lista.");
            
            const canvas = cropper.getCroppedCanvas({ maxWidth: 1000, maxHeight: 1000 });
            if (!canvas) throw new Error("No se pudo generar el recorte.");
            
            const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            window.imagenesListTemp.push({ color: colorDesignado, base64: b64, url: '' });
            window.renderizarGaleriaTemp();
            
            document.getElementById('img-color-input').value = '';
            cropContainer.style.display = 'none';
            cropper.destroy();
            cropper = null;
        } catch (err) {
            window.mostrarToast(err.message, "error");
        }
    });

    document.getElementById('btn-cancel-crop').onclick = (e) => {
        e.preventDefault(); 
        cropContainer.style.display = 'none'; 
        if(cropper) cropper.destroy(); 
        cropper = null;
        fileInputMulti.value = '';
    };

    window.renderizarGaleriaTemp = function() {
        const gal = document.getElementById('galeria-preview');
        if (!gal) return;
        gal.innerHTML = '';
        
        if (!window.imagenesListTemp || window.imagenesListTemp.length === 0) {
            gal.innerHTML = `<span style="font-size:12px; color:#888;">Sube las fotos por color.</span>`; 
            return;
        }

        window.imagenesListTemp.forEach((img, idx) => {
            try {
                let imgHtml = '';
                const safeRefImg = String(img.ref || refCalculada).replace(/['"]/g, '');
                const safeNomImg = String(img.nombre || document.getElementById('prod-nombre').value).replace(/['"]/g, '');

                if (img.base64) {
                    imgHtml = `<img src="data:image/jpeg;base64,${img.base64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    let startUrl = `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/assets/productos/${safeRefImg}/${safeRefImg}.jpg`;
                    
                    if (img.url && img.url !== 'cascada') {
                        startUrl = img.url.startsWith('http') ? img.url : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${img.url.replace(/^\//, '')}`;
                    }
                    imgHtml = `<img src="${startUrl}" onerror="window.manejarErrorImagen(this, '${safeRefImg}', '${safeNomImg}')" style="width:100%; height:100%; object-fit:cover;">`;
                }
                
                const card = document.createElement('div');
                card.style = "position:relative; width:80px; height:80px; border-radius:8px; border:1px solid #ccc; overflow:hidden;";
                card.innerHTML = `
                    ${imgHtml}
                    <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.6); color:white; font-size:10px; text-align:center; padding:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${img.color || 'Defecto'}</div>
                    <button type="button" style="position:absolute; top:2px; right:2px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-weight:bold; font-size:10px;" onclick="window.imagenesListTemp.splice(${idx}, 1); window.renderizarGaleriaTemp();">X</button>
                `;
                gal.appendChild(card);
            } catch(e) {}
        });
    };
    
    window.renderizarGaleriaTemp();

    document.getElementById('btn-manual-add').onclick = async () => {
        const c = document.getElementById('m-col').value.trim();
        const v = document.getElementById('m-val').value.trim();
        const i = document.getElementById('m-inc').value.trim();
        
        if(c && v && i) {
            const colMayus = c.toUpperCase();
            const valMayus = v.toUpperCase();
            const incNum = Number(i);

            const duplicada = window.variacionesGlobales.find(vg => 
                String(vg.columna).toUpperCase().replace(/\s+/g, '') === colMayus.replace(/\s+/g, '') && 
                String(vg.valor).toUpperCase().replace(/\s+/g, '') === valMayus.replace(/\s+/g, '')
            );

            if (duplicada) {
                window.mostrarToast(`⚠️ La variación [${colMayus} > ${valMayus}] ya existe. No puedes duplicarla.`, "error");
                return;
            }

            const nuevaVar = { columna: colMayus, valor: valMayus, incremento: incNum };
            
            const db = inicializarDbAdmin();
            const { data, error } = await db.from("variaciones").insert([nuevaVar]).select();
            if (error) { window.mostrarToast("Error BD: " + error.message, "error"); } 
            else { 
                window.mostrarToast("Variación guardada y aplicada.", "exito"); 
                document.getElementById('m-col').value = ""; document.getElementById('m-val').value = ""; document.getElementById('m-inc').value = "";
                
                if (data && data.length > 0) {
                    const nuevaReglaBD = data[0];
                    window.variacionesGlobales.push(nuevaReglaBD); 
                    const idVar = String(nuevaReglaBD.id);
                    const labelHtml = `
                        <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f0f0f0; font-size:12px; cursor:pointer; background:#fdf2f8;">
                            <input type="checkbox" class="check-var" value="${idVar}" checked>
                            <span>${(nuevaReglaBD.columna||'')} > <b>${(nuevaReglaBD.valor||'')}</b> <span style="color:#db137a">(+$${Number(nuevaReglaBD.incremento).toLocaleString()})</span></span>
                        </label>
                    `;
                    document.getElementById('container-checks').insertAdjacentHTML('beforeend', labelHtml);
                }
            }
        } else { window.mostrarToast("Llena los 3 campos de la variación.", "error"); }
    };
};

function generarSiguienteReferencia() {
    const anioActual = new Date().getFullYear();
    const prefijo = `CUP${anioActual}`;
    const refs = window.productosGlobales.map(p => p.ref || "").filter(r => r.startsWith(prefijo));
    if (refs.length === 0) return `${prefijo}001`;
    const numRefs = refs.map(r => parseInt(r.replace(prefijo, ""))).filter(n => !isNaN(n));
    const max = Math.max(...numRefs);
    return `${prefijo}${String(max + 1).padStart(3, '0')}`;
}