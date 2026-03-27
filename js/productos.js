window.productosGlobales = [];
window.variacionesGlobales = [];

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

// --- EVALUADOR DE VARIACIONES (MULTICOLUMNA BLINDADO) ---
window.productoCumpleCondicion = function(prod, columnasStr, valoresStr) {
    if (!columnasStr || !valoresStr) return true;

    // Detectar si usan coma (nuevo formato) o separador vertical (viejo)
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
            const modalesProd = document.querySelectorAll('#modal-producto');
            const modalProd = modalesProd[modalesProd.length - 1]; 
            if (modalProd) modalProd.style.zIndex = '200000'; 
            document.querySelectorAll('.res-prod-flotante').forEach(el => el.style.display = 'none');
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
            (p.producto || p['*producto'] || "").toLowerCase().includes(term) ||
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
        const { data: prodData, error: errProd } = await window.supabase.from('productos').select('*').order('ref', { ascending: true });
        if(errProd) throw errProd;
        window.productosGlobales = prodData || [];
        
        const { data: varData } = await window.supabase.from('variaciones').select('*').order('id', { ascending: true });
        window.variacionesGlobales = varData || [];

        renderizarTablaProductos(window.productosGlobales);
    } catch (error) { 
        console.error("Error al cargar:", error); 
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Fallo al conectar con la nueva base de datos. Verifica las políticas de seguridad (RLS) en Supabase.</td></tr>`;
    }
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '';
    productos.forEach(prod => {
        
        let urlImagen = 'https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png';
        if (prod.imagenes_data) {
            try {
                let imgs = typeof prod.imagenes_data === 'string' ? JSON.parse(prod.imagenes_data) : prod.imagenes_data;
                if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].url) {
                    let rawUrl = imgs[0].url;
                    urlImagen = rawUrl.startsWith('http') ? rawUrl : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${rawUrl}`;
                }
            } catch(e) { console.warn("Error leyendo JSON de imágenes para", prod.ref); }
        }
        
        const precioReal = prod.precio_base !== undefined && prod.precio_base !== null ? prod.precio_base : 0;
        const nombreReal = prod.producto || 'Sin Nombre';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${urlImagen}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.src='https://raw.githubusercontent.com/dianiluz/cupissa/main/assets/logo.png'"></td>
            <td><strong>${prod.ref}</strong></td>
            <td>${nombreReal} ${prod.x_temp === 'X' ? '⭐' : ''}</td>
            <td><span style="font-size:12px;">${prod.mundo || ''} <br> <small style="color:#db137a;">${prod.categoria || ''}</small></span></td>
            <td>$${Number(precioReal).toLocaleString()}</td>
            <td><span class="semaforo-estado ${prod.activo === 'SI' ? 'estado-activo' : 'estado-inactivo'}">${prod.activo || 'SI'}</span></td>
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
    if (confirm(`¿Estás 100% segura de que deseas ELIMINAR el producto ${ref}? Esta acción no se puede deshacer.`)) {
        try {
            const { error } = await window.supabase.from('productos').delete().eq('ref', ref);
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
            window.imagenesListTemp = typeof productoEdicion.imagenes_data === 'string' ? JSON.parse(productoEdicion.imagenes_data) : productoEdicion.imagenes_data;
        } catch(e) { window.imagenesListTemp = []; }
    }

    let tallasProd = productoEdicion ? (productoEdicion.tallas || '') : '';
    const tallasProdLimpio = tallasProd.startsWith('#') ? tallasProd.substring(1) : tallasProd;
    
    const modalidadProd = productoEdicion ? (productoEdicion.modalidad || '') : '';

    let seleccionadasIds = [];
    if (productoEdicion && productoEdicion.variaciones_ids) {
        seleccionadasIds = typeof productoEdicion.variaciones_ids === 'string' ? productoEdicion.variaciones_ids.split(',') : productoEdicion.variaciones_ids;
    }

    let checkListHtml = '';
    window.variacionesGlobales.forEach((v) => {
        const idVar = String(v.id);
        let aplicaAuto = false;
        if (esEdicion) aplicaAuto = window.productoCumpleCondicion(productoEdicion, v.columna, v.valor);
        
        const isChecked = seleccionadasIds.includes(idVar) || aplicaAuto;
        const checked = isChecked ? 'checked' : '';
        
        checkListHtml += `
            <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f0f0f0; font-size:12px; cursor:pointer;">
                <input type="checkbox" class="check-var" value="${idVar}" ${checked}>
                <span>${(v.columna||'').substring(0,20)} > <b>${(v.valor||'').substring(0,20)}</b> <span style="color:#db137a">(+$${Number(v.incremento).toLocaleString()})</span></span>
            </label>
        `;
    });

    const modalHtml = `
        <div class="modal-overlay" id="modal-producto">
            <div class="modal-content" style="max-width: 950px; height: 95vh; overflow-y: auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x">&times;</button>
                <h2 style="color:#db137a; font-family:'Bree Serif';">Editor Cupissa: ${refCalculada}</h2>
                
                <div id="div-crear-producto" class="form-grid">
                    
                    <div class="form-group"><label>Ref (Auto-Carpetas Activo)</label><input type="text" id="prod-ref" value="${refCalculada}" readonly style="background:#fdf2f8;"></div>
                    <div class="form-group"><label>Estado</label><select id="prod-activo"><option value="SI" ${productoEdicion?.activo==='SI'?'selected':''}>SI (Visible)</option><option value="NO" ${productoEdicion?.activo==='NO'?'selected':''}>NO (Oculto)</option></select></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label>Nombre del Producto</label><input type="text" id="prod-nombre" value="${nombreProd}" required></div>
                    
                    <div class="form-group" style="position:relative;">
                        <label>Mundo</label>
                        <input type="text" id="prod-mundo" value="${productoEdicion?.mundo || ''}" autocomplete="off">
                        <div id="sugg-mundo" class="suggestions-panel" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:150px; overflow-y:auto; z-index:100; border-radius:0 0 5px 5px;"></div>
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

                    <div class="form-group"><label>Para Quién (Opcional)</label><input type="text" id="prod-para-quien" value="${productoEdicion?.para_quien || ''}" placeholder="Ej: Niñas, Bebés"></div>
                    <div class="form-group"><label>Temporada a la que pertenece</label><input type="text" id="prod-temporada" value="${productoEdicion?.temporada || ''}" placeholder="Ej: Verano 2026"></div>
                    <div class="form-group"><label>Tallas Base (separar con |)</label><input type="text" id="prod-tallas" value="${tallasProdLimpio}" placeholder="Ej: 0-6M|6-12M|2-4"></div>
                    <div class="form-group"><label>Colores Disponibles (Meta-Tags)</label><input type="text" id="prod-colores" value="${productoEdicion?.colores || ''}" placeholder="Ej: Rojo|Azul|Blanco"></div>

                    <div class="form-group" style="grid-column: 1 / -1; display:flex; gap:15px; align-items:center;">
                        <div>
                            <label>Modalidad</label>
                            <div style="display:flex; gap:15px; padding-top:5px; align-items:center;">
                                <label style="display:flex; align-items:center; gap:5px; font-weight:normal; cursor:pointer;"><input type="checkbox" id="check-compra" style="width:auto;"> Compra</label>
                                <label style="display:flex; align-items:center; gap:5px; font-weight:normal; cursor:pointer;"><input type="checkbox" id="check-alquiler" style="width:auto;"> Alquiler</label>
                            </div>
                        </div>
                        <div style="flex:1;">
                            <label>Destacar en Página de Inicio (X-Temp)</label>
                            <div style="padding-top:5px;">
                                <label style="display:flex; align-items:center; gap:5px; font-weight:bold; cursor:pointer; color:#db137a;">
                                    <input type="checkbox" id="prod-x-temp" ${productoEdicion?.x_temp === 'X' ? 'checked' : ''} style="width:18px; height:18px;">
                                    ⭐ Activo (Marcar con X)
                                </label>
                            </div>
                        </div>
                        <div style="flex:1;">
                            <label style="color:#10b981; font-weight:bold;">Precio Base Oficial</label>
                            <input type="number" id="prod-precio" value="${precioProd}" style="border-color:#10b981; font-size:16px;">
                        </div>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1; background:#fdf2f8; padding:15px; border-radius:10px; border:2px dashed #db137a;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <label style="color:#db137a; font-weight:bold; font-size:16px;">📸 Galería de Colores</label>
                            <span style="font-size:11px; color:#666;">Las fotos se guardarán auto en: assets/productos/${refCalculada}/</span>
                        </div>
                        
                        <div id="galeria-preview" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 15px;">
                            </div>

                        <div style="display:flex; gap:10px; align-items:center; background:#fff; padding:10px; border-radius:8px;">
                            <input type="text" id="img-color-input" placeholder="Escribe el color de la foto (Ej: Rojo, Defecto)" style="flex:1; border:1px solid #ccc;">
                            <button type="button" id="btn-activar-camara" class="btn-secundario" style="margin:0;">Buscar Imagen a Recortar</button>
                            <input type="file" id="file-input-multi" accept="image/*" style="display:none;">
                        </div>
                    </div>

                    <div style="grid-column: 1 / -1; display:grid; grid-template-columns: 1fr 1fr; gap:20px; border:1px solid #db137a; padding:15px; border-radius:10px; background:white;">
                        <div>
                            <label style="color:#db137a; font-weight:bold;">+ Nueva Regla de Variación</label>
                            <input type="text" id="m-col" placeholder="Columnas (ej: CATEGORIA, TALLA)" style="width:100%; margin-bottom:5px;">
                            <input type="text" id="m-val" placeholder="Valores (ej: NIÑAS, 6-8)" style="width:100%; margin-bottom:5px;">
                            <input type="number" id="m-inc" placeholder="Incremento en $" style="width:100%; margin-bottom:10px;">
                            <button type="button" id="btn-manual-add" class="btn-primario" style="width:100%;">Añadir Variación a Base de Datos</button>
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
                        <button type="button" id="btn-submit-prod" class="btn-primario">GUARDAR PRODUCTO COMPLETO</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="crop-container" id="crop-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:500000; justify-content:center; align-items:center;">
            <div style="background:white; padding:20px; border-radius:10px; max-width:600px; width:90%;">
                <div style="height:400px; background:#eee; overflow:hidden; display:flex; justify-content:center; align-items:center;"><img id="image-to-crop" style="max-width:100%; max-height:100%;"></div>
                <div style="margin-top:15px; text-align:right;">
                    <button id="btn-cancel-crop" class="btn-secundario">Cancelar</button>
                    <button id="btn-do-crop" class="btn-primario">Aplicar Recorte y Adjuntar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-x').onclick = () => document.getElementById('modal-producto').remove();
    document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-producto').remove();

    if (esEdicion && modalidadProd) {
        if (modalidadProd.includes('COMPRA')) document.getElementById('check-compra').checked = true;
        if (modalidadProd.includes('ALQUILER')) document.getElementById('check-alquiler').checked = true;
    }

    // --- LÓGICA DE AUTOCOMPLETADO RÁPIDO ---
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

        const valoresExistentes = [...new Set(window.productosGlobales
            .map(p => p[cfg.columna]) 
            .filter(v => v && v.trim() !== '' && !v.startsWith('#')) 
            .map(v => v.trim())
        )].sort();

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
                    div.onmouseover = function() { this.style.background = "#fdf2f8"; };
                    div.onmouseout = function() { this.style.background = "white"; };
                    panel.appendChild(div);
                });
                panel.style.display = 'block';
            } else { panel.style.display = 'none'; }
        });
        document.addEventListener('click', function(e) { if (e.target !== input) panel.style.display = 'none'; });
    });

    // --- MOTOR DE GALERÍA MÚLTIPLE ---
    const btnActivarCam = document.getElementById('btn-activar-camara');
    const fileInputMulti = document.getElementById('file-input-multi');
    const cropContainer = document.getElementById('crop-container');
    const imageToCrop = document.getElementById('image-to-crop');
    let cropper = null;

    btnActivarCam.onclick = () => {
        if (!document.getElementById('img-color-input').value.trim()) {
            window.mostrarToast("Escribe un color antes de subir la foto.", "error"); return;
        }
        fileInputMulti.click();
    };

    fileInputMulti.onchange = (ev) => {
        const file = ev.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            cropContainer.style.display = 'flex';
            if(cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, { viewMode: 1 });
        };
        reader.readAsDataURL(file);
    };

    window.renderizarGaleriaTemp = function() {
        const gal = document.getElementById('galeria-preview');
        gal.innerHTML = '';
        if (window.imagenesListTemp.length === 0) {
            gal.innerHTML = `<span style="font-size:12px; color:#888;">No hay imágenes cargadas.</span>`; return;
        }
        window.imagenesListTemp.forEach((img, idx) => {
            let srcRender = img.base64 ? `data:image/jpeg;base64,${img.base64}` : (img.url.startsWith('http') ? img.url : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${img.url}`);
            const card = document.createElement('div');
            card.style = "position:relative; width:80px; height:80px; border-radius:8px; border:1px solid #ccc; overflow:hidden;";
            card.innerHTML = `
                <img src="${srcRender}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.6); color:white; font-size:10px; text-align:center; padding:2px;">${img.color}</div>
                <button type="button" style="position:absolute; top:2px; right:2px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-weight:bold; font-size:10px;" onclick="window.imagenesListTemp.splice(${idx}, 1); window.renderizarGaleriaTemp();">X</button>
            `;
            gal.appendChild(card);
        });
    };

    document.getElementById('btn-do-crop').onclick = (e) => {
        e.preventDefault();
        const colorDesignado = document.getElementById('img-color-input').value.trim() || 'Defecto';
        const canvas = cropper.getCroppedCanvas({ maxWidth: 1000, maxHeight: 1000 });
        const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        window.imagenesListTemp.push({ color: colorDesignado, base64: b64, url: '' });
        window.renderizarGaleriaTemp();
        document.getElementById('img-color-input').value = '';
        
        cropContainer.style.display = 'none';
        cropper.destroy();
    };

    document.getElementById('btn-cancel-crop').onclick = (e) => {
        e.preventDefault(); cropContainer.style.display = 'none'; if(cropper) cropper.destroy(); fileInputMulti.value = '';
    };
    
    window.renderizarGaleriaTemp();

    // --- GUARDAR VARIACIÓN MANUAL (NUEVA LÓGICA CORREGIDA) ---
    document.getElementById('btn-manual-add').onclick = async () => {
        const c = document.getElementById('m-col').value;
        const v = document.getElementById('m-val').value;
        const i = document.getElementById('m-inc').value;
        
        if(c && v && i) {
            const nuevaVar = { columna: c.toUpperCase(), valor: v.toUpperCase(), incremento: Number(i) };
            
            // Usamos .select() para que Supabase nos devuelva el ID de la fila recién creada
            const { data, error } = await window.supabase.from("variaciones").insert([nuevaVar]).select();
            
            if (error) { 
                window.mostrarToast("Error de permisos BD: " + error.message, "error"); 
            } else { 
                window.mostrarToast("Variación guardada y aplicada al producto.", "exito"); 
                
                // Limpiamos los campos
                document.getElementById('m-col').value = "";
                document.getElementById('m-val').value = "";
                document.getElementById('m-inc').value = "";

                // Inyectamos la nueva variación en el checklist inmediatamente
                if (data && data.length > 0) {
                    const nuevaReglaBD = data[0];
                    window.variacionesGlobales.push(nuevaReglaBD); // La guardamos en memoria
                    
                    const idVar = String(nuevaReglaBD.id);
                    const labelHtml = `
                        <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f0f0f0; font-size:12px; cursor:pointer; background:#fdf2f8;">
                            <input type="checkbox" class="check-var" value="${idVar}" checked>
                            <span>${(nuevaReglaBD.columna||'').substring(0,20)} > <b>${(nuevaReglaBD.valor||'').substring(0,20)}</b> <span style="color:#db137a">(+$${Number(nuevaReglaBD.incremento).toLocaleString()})</span></span>
                        </label>
                    `;
                    document.getElementById('container-checks').insertAdjacentHTML('beforeend', labelHtml);
                }
            }
        } else { 
            window.mostrarToast("Llena los 3 campos de la variación.", "error"); 
        }
    };

    // --- GUARDAR PRODUCTO OFICIAL ---
    document.getElementById('btn-submit-prod').onclick = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-prod');
        btn.disabled = true; btn.textContent = "Procesando Imágenes y Guardando...";

        try {
            let imagenesFinales = [];
            for (let idx = 0; idx < window.imagenesListTemp.length; idx++) {
                let img = window.imagenesListTemp[idx];
                if (img.base64) {
                    let colorLimpio = img.color.toLowerCase().replace(/[^a-z0-9]/g, '');
                    let fileNamePath = `${refCalculada}/${refCalculada}_${colorLimpio}_${Date.now()}.jpg`; 
                    
                    const res = await fetch(CUPISSA_CONFIG.API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'subirFotoGithub', nombre_archivo: fileNamePath, base64: img.base64 })
                    });
                    const data = await res.json();
                    if (data.success) {
                        imagenesFinales.push({ color: img.color, url: data.url }); 
                    } else {
                        throw new Error("GitHub rechazó la foto: " + data.error);
                    }
                } else {
                    imagenesFinales.push({ color: img.color, url: img.url });
                }
            }

            const idsSeleccionados = Array.from(document.querySelectorAll('.check-var:checked')).map(cb => cb.value);

            const checkCompra = document.getElementById('check-compra').checked;
            const checkAlquiler = document.getElementById('check-alquiler').checked;
            let modalidadResult = "";
            if (checkCompra && checkAlquiler) modalidadResult = "#COMPRA|ALQUILER";
            else if (checkCompra) modalidadResult = "#COMPRA";
            else if (checkAlquiler) modalidadResult = "#ALQUILER";

            let tallasGuardar = document.getElementById('prod-tallas').value.trim();
            if (tallasGuardar !== '' && !tallasGuardar.startsWith('#')) { tallasGuardar = '#' + tallasGuardar; }

            const dataToSave = {
                ref: refCalculada,
                activo: document.getElementById('prod-activo').value,
                producto: document.getElementById('prod-nombre').value,
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
                variaciones_ids: idsSeleccionados.join(','), 
                imagenes_data: JSON.stringify(imagenesFinales)
            };

            if (!esEdicion) { dataToSave.fecha_creacion = new Date().toISOString(); }

            const { error } = await window.supabase.from("productos").upsert(dataToSave, { onConflict: 'ref' });
            if (error) throw error;

            window.mostrarToast("¡Producto Guardado con Éxito en DB y GitHub!", "exito");
            document.getElementById('modal-producto').remove();
            cargarProductos();

        } catch (error) {
            console.error("Error Guardado Complejo:", error);
            window.mostrarToast("Fallo: " + (error.message || "Error Desconocido"), "error");
            btn.disabled = false; btn.textContent = "GUARDAR PRODUCTO COMPLETO";
        }
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