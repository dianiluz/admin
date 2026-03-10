window.productosGlobales = [];
window.variacionesGlobales = []; // Aseguramos que exista

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
            <div style="overflow-x: auto;">
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
                    <tbody id="tabla-productos-body">
                        <tr><td colspan="7" style="text-align:center; padding: 20px;">Cargando catálogo desde base de datos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('btn-crear-producto').addEventListener('click', () => window.abrirModalProducto());
    
    document.getElementById('buscador-productos').addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = window.productosGlobales.filter(p => 
            (p.nombre && p.nombre.toLowerCase().includes(termino)) ||
            (p.ref && p.ref.toLowerCase().includes(termino)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termino)) ||
            (p.mundo && p.mundo.toLowerCase().includes(termino))
        );
        renderizarTablaProductos(filtrados);
    });

    cargarProductos();
};

async function cargarProductos() {
    const tbody = document.getElementById('tabla-productos-body');
    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerCatalogoBase' })
        });
        
        const data = await response.json();
        
        if (data.success && data.productos) {
            window.productosGlobales = data.productos;
            if (data.variaciones) window.variacionesGlobales = data.variaciones; // Guardamos las globales
            renderizarTablaProductos(window.productosGlobales);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-peligro);">Error: ${data.error || 'No se pudieron cargar los productos.'}</td></tr>`;
            window.mostrarToast("Error al cargar productos: " + data.error, "error");
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-peligro);">Error de conexión: ${error.message}</td></tr>`;
        window.mostrarToast("Error de conexión al servidor.", "error");
    }
}

function generarSiguienteReferencia() {
    const anioActual = new Date().getFullYear();
    const prefijo = `CUP${anioActual}`;
    
    const refsMismoAnio = window.productosGlobales
        .map(p => p.ref || "")
        .filter(ref => ref.startsWith(prefijo));

    if (refsMismoAnio.length === 0) return `${prefijo}001`;

    const numeros = refsMismoAnio.map(ref => parseInt(ref.replace(prefijo, ""))).filter(n => !isNaN(n));
    const max = Math.max(...numeros);
    return `${prefijo}${String(max + 1).padStart(3, '0')}`;
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '';

    if (productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron productos.</td></tr>`;
        return;
    }

    productos.forEach(prod => {
        const estado = prod['*activ'] || prod['*activo'] || 'NO';
        const claseEstado = estado.toUpperCase() === 'SI' ? 'estado-activo' : 'estado-inactivo';
        
        let urlImagen = 'https://via.placeholder.com/50x50?text=CUPISSA';
        if (prod.imagenurl) {
            urlImagen = prod.imagenurl.split('|')[0].trim();
            if (urlImagen.startsWith('assets/')) {
                urlImagen = '/' + urlImagen;
            }
        }

        const nombre = prod['*producto'] || prod.nombre || 'Sin Nombre';
        const precio = Number(prod['*precio_base'] || 0).toLocaleString('es-CO');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${urlImagen}" alt="${nombre}" class="thumb-producto" onerror="this.onerror=null; this.src='https://via.placeholder.com/50x50?text=CUPISSA';"></td>
            <td>${prod.ref || 'N/A'}</td>
            <td>${nombre}</td>
            <td>${prod.mundo || ''} / ${prod.categoria || ''}</td>
            <td>$${precio}</td>
            <td class="${claseEstado}">${estado.toUpperCase()}</td>
            <td>
                <div class="acciones-tabla">
                    <button class="btn-accion btn-editar" onclick="window.editarProducto('${prod.ref}')">Editar</button>
                    <button class="btn-accion btn-ocultar" onclick="window.toggleEstadoProducto(this, '${prod.ref}', '${estado}')">
                        ${estado.toUpperCase() === 'SI' ? 'Ocultar' : 'Activar'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleEstadoProducto = async function(btn, referencia, estadoActual) {
    const textoOriginal = btn.textContent;
    btn.textContent = "...";
    btn.disabled = true;

    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                action: 'cambiarEstadoProducto', 
                ref: referencia, 
                estadoActual: estadoActual 
            })
        });
        
        const data = await response.json();
        if (data.success) {
            const prod = window.productosGlobales.find(p => p.ref === referencia);
            if (prod) prod['*activ'] = data.estado_nuevo;
            document.getElementById('buscador-productos').dispatchEvent(new Event('input'));
            window.mostrarToast(`Estado del producto ${referencia} actualizado.`, "exito");
        } else {
            window.mostrarToast("Error: " + data.error, "error");
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    } catch (error) {
        window.mostrarToast("Error de conexión: " + error.message, "error");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
};

window.editarProducto = function(referencia) {
    const productoTarget = window.productosGlobales.find(p => p.ref === referencia);
    if (!productoTarget) {
        window.mostrarToast("No se pudo cargar la información del producto.", "error");
        return;
    }
    window.abrirModalProducto(productoTarget);
};

window.abrirModalProducto = function(productoEdicion = null) {
    const esEdicion = productoEdicion !== null;
    const titulo = esEdicion ? `Editar Producto: ${productoEdicion.ref}` : "Crear Nuevo Producto";
    const refCalculada = esEdicion ? productoEdicion.ref : generarSiguienteReferencia(); 
    
    const vals = {
        activo: 'SI', nombre: '', mundo: '', categoria: '', subcategoria: '', tallas: '',
        tematica: '', temporada: '', x_temp: '', para_quien: '', modalidad: '', precio: 0,
        seo_alt: ''
    };

    if (esEdicion) {
        vals.activo = productoEdicion['*activ'] || productoEdicion['*activo'] || 'SI';
        vals.nombre = productoEdicion['*producto'] || productoEdicion.nombre || '';
        vals.mundo = productoEdicion.mundo || '';
        vals.categoria = productoEdicion.categoria || '';
        vals.subcategoria = productoEdicion.subcategoria || '';
        vals.tallas = productoEdicion['*tallas'] || '';
        vals.tematica = productoEdicion.tematica || '';
        vals.temporada = productoEdicion['*temporada'] || '';
        vals.x_temp = productoEdicion['*x_temp'] || '';
        vals.para_quien = productoEdicion['¿Para quien?'] || '';
        vals.modalidad = productoEdicion['*modalidad'] || '';
        vals.precio = productoEdicion['*precio_base'] || 0;
        vals.seo_alt = productoEdicion.seo_alt || ''; 
    }

    // 1. CARGAR SELECT DINÁMICO DE PRECONFIGURACIONES
    let opcionesPreconfig = '<option value="">Cargar preconfiguración...</option>';
    const gruposPreconfig = {};
    if (window.variacionesGlobales) {
        window.variacionesGlobales.forEach(vg => {
            const llave = vg.columna; 
            if (!gruposPreconfig[llave]) gruposPreconfig[llave] = [];
            gruposPreconfig[llave].push(vg);
        });
        for (const llave in gruposPreconfig) {
            const partes = llave.split('|');
            const nombreAmigable = partes[partes.length - 1] || llave;
            opcionesPreconfig += `<option value="${llave}">${llave} (${nombreAmigable})</option>`;
        }
    }

    // 2. EXTRAER VALORES MANUALES PARA EL AUTOCOMPLETADO
    const columnasUnicas = new Set();
    const valoresUnicos = new Set();
    if (window.productosGlobales) {
        window.productosGlobales.forEach(p => {
            if (p.variaciones) {
                try {
                    const vJson = typeof p.variaciones === 'string' ? JSON.parse(p.variaciones) : p.variaciones;
                    if (Array.isArray(vJson)) {
                        vJson.forEach(v => {
                            if (v.columna) columnasUnicas.add(v.columna);
                            if (v.valor || v.variacion) valoresUnicos.add(v.valor || v.variacion);
                        });
                    }
                } catch(e){}
            }
        });
    }

    const modalHtml = `
        <div class="modal-overlay" id="modal-producto">
            <div class="modal-content">
                <button type="button" class="btn-cerrar-x" id="btn-x">&times;</button>
                <h2 style="margin-bottom: 20px;">${titulo}</h2>
                <form id="form-crear-producto" class="form-grid">
                    
                    <div class="form-group"><label>Referencia (Automática)</label>
                        <input type="text" id="prod-ref" value="${refCalculada}" readonly style="background:#f4f6f8; font-weight:600; color:var(--color-primario);">
                    </div>
                    
                    <div class="form-group"><label>*Activo</label>
                        <select id="prod-activo" required>
                            <option value="SI" ${vals.activo.toUpperCase() === 'SI' ? 'selected' : ''}>SI</option>
                            <option value="NO" ${vals.activo.toUpperCase() === 'NO' ? 'selected' : ''}>NO</option>
                        </select>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;"><label>Producto</label>
                        <input type="text" id="prod-nombre" required value="${vals.nombre}">
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;"><label>Descripción SEO / Alt Text (Google & Pinterest)</label>
                        <input type="text" id="prod-seo-alt" value="${vals.seo_alt}" placeholder="Ej: Conjunto personalizado de temática para niñas">
                    </div>

                    <div class="form-group"><label>Mundo</label>
                        <select id="prod-mundo" required>
                            <option value="">Seleccione...</option>
                            <option value="MUNDO TEXTIL" ${vals.mundo === 'MUNDO TEXTIL' ? 'selected' : ''}>MUNDO TEXTIL</option>
                            <option value="MUNDO COLECCIONES" ${vals.mundo === 'MUNDO COLECCIONES' ? 'selected' : ''}>MUNDO COLECCIONES</option>
                            <option value="MUNDO DETALLES" ${vals.mundo === 'MUNDO DETALLES' ? 'selected' : ''}>MUNDO DETALLES</option>
                            <option value="MUNDO CREATIVO" ${vals.mundo === 'MUNDO CREATIVO' ? 'selected' : ''}>MUNDO CREATIVO</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Categoría</label>
                        <input type="text" id="prod-categoria" required value="${vals.categoria}">
                    </div>
                    <div class="form-group"><label>Subcategoría</label>
                        <input type="text" id="prod-subcategoria" value="${vals.subcategoria}">
                    </div>
                    <div class="form-group"><label>*Tallas (separadas por |)</label>
                        <input type="text" id="prod-tallas" value="${vals.tallas}">
                    </div>
                    <div class="form-group"><label>Temática</label>
                        <input type="text" id="prod-tematica" value="${vals.tematica}">
                    </div>
                    <div class="form-group"><label>*Temporada</label>
                        <input type="text" id="prod-temporada" value="${vals.temporada}">
                    </div>
                    <div class="form-group"><label>*x_temp</label>
                        <input type="text" id="prod-x-temp" value="${vals.x_temp}">
                    </div>
                    <div class="form-group"><label>¿Para quien?</label>
                        <input type="text" id="prod-para-quien" value="${vals.para_quien}">
                    </div>
                    <div class="form-group"><label>*Modalidad</label>
                        <select id="prod-modalidad">
                            <option value="" ${vals.modalidad === '' ? 'selected' : ''}>(Sin especificar)</option>
                            <option value="Venta" ${vals.modalidad === 'Venta' ? 'selected' : ''}>Venta</option>
                            <option value="Compra" ${vals.modalidad === 'Compra' ? 'selected' : ''}>Compra</option>
                            <option value="Alquiler" ${vals.modalidad === 'Alquiler' ? 'selected' : ''}>Alquiler</option>
                        </select>
                    </div>
                    <div class="form-group"><label>*Precio Base ($)</label>
                        <input type="number" id="prod-precio" required min="0" value="${vals.precio}">
                    </div>

                    <div class="form-group drop-zone" id="drop-zone">
                        <p style="color: var(--color-texto-suave);">Arrastra imágenes o haz clic para subir y recortar</p>
                        <input type="file" id="file-input" multiple accept="image/*" style="display:none;">
                        <div class="preview-container" id="preview-container">
                            ${esEdicion && productoEdicion.imagenurl ? `<p style="width:100%; font-size:12px; margin-top:5px; color:var(--color-exito);">Ya existen imágenes guardadas. Subir nuevas las reemplazará.</p>` : ''}
                        </div>
                    </div>

                    <div class="variaciones-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3>Variaciones e Incrementos</h3>
                            <select id="select-preconfig" style="padding: 5px; border-radius: 4px; border: 1px solid var(--color-borde);">
                                ${opcionesPreconfig}
                            </select>
                        </div>
                        <button type="button" class="btn-primario" id="btn-add-variacion" style="margin-bottom: 10px;">+ Variación Manual</button>
                        <table class="tabla-variaciones" id="tabla-variaciones">
                            <thead><tr><th>Columna</th><th>Valor</th><th>Incremento ($)</th><th>Acción</th></tr></thead>
                            <tbody id="tbody-variaciones"></tbody>
                        </table>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secundario" id="btn-cerrar-modal">Cancelar</button>
                        <button type="submit" class="btn-primario">Guardar Producto</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="crop-container" id="crop-container" style="display: none;">
            <div class="crop-box">
                <div class="img-container" style="height: 400px; width: 100%; background: #eee;">
                    <img id="image-to-crop" style="max-width: 100%; display: block;">
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" class="btn-secundario" id="btn-cancel-crop">Cancelar</button>
                    <button type="button" class="btn-primario" id="btn-crop">Recortar y Guardar</button>
                </div>
            </div>
        </div>

        <datalist id="lista-columnas-var">
            ${Array.from(columnasUnicas).map(c => `<option value="${c}">`).join('')}
        </datalist>
        <datalist id="lista-valores-var">
            ${Array.from(valoresUnicos).map(v => `<option value="${v}">`).join('')}
        </datalist>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    inicializarLogicaModal(productoEdicion);
};

function inicializarLogicaModal(productoEdicion) {
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-crear-producto');
    
    const cerrarModal = () => { if (modal) modal.remove(); };
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-x').addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

    const tbodyVariaciones = document.getElementById('tbody-variaciones');
    
    // MODIFICADO: Agrega el atributo "tipo" para distinguir entre manual y preconfigurada
    const agregarFilaVariacion = (columna = '', valor = '', incremento = '0', tipo = 'manual') => {
        const tr = document.createElement('tr');
        tr.dataset.tipo = tipo; 
        
        // Estilos para diferenciar visualmente las preconfiguradas de las manuales
        const readonlyAttr = tipo === 'preconfigurada' ? 'readonly' : '';
        const bgStyle = tipo === 'preconfigurada' ? 'background: #f0fdf4; color: #166534; font-size:12px; font-weight:600;' : '';

        tr.innerHTML = `
            <td><input type="text" value="${columna}" class="var-columna" list="lista-columnas-var" ${readonlyAttr} style="${bgStyle}"></td>
            <td><input type="text" value="${valor}" class="var-valor" list="lista-valores-var" ${readonlyAttr} style="${bgStyle}"></td>
            <td><input type="number" value="${incremento}" class="var-incremento" ${readonlyAttr} style="${bgStyle}"></td>
            <td><button type="button" class="btn-accion btn-eliminar btn-del-var">X</button></td>
        `;
        tbodyVariaciones.appendChild(tr);
    };

    tbodyVariaciones.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-del-var')) e.target.closest('tr').remove();
    });

    document.getElementById('btn-add-variacion').addEventListener('click', () => agregarFilaVariacion('', '', '0', 'manual'));

    // CARGAR VARIACIONES EXISTENTES AL EDITAR
    if (productoEdicion && productoEdicion.variaciones) {
        try {
            const vJson = typeof productoEdicion.variaciones === 'string' ? JSON.parse(productoEdicion.variaciones) : productoEdicion.variaciones;
            if (Array.isArray(vJson)) {
                vJson.forEach(v => agregarFilaVariacion(v.columna, v.valor || v.variacion, v.incremento, 'manual'));
            }
        } catch(e) {}
    }

    // MODIFICADO: Agrega las filas preconfiguradas buscando en las globales
    document.getElementById('select-preconfig').addEventListener('change', (e) => {
        const llaveSeleccionada = e.target.value;
        if (!llaveSeleccionada) return;

        if (window.variacionesGlobales) {
            const variacionesGrupo = window.variacionesGlobales.filter(vg => vg.columna === llaveSeleccionada);
            variacionesGrupo.forEach(vg => {
                agregarFilaVariacion(vg.columna, vg.valor, vg.incremento, 'preconfigurada');
            });
        }
        e.target.value = '';
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const cropContainer = document.getElementById('crop-container');
    const imageToCrop = document.getElementById('image-to-crop');
    
    let imagenesBase64 = [];
    let cropper = null;
    let queueFiles = [];

    dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'IMG') fileInput.click(); });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) iniciarProcesoRecorte(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) iniciarProcesoRecorte(e.target.files);
    });

    function iniciarProcesoRecorte(files) {
        const archivos = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imagenesBase64.length + archivos.length > 5) {
            window.mostrarToast("Máximo 5 imágenes por producto.", "error");
            return;
        }
        queueFiles = [...queueFiles, ...archivos];
        fileInput.value = ''; 
        procesarSiguienteImagen();
    }

    function procesarSiguienteImagen() {
        if (queueFiles.length === 0) return;
        const file = queueFiles[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            cropContainer.style.display = 'flex';
            if (cropper) cropper.destroy();
            
            setTimeout(() => {
                cropper = new Cropper(imageToCrop, { aspectRatio: NaN, viewMode: 1, background: false, autoCropArea: 1, zoomable: true });
            }, 100);
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('btn-cancel-crop').addEventListener('click', () => {
        queueFiles.shift(); 
        cropContainer.style.display = 'none';
        if (cropper) { cropper.destroy(); cropper = null; }
        procesarSiguienteImagen(); 
    });

    document.getElementById('btn-crop').addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ maxWidth: 1000, maxHeight: 1000 });
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const currentFile = queueFiles.shift(); 
        
        imagenesBase64.push({ name: currentFile.name, data: base64.split(',')[1], mimeType: 'image/jpeg' });
        
        const imgTag = document.createElement('img');
        imgTag.src = base64;
        imgTag.classList.add('img-preview');
        previewContainer.appendChild(imgTag);
        
        cropContainer.style.display = 'none';
        cropper.destroy(); cropper = null;
        procesarSiguienteImagen(); 
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.textContent = "Guardando...";
        btnSubmit.disabled = true;

        const variaciones = [];
        document.querySelectorAll('#tbody-variaciones tr').forEach(tr => {
            // MODIFICADO: Solo capturamos las marcadas como MANUALES para no duplicar en el backend
            if (tr.dataset.tipo === 'manual') {
                variaciones.push({
                    columna: tr.querySelector('.var-columna').value,
                    valor: tr.querySelector('.var-valor').value,
                    incremento: tr.querySelector('.var-incremento').value
                });
            }
        });

        const productoPayload = {
            ref: document.getElementById('prod-ref').value, 
            activo: document.getElementById('prod-activo').value,
            producto: document.getElementById('prod-nombre').value,
            seo_alt: document.getElementById('prod-seo-alt').value, 
            mundo: document.getElementById('prod-mundo').value,
            categoria: document.getElementById('prod-categoria').value,
            subcategoria: document.getElementById('prod-subcategoria').value,
            tallas: document.getElementById('prod-tallas').value,
            tematica: document.getElementById('prod-tematica').value,
            temporada: document.getElementById('prod-temporada').value,
            x_temp: document.getElementById('prod-x-temp').value,
            para_quien: document.getElementById('prod-para-quien').value,
            modalidad: document.getElementById('prod-modalidad').value,
            precio_base: document.getElementById('prod-precio').value,
            variaciones: variaciones
        };

        if (productoEdicion) {
            productoPayload.imagenurl_actual = productoEdicion.imagenurl || "";
            if (imagenesBase64.length > 0) {
                productoPayload.imagenes_nuevas = imagenesBase64;
            }
        } else {
            productoPayload.imagenes = imagenesBase64;
        }

        const payloadCompleto = {
            action: productoEdicion ? 'actualizarProducto' : 'crearProductoNuevo',
            producto: productoPayload
        };

        try {
            const response = await fetch(CUPISSA_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payloadCompleto)
            });
            const data = await response.json();
            
            if (data.success) {
                window.mostrarToast(productoEdicion ? "Producto actualizado correctamente." : "Producto creado correctamente.", "exito");
                cerrarModal();
                document.querySelector('.nav-btn[data-target="productos"]').click();
            } else {
                window.mostrarToast("Error: " + data.error, "error");
                btnSubmit.textContent = "Guardar Producto";
                btnSubmit.disabled = false;
            }
        } catch (error) {
            window.mostrarToast("Error de conexión: " + error.message, "error");
            btnSubmit.textContent = "Guardar Producto";
            btnSubmit.disabled = false;
        }
    });
}