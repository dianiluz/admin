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

// --- TU EVALUADOR DE VARIACIONES ORIGINAL E INTACTO ---
window.productoCumpleCondicion = function(prod, columnasStr, valoresStr) {
    if (!columnasStr || !valoresStr) return true;

    const colsRegla = String(columnasStr).split('|').map(s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const valsRegla = String(valoresStr).split('|').map(s => s.trim().toUpperCase());

    let prodLimpio = {};
    for (let key in prod) {
        let keyLimpia = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Seguridad para campos vacíos en BD
        prodLimpio[keyLimpia] = String(prod[key] || '').toUpperCase().trim();
    }

    let cumple = true;
    for (let i = 0; i < colsRegla.length; i++) {
        const colBusqueda = colsRegla[i];
        const valorBuscado = valsRegla[i] || "";
        
        let llaveEncontrada = null;
        for(let keyProd in prodLimpio) {
            // Bloqueo de falso positivo entre 'subcategoria' y 'categoria'
            if (colBusqueda === 'subcategoria' && keyProd === 'categoria') continue;
            
            if(keyProd.includes(colBusqueda) || colBusqueda.includes(keyProd)) {
                llaveEncontrada = keyProd;
                break;
            }
        }
        
        if (llaveEncontrada) {
            const valorReal = prodLimpio[llaveEncontrada];
            if (valorReal === "" || valorReal.includes("TOD")) {
                continue; 
            }
            if (valorReal !== valorBuscado && !valorReal.includes(valorBuscado) && !valorBuscado.includes(valorReal)) {
                cumple = false;
                break;
            }
        } else {
            cumple = false; 
            break;
        }
    }
    return cumple;
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
        const { data: prodData } = await window.supabase.from('productos').select('*').order('ref', { ascending: true });
        window.productosGlobales = prodData || [];
        
        const { data: varData } = await window.supabase.from('variaciones').select('*').order('id', { ascending: true });
        window.variacionesGlobales = varData || [];

        renderizarTablaProductos(window.productosGlobales);
    } catch (error) { console.error("Error al cargar:", error); }
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '';
    productos.forEach(prod => {
        let urlImagen = 'assets/logo.png';
        if (prod.imagenurl) {
            urlImagen = prod.imagenurl.startsWith('http') ? prod.imagenurl : `https://raw.githubusercontent.com/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/${CUPISSA_CONFIG.github.branch}/${prod.imagenurl.split('|')[0]}`;
        }
        
        // Lee el precio real para que no salga en cero
        const precioReal = prod.precio_base !== undefined && prod.precio_base !== null ? prod.precio_base : (prod['*precio_base'] || 0);
        const nombreReal = prod.producto || prod['*producto'] || 'Sin Nombre';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${urlImagen}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.src='assets/logo.png'"></td>
            <td>${prod.ref}</td>
            <td>${nombreReal}</td>
            <td>${prod.mundo || prod['*mundo'] || ''} / ${prod.categoria || ''}</td>
            <td>$${Number(precioReal).toLocaleString()}</td>
            <td>${prod.activo || 'SI'}</td>
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
    // LIMPIEZA TOTAL PARA EVITAR ERRORES NULL Y FANTASMAS
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    document.querySelectorAll('.crop-container').forEach(c => c.remove());

    const esEdicion = productoEdicion !== null;
    const refCalculada = esEdicion ? productoEdicion.ref : generarSiguienteReferencia();
    
    const nombreProd = productoEdicion ? (productoEdicion.producto || productoEdicion['*producto'] || '') : '';
    const precioProd = productoEdicion ? (productoEdicion.precio_base !== undefined && productoEdicion.precio_base !== null ? productoEdicion.precio_base : (productoEdicion['*precio_base'] || 0)) : 0;
    const mundoProd = productoEdicion ? (productoEdicion.mundo || productoEdicion['*mundo'] || '') : '';
    const tallasProd = productoEdicion ? (productoEdicion.tallas || productoEdicion['*tallas'] || '') : '';

    let seleccionadasIds = [];
    if (productoEdicion && productoEdicion.variaciones_ids) {
        seleccionadasIds = typeof productoEdicion.variaciones_ids === 'string' ? productoEdicion.variaciones_ids.split(',') : productoEdicion.variaciones_ids;
    }

    // CHECKLIST DE VARIACIONES (CON TU DISEÑO ORIGINAL RESTAURADO)
    let checkListHtml = '';
    window.variacionesGlobales.forEach((v) => {
        const idVar = String(v.id);
        
        let aplicaAuto = false;
        if (esEdicion) aplicaAuto = window.productoCumpleCondicion(productoEdicion, v.columna, v.valor);
        
        const isChecked = seleccionadasIds.includes(idVar) || aplicaAuto;
        const checked = isChecked ? 'checked' : '';
        
        // Tu visualización original intacta
        checkListHtml += `
            <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f0f0f0; font-size:12px; cursor:pointer;">
                <input type="checkbox" class="check-var" value="${idVar}" ${checked}>
                <span>${(v.columna||'').split('|').pop()} > <b>${v.valor}</b> <span style="color:#db137a">(+$${Number(v.incremento).toLocaleString()})</span></span>
            </label>
        `;
    });

    const modalHtml = `
        <div class="modal-overlay" id="modal-producto">
            <div class="modal-content" style="max-width: 950px; height: 95vh; overflow-y: auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x">&times;</button>
                <h2 style="color:#db137a; font-family:'Bree Serif';">Editor Cupissa</h2>
                
                <div id="div-crear-producto" class="form-grid">
                    <div class="form-group"><label>Ref</label><input type="text" id="prod-ref" value="${refCalculada}" readonly style="background:#fdf2f8;"></div>
                    <div class="form-group"><label>Estado</label><select id="prod-activo"><option value="SI" ${productoEdicion?.activo==='SI'?'selected':''}>SI</option><option value="NO" ${productoEdicion?.activo==='NO'?'selected':''}>NO</option></select></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label>Nombre</label><input type="text" id="prod-nombre" value="${nombreProd}" required></div>
                    
                    <div class="form-group"><label>Mundo</label><input type="text" id="prod-mundo" value="${mundoProd}"></div>
                    <div class="form-group"><label>Categoría</label><input type="text" id="prod-categoria" value="${productoEdicion?.categoria || ''}"></div>
                    <div class="form-group"><label>Subcategoría</label><input type="text" id="prod-sub" value="${productoEdicion?.subcategoria || ''}"></div>
                    <div class="form-group"><label>Tallas Base</label><input type="text" id="prod-tallas" value="${tallasProd}"></div>
                    <div class="form-group"><label>Precio Base</label><input type="number" id="prod-precio" value="${precioProd}"></div>
                    <div class="form-group"><label>Temática</label><input type="text" id="prod-tematica" value="${productoEdicion?.tematica || ''}"></div>

                    <div class="form-group drop-zone" id="drop-zone" style="grid-column: 1 / -1; border: 3px dashed #db137a; background:#fdf2f8; padding:30px; text-align:center; border-radius:15px; cursor:pointer;">
                        <p id="txt-drop" style="color:#db137a; font-weight:bold;">📸 ARRASTRA O HAZ CLIC AQUÍ</p>
                        <input type="file" id="file-input" accept="image/*" style="display:none;">
                        <div id="preview-container"></div>
                    </div>

                    <div style="grid-column: 1 / -1; display:grid; grid-template-columns: 1fr 1fr; gap:20px; border:1px solid #db137a; padding:15px; border-radius:10px; background:white;">
                        <div>
                            <label style="color:#db137a; font-weight:bold;">+ Nueva Manual (Se guardará global)</label>
                            <input type="text" id="m-col" placeholder="Columna (ej: subcategoria|*tallas)" style="width:100%; margin-bottom:5px;">
                            <input type="text" id="m-val" placeholder="Valor (ej: personalizados|20-22)" style="width:100%; margin-bottom:5px;">
                            <input type="number" id="m-inc" placeholder="Incremento $" style="width:100%; margin-bottom:10px;">
                            <button type="button" id="btn-manual-add" class="btn-primario" style="width:100%;">Añadir y Guardar</button>
                        </div>
                        <div>
                            <label style="color:#db137a; font-weight:bold;">Checklist de Variaciones</label>
                            <div id="container-checks" style="max-height:180px; overflow-y:auto; border:1px solid #eee; padding:5px;">
                                ${checkListHtml}
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions" style="grid-column: 1 / -1; text-align:right;">
                        <button type="button" id="btn-cerrar-modal" class="btn-secundario">Cancelar</button>
                        <button type="button" id="btn-submit-prod" class="btn-primario">GUARDAR CAMBIOS</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="crop-container" id="crop-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:500000; justify-content:center; align-items:center;">
            <div style="background:white; padding:20px; border-radius:10px; max-width:500px; width:90%;">
                <div style="height:350px; background:#eee; overflow:hidden;"><img id="image-to-crop" style="max-width:100%;"></div>
                <div style="margin-top:15px; text-align:right;">
                    <button id="btn-cancel-crop" class="btn-secundario">Cancelar</button>
                    <button id="btn-do-crop" class="btn-primario">Aplicar Recorte</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // BINDINGS SEGUROS (Sin riesgo de Null)
    document.getElementById('btn-x').onclick = () => document.getElementById('modal-producto').remove();
    document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-producto').remove();

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const cropContainer = document.getElementById('crop-container');
    const imageToCrop = document.getElementById('image-to-crop');
    let cropper = null;
    let base64Recorte = null;

    dropZone.onclick = () => fileInput.click();
    ['dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); }));
    dropZone.addEventListener('drop', (ev) => { iniciarRecorte(ev.dataTransfer.files[0]); });
    fileInput.onchange = (ev) => { iniciarRecorte(ev.target.files[0]); };

    function iniciarRecorte(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            cropContainer.style.display = 'flex';
            if(cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1 });
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('btn-do-crop').onclick = (e) => {
        e.preventDefault();
        const canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });
        base64Recorte = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        document.getElementById('preview-container').innerHTML = `<img src="${canvas.toDataURL()}" style="width:80px; margin-top:10px; border-radius:8px; border:2px solid #db137a;">`;
        cropContainer.style.display = 'none';
        cropper.destroy();
    };

    document.getElementById('btn-cancel-crop').onclick = (e) => {
        e.preventDefault(); cropContainer.style.display = 'none'; if(cropper) cropper.destroy();
    };

    document.getElementById('btn-manual-add').onclick = async () => {
        const c = document.getElementById('m-col').value;
        const v = document.getElementById('m-val').value;
        const i = document.getElementById('m-inc').value;
        if(c && v && i) {
            const nuevaVar = { columna: c, valor: v, incremento: Number(i) };
            const { error } = await window.supabase.from("variaciones").insert([nuevaVar]);
            if (error) {
                window.mostrarToast("Error: " + error.message, "error");
            } else {
                window.mostrarToast("Guardada globalmente. Cierra y abre para verla en lista.", "exito");
                document.getElementById('m-col').value = ""; document.getElementById('m-val').value = ""; document.getElementById('m-inc').value = "";
            }
        }
    };

    // EL BOTÓN DE GUARDAR CAMBIOS (AHORA SÍ FUNCIONA Y GUARDA LAS VARIACIONES)
    document.getElementById('btn-submit-prod').onclick = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-prod');
        btn.disabled = true;
        btn.textContent = "Guardando...";

        try {
            const idsSeleccionados = Array.from(document.querySelectorAll('.check-var:checked')).map(cb => cb.value);

            let pathImg = productoEdicion?.imagenurl || "";
            if (base64Recorte) {
                const name = `${document.getElementById('prod-nombre').value.toLowerCase().replace(/\s+/g, '-')}-${refCalculada}.jpg`;
                const res = await fetch(`https://api.github.com/repos/${CUPISSA_CONFIG.github.owner}/${CUPISSA_CONFIG.github.repo}/contents/assets/productos/${name}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${CUPISSA_CONFIG.github.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Foto: ${name}`, content: base64Recorte, branch: CUPISSA_CONFIG.github.branch })
                });
                if (res.ok) pathImg = `assets/productos/${name}`;
            }

            const dataToSave = {
                ref: refCalculada,
                producto: document.getElementById('prod-nombre').value,
                mundo: document.getElementById('prod-mundo').value,
                categoria: document.getElementById('prod-categoria').value,
                subcategoria: document.getElementById('prod-sub').value,
                tallas: document.getElementById('prod-tallas').value,
                precio_base: Number(document.getElementById('prod-precio').value) || 0,
                tematica: document.getElementById('prod-tematica').value,
                variaciones_ids: idsSeleccionados.join(','), // GUARDAMOS LAS VARIACIONES 
                imagenurl: pathImg,
                activo: document.getElementById('prod-activo').value
            };

            const { error } = await window.supabase.from("productos").upsert(dataToSave, { onConflict: 'ref' });
            
            if (error) throw error;

            window.mostrarToast("¡Producto Guardado con Variaciones!", "exito");
            document.getElementById('modal-producto').remove();
            cargarProductos();

        } catch (error) {
            console.error("Error BD:", error);
            // Mensaje de alerta en rojo para evitar que mueras de estrés sin saber qué falló
            window.mostrarToast("Error BD: " + (error.message || "Fallo desconocido"), "error");
            btn.disabled = false;
            btn.textContent = "GUARDAR CAMBIOS";
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