document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const dynamicContent = document.getElementById('dynamic-content');

    // Control de navegación modular
    const modules = {
        dashboard: renderDashboard,
        productos: renderProductos,
        pedidos: () => renderPlaceholder('Pedidos'),
        usuarios: () => renderPlaceholder('Usuarios'),
        marketing: () => renderPlaceholder('Marketing'),
        comisiones: () => renderPlaceholder('Comisiones'),
        reportes: () => renderPlaceholder('Reportes')
    };

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const target = e.target.getAttribute('data-target');
            sectionTitle.textContent = e.target.textContent;
            
            if (modules[target]) {
                modules[target]();
            }
        });
    });

    // Iniciar en Dashboard
    renderDashboard();

    function renderDashboard() {
        dynamicContent.innerHTML = `
            <div class="grid-dashboard">
                <div class="card">
                    <h3>Ventas Hoy</h3>
                    <p style="font-size: 28px; font-weight: 600; color: var(--color-primario); margin-top: 10px;">$0</p>
                </div>
                <div class="card">
                    <h3>Pedidos Producción</h3>
                    <p style="font-size: 28px; font-weight: 600; margin-top: 10px;">0</p>
                </div>
                <div class="card">
                    <h3>CupiCoins Emitidas</h3>
                    <p style="font-size: 28px; font-weight: 600; margin-top: 10px;">0</p>
                </div>
            </div>
        `;
    }

    function renderProductos() {
        dynamicContent.innerHTML = `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Gestión del Catálogo</h2>
                <button class="btn-primario" id="btn-crear-producto">+ Crear Producto</button>
            </div>
            <div class="card">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Referencia</th>
                            <th>Producto</th>
                            <th>Mundo/Categoría</th>
                            <th>Precio Base</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-productos-body">
                        <tr><td colspan="6" style="text-align:center; padding: 20px;">Cargando catálogo desde base de datos...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('btn-crear-producto').addEventListener('click', abrirModalCrearProducto);
        cargarProductos();
    }

    function renderPlaceholder(nombre) {
        dynamicContent.innerHTML = `
            <div class="card">
                <h2>Módulo ${nombre}</h2>
                <p style="margin-top: 10px; color: var(--color-texto-suave);">Integración con Apps Script en proceso para este módulo.</p>
            </div>
        `;
    }

    async function cargarProductos() {
        const tbody = document.getElementById('tabla-productos-body');
        try {
            // Aquí se ejecutará el GET hacia CUPISSA_CONFIG.API_URL [cite: 88, 89]
            // fetch(CUPISSA_CONFIG.API_URL + "?action=getProductos")
            
            // Renderizado inicial estructural simulando respuesta de Apps Script
            tbody.innerHTML = `
                <tr>
                    <td>CUP2026001</td>
                    <td>Mameluco Personalizado</td>
                    <td>Textil / Bebés</td>
                    <td>$35,000</td>
                    <td class="estado-activo">Activo</td>
                    <td>
                        <button class="btn-accion btn-editar">Editar</button>
                        <button class="btn-accion btn-ocultar">Ocultar</button>
                    </td>
                </tr>
            `;
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-peligro);">Error de conexión con la base de datos.</td></tr>`;
        }
    }

    function abrirModalCrearProducto() {
        // Generación de referencia automática: CUP + AÑO + correlativo simulado (se validará en backend)
        const anio = new Date().getFullYear();
        const correlativoMock = Math.floor(Math.random() * 900) + 100; // Ej. 001. Aquí se llamaría al backend para el consecutivo real.
        const referenciaAut = `CUP${anio}${correlativoMock}`;

        const modalHtml = `
            <div class="modal-overlay" id="modal-producto">
                <div class="modal-content">
                    <h2 style="margin-bottom: 20px;">Crear Nuevo Producto</h2>
                    <form id="form-crear-producto" class="form-grid">
                        
                        <div class="form-group">
                            <label>Referencia (Automática)</label>
                            <input type="text" id="prod-ref" value="${referenciaAut}" readonly style="background: var(--color-fondo);">
                        </div>
                        <div class="form-group">
                            <label>Nombre del Producto *</label>
                            <input type="text" id="prod-nombre" required placeholder="Ej. Mameluco Personalizado">
                        </div>

                        <div class="form-group">
                            <label>Mundo *</label>
                            <select id="prod-mundo" required>
                                <option value="">Seleccione...</option>
                                <option value="MUNDO TEXTIL">MUNDO TEXTIL</option>
                                <option value="MUNDO COLECCIONES">MUNDO COLECCIONES</option>
                                <option value="MUNDO DETALLES">MUNDO DETALLES</option>
                                <option value="MUNDO CREATIVO">MUNDO CREATIVO</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Categoría *</label>
                            <input type="text" id="prod-categoria" required placeholder="Ej. Bebés">
                        </div>

                        <div class="form-group">
                            <label>Precio Base ($) *</label>
                            <input type="number" id="prod-precio" required min="0">
                        </div>
                        <div class="form-group">
                            <label>Modalidad</label>
                            <select id="prod-modalidad">
                                <option value="Venta">Venta</option>
                                <option value="Alquiler">Alquiler</option>
                            </select>
                        </div>

                        <div class="form-group drop-zone" id="drop-zone">
                            <p style="color: var(--color-texto-suave);">Arrastra hasta 5 imágenes aquí o haz clic para subir</p>
                            <input type="file" id="file-input" multiple accept="image/*" style="display:none;">
                            <div class="preview-container" id="preview-container"></div>
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="btn-secundario" id="btn-cerrar-modal">Cancelar</button>
                            <button type="submit" class="btn-primario">Guardar Producto</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        inicializarLogicaModal();
    }

    function inicializarLogicaModal() {
        const modal = document.getElementById('modal-producto');
        const form = document.getElementById('form-crear-producto');
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const previewContainer = document.getElementById('preview-container');
        
        let imagenesBase64 = []; // Almacenará las imágenes procesadas

        document.getElementById('btn-cerrar-modal').addEventListener('click', () => modal.remove());

        // Lógica Drag & Drop
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            procesarArchivos(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => procesarArchivos(e.target.files));

        function procesarArchivos(files) {
            const archivos = Array.from(files).slice(0, 5 - imagenesBase64.length); // Máximo 5 [cite: 189]
            
            archivos.forEach(file => {
                if (!file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = () => {
                        // Optimización y redimensión mediante Canvas 
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1000;
                        const scaleSize = MAX_WIDTH / img.width;
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        const base64Optimizada = canvas.toDataURL('image/jpeg', 0.8);
                        imagenesBase64.push({ name: file.name, data: base64Optimizada.split(',')[1], mimeType: 'image/jpeg' });
                        
                        // Renderizar preview
                        const imgTag = document.createElement('img');
                        imgTag.src = base64Optimizada;
                        imgTag.classList.add('img-preview');
                        previewContainer.appendChild(imgTag);
                    };
                };
                reader.readAsDataURL(file);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.textContent = "Guardando...";
            btnSubmit.disabled = true;

            const payload = {
                action: 'crearProducto',
                producto: {
                    ref: document.getElementById('prod-ref').value,
                    nombre: document.getElementById('prod-nombre').value,
                    mundo: document.getElementById('prod-mundo').value,
                    categoria: document.getElementById('prod-categoria').value,
                    precio_base: document.getElementById('prod-precio').value,
                    modalidad: document.getElementById('prod-modalidad').value,
                    imagenes: imagenesBase64 // Se envían en Base64 para que Apps Script las suba a Drive
                }
            };

            try {
                // await fetch(CUPISSA_CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) });
                console.log("Datos listos para enviar al backend:", payload);
                alert("Producto procesado. (Simulación exitosa)");
                modal.remove();
            } catch (error) {
                alert("Error al guardar el producto");
                btnSubmit.textContent = "Guardar Producto";
                btnSubmit.disabled = false;
            }
        });
    }
});