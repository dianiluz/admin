window.promocionesGlobales = [];

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
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s ease'; setTimeout(() => toast.remove(), 500); }, 3500);
};

window.renderMarketing = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Marketing y Fidelización</h2>
            <button class="btn-primario" id="btn-crear-promo">+ Crear Cupón / Promo</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
            
            <div class="card">
                <h3 style="color: var(--color-primario); margin-bottom: 15px;">⏳ Cupones y Promociones Activas</h3>
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Código / Título</th>
                                <th>Descuento / Costo</th>
                                <th>Alcance</th>
                                <th>Vence en</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-promos-body">
                            <tr><td colspan="7" style="text-align:center; padding: 20px;">Cargando campañas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="background: rgba(219, 19, 122, 0.02); border: 1px solid rgba(219, 19, 122, 0.1);">
                <h3 style="color: var(--color-primario); margin-bottom: 15px;">📫 Buzón de Email Marketing</h3>
                <p style="font-size: 13px; color: var(--color-texto-suave); margin-bottom: 15px;">Envía correos con tu alias oficial. Los envíos masivos se hacen con copia oculta para proteger la privacidad de los usuarios.</p>
                
                <form id="form-email-marketing" class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Audiencia (Destinatarios de la BD)</label>
                        <select id="mkt-audiencia" required style="font-weight:bold;">
                            <option value="TODOS">Toda la Base de Datos (Clientes y Equipo Activos)</option>
                            <optgroup label="Tabla: CLIENTES">
                                <option value="CLIENTE">Solo Clientes Activos</option>
                                <option value="EMPRESA">Solo Empresas (Mayoristas) Activas</option>
                            </optgroup>
                            <optgroup label="Tabla: EQUIPO">
                                <option value="ASESOR">Solo Asesores Activos</option>
                                <option value="EMPLEADO">Solo Empleados Activos</option>
                                <option value="ADMIN">Solo Administradores</option>
                            </optgroup>
                            <optgroup label="Búsqueda Manual">
                                <option value="INDIVIDUAL">👤 Usuario Específico (Buscar individualmente)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="form-group" id="cont-email-individual" style="display:none; grid-column: 1 / -1; position:relative;">
                        <label style="color:var(--color-primario);">Buscar Usuario (Cruza ambas tablas)</label>
                        <input type="text" id="mkt-buscador-usuario" placeholder="🔍 Escribe para buscar por nombre o correo..." autocomplete="off">
                        <div id="mkt-res-usuarios" class="resultados-flotantes" style="display:none; width:100%; position:absolute; top:100%; left:0; z-index:9999; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                        <input type="hidden" id="mkt-email-ind">
                    </div>
                    
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Asunto del Correo</label>
                        <input type="text" id="mkt-asunto" placeholder="Ej: 🔥 ¡20% OFF Solo por Hoy en Mundo Textil!" required>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Cuerpo del Mensaje (Soporta HTML básico o emojis)</label>
                        <textarea id="mkt-mensaje" rows="6" placeholder="Escribe aquí el mensaje promocional..." required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; resize: vertical;"></textarea>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1; border: 1px dashed #ccc; padding: 10px; border-radius: 8px; background: #fff;">
                        <label style="margin-bottom: 10px; display:block; font-weight:bold; color:var(--color-primario);">Botón de Acción (Opcional)</label>
                        <div style="display:flex; gap:10px; flex-wrap: wrap;">
                            <div style="flex:1; min-width: 200px;">
                                <label style="font-size:12px;">Texto del Botón</label>
                                <input type="text" id="mkt-btn-texto" placeholder="Ej: Ir a la Tienda">
                            </div>
                            <div style="flex:2; min-width: 250px;">
                                <label style="font-size:12px;">URL (Enlace) del Botón</label>
                                <input type="url" id="mkt-btn-url" placeholder="https://cupissa.com/...">
                            </div>
                        </div>
                        <small style="color:#888; margin-top:5px; display:block;">Si dejas estos campos vacíos, el correo se enviará sin botón.</small>
                    </div>

                    <div class="modal-actions" style="grid-column: 1 / -1; margin-top: 10px;">
                        <button type="submit" class="btn-primario" id="btn-enviar-mkt" style="width: 100%;">🚀 Disparar Campaña de Correos</button>
                    </div>
                </form>
            </div>

        </div>
    `;

    document.getElementById('btn-crear-promo').addEventListener('click', () => window.abrirModalPromo());

    // LÓGICA DE AUDIENCIA Y BUSCADOR INTELIGENTE EN 2 TABLAS
    const audienciaSelect = document.getElementById('mkt-audiencia');
    const contInd = document.getElementById('cont-email-individual');
    const buscadorMkt = document.getElementById('mkt-buscador-usuario');
    const resMkt = document.getElementById('mkt-res-usuarios');
    const hiddenEmailMkt = document.getElementById('mkt-email-ind');

    audienciaSelect.addEventListener('change', (e) => {
        if (e.target.value === 'INDIVIDUAL') {
            contInd.style.display = 'block';
            buscadorMkt.required = true;
        } else {
            contInd.style.display = 'none';
            buscadorMkt.required = false;
        }
    });

    buscadorMkt.addEventListener('input', async (e) => {
        const val = e.target.value.toLowerCase().trim();
        resMkt.innerHTML = ''; hiddenEmailMkt.value = '';
        if (val.length < 3) { resMkt.style.display = 'none'; return; }

        // Búsqueda simultánea en clientes y equipo
        const { data: cData } = await window.supabase.from('clientes')
            .select('nombre, email').or(`nombre.ilike.%${val}%,email.ilike.%${val}%`).limit(5);
        const { data: eData } = await window.supabase.from('equipo')
            .select('nombre, email').or(`nombre.ilike.%${val}%,email.ilike.%${val}%`).limit(5);
        
        const mixData = [...(cData || []), ...(eData || [])];
        
        if (mixData.length > 0) {
            mixData.forEach(m => {
                const div = document.createElement('div');
                div.style.padding = '10px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong style="color:var(--color-primario);">${m.nombre}</strong><br><small>${m.email}</small>`;
                
                div.onclick = () => {
                    buscadorMkt.value = `${m.nombre} (${m.email})`;
                    hiddenEmailMkt.value = m.email;
                    resMkt.style.display = 'none';
                };
                resMkt.appendChild(div);
            });
            resMkt.style.display = 'block';
        } else {
            resMkt.innerHTML = `<div style="padding:10px; text-align:center; font-size:12px; color:#888;">No se encontraron resultados</div>`;
            resMkt.style.display = 'block';
        }
    });

    document.addEventListener('click', (e) => {
        if(!buscadorMkt.contains(e.target)) resMkt.style.display = 'none';
    });

    document.getElementById('form-email-marketing').addEventListener('submit', dispararEmailMarketing);

    cargarPromociones();
};

async function cargarPromociones() {
    const tbody = document.getElementById('tabla-promos-body');
    try {
        const { data, error } = await window.supabase.from('promociones').select('*').order('id_promo', { ascending: true });
        if (error) throw error;

        window.promocionesGlobales = data || [];
        renderizarTablaPromociones(window.promocionesGlobales);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error al cargar promociones de la BD.</td></tr>`;
    }
}

function renderizarTablaPromociones(promos) {
    const tbody = document.getElementById('tabla-promos-body');
    tbody.innerHTML = '';

    if (promos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay promociones activas.</td></tr>`;
        return;
    }

    const ahora = new Date();

    promos.forEach(p => {
        const esCupon = p.tipo_promo === 'CUPON_DESCUENTO';
        const infoDesc = esCupon ? `${p.valor_descuento || 0}% OFF` : `Cuesta: ${p.cupicoins_requiere || 0} CC`;
        
        let infoAlcance = `<b>${p.alcance || 'WEB'}</b>`;
        if (p.alcance !== 'WEB' && p.alcance_valor) infoAlcance += `<br><small>${p.alcance_valor}</small>`;

        let txtTiempo = 'Indefinido';
        let colorSemaforo = 'estado-activo';
        if (p.fecha_limite) {
            const limite = new Date(p.fecha_limite);
            if (limite < ahora) {
                txtTiempo = 'Vencido';
                colorSemaforo = 'estado-inactivo'; 
            } else {
                const diffHoras = Math.floor((limite - ahora) / (1000 * 60 * 60));
                if(diffHoras < 24) {
                    txtTiempo = `¡En ${diffHoras}h! ⏳`;
                    colorSemaforo = 'estado-4'; // Naranja/Warning
                } else {
                    txtTiempo = `En ${Math.floor(diffHoras/24)} días`;
                    colorSemaforo = 'estado-3'; // Amarillo o Verde claro
                }
            }
        }

        const estadoClase = p.activa ? 'estado-activo' : 'estado-inactivo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="semaforo-estado" style="background:#eee; color:#333;">${esCupon ? 'CUPÓN' : 'CUPI-PROMO'}</span></td>
            <td><strong>${p.codigo || p.titulo}</strong><br><span style="font-size:11px; color:#888;">${p.titulo}</span></td>
            <td style="color:var(--color-primario); font-weight:bold;">${infoDesc}</td>
            <td style="font-size:12px;">${infoAlcance}</td>
            <td><span class="semaforo-estado ${colorSemaforo}">${txtTiempo}</span></td>
            <td><span class="semaforo-estado ${estadoClase}">${p.activa ? 'ACTIVA' : 'PAUSADA'}</span></td>
            <td>
                <button class="btn-accion btn-eliminar" onclick="window.eliminarPromocion('${p.id_promo}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abrirModalPromo = function() {
    const idGenerado = "PRM-" + Date.now().toString().slice(-6);

    const modalHtml = `
        <div class="modal-overlay" id="modal-promo">
            <div class="modal-content" style="max-width: 700px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="color:var(--color-primario); margin-bottom: 20px;">Crear Dinámica de Marketing</h2>

                <form id="form-crear-promo" class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Tipo de Dinámica</label>
                        <select id="prm-tipo" required style="font-weight:bold; color:var(--color-primario);">
                            <option value="CUPON_DESCUENTO">🎟️ Cupón de Descuento (%)</option>
                            <option value="PROMO_CUPICOINS">💎 Promoción Canjeable por CupiCoins</option>
                        </select>
                    </div>

                    <div class="form-group"><label>ID Interno</label><input type="text" id="prm-id" value="${idGenerado}" readonly style="background:#eee;"></div>
                    <div class="form-group">
                        <label>Estado Inicial</label>
                        <select id="prm-activa">
                            <option value="true">ACTIVA</option>
                            <option value="false">PAUSADA</option>
                        </select>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;"><label>Título Público</label><input type="text" id="prm-titulo" placeholder="Ej: Flash Sale de Mitad de Año" required></div>
                    
                    <div class="form-group" id="bloque-codigo"><label>Código del Cupón (Ej: FLASH50)</label><input type="text" id="prm-codigo" style="text-transform:uppercase;"></div>
                    <div class="form-group" id="bloque-descuento"><label>% Descuento (Solo número)</label><input type="number" id="prm-desc" value="0" min="0" max="100"></div>
                    <div class="form-group" id="bloque-costo" style="display:none;"><label>CupiCoins Requeridas</label><input type="number" id="prm-costo" value="0" min="0"></div>

                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Fecha y Hora Límite (Dejar vacío si es indefinido) ⏳</label>
                        <input type="datetime-local" id="prm-fecha">
                    </div>

                    <div class="detalle-seccion" style="grid-column: 1 / -1; background:#f9fafb; margin-top:10px;">
                        <h4 style="margin-bottom:10px;">Alcance del Descuento / Promo</h4>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1;">
                                <label>Aplicar a:</label>
                                <select id="prm-alcance" required>
                                    <option value="WEB">Toda la Tienda (Global)</option>
                                    <option value="MUNDO">Un Mundo Específico</option>
                                    <option value="CATEGORIA">Una Categoría</option>
                                    <option value="PRODUCTO">Un Producto (Ref)</option>
                                </select>
                            </div>
                            <div style="flex:1;" id="bloque-alcance-valor">
                                <label>Especifique el Alcance:</label>
                                <input type="text" id="prm-alcance-valor" placeholder="Ej: MUNDO TEXTIL o CUP2025001">
                            </div>
                        </div>
                        <small style="color:#666; display:block; margin-top:5px;">Si eliges "Toda la Tienda", el sistema bloqueará el campo de valor.</small>
                    </div>

                    <div class="modal-actions" style="grid-column: 1 / -1;">
                        <button type="button" class="btn-secundario" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button type="submit" class="btn-primario" id="btn-save-promo">Guardar Dinámica</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const selectTipo = document.getElementById('prm-tipo');
    const selectAlcance = document.getElementById('prm-alcance');
    const inputAlcanceValor = document.getElementById('prm-alcance-valor');
    
    selectTipo.addEventListener('change', (e) => {
        if(e.target.value === 'CUPON_DESCUENTO') {
            document.getElementById('bloque-codigo').style.display = 'block';
            document.getElementById('bloque-descuento').style.display = 'block';
            document.getElementById('bloque-costo').style.display = 'none';
            document.getElementById('prm-costo').value = 0;
        } else {
            document.getElementById('bloque-codigo').style.display = 'none';
            document.getElementById('bloque-descuento').style.display = 'none';
            document.getElementById('bloque-costo').style.display = 'block';
            document.getElementById('prm-desc').value = 0; 
            document.getElementById('prm-codigo').value = '';
        }
    });

    selectAlcance.addEventListener('change', (e) => {
        if (e.target.value === 'WEB') {
            inputAlcanceValor.disabled = true;
            inputAlcanceValor.value = '';
            inputAlcanceValor.style.background = '#eee';
        } else {
            inputAlcanceValor.disabled = false;
            inputAlcanceValor.style.background = '#fff';
        }
    });
    selectAlcance.dispatchEvent(new Event('change'));

    document.getElementById('form-crear-promo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-promo');
        btn.textContent = "Guardando..."; btn.disabled = true;

        const dataToSave = {
            id_promo: document.getElementById('prm-id').value,
            tipo_promo: document.getElementById('prm-tipo').value,
            activa: document.getElementById('prm-activa').value === 'true',
            titulo: document.getElementById('prm-titulo').value,
            codigo: document.getElementById('prm-codigo').value.toUpperCase() || null,
            valor_descuento: parseInt(document.getElementById('prm-desc').value) || 0,
            cupicoins_requiere: parseInt(document.getElementById('prm-costo').value) || 0,
            alcance: document.getElementById('prm-alcance').value,
            alcance_valor: document.getElementById('prm-alcance-valor').value || null,
            fecha_limite: document.getElementById('prm-fecha').value || null
        };

        try {
            const { error } = await window.supabase.from('promociones').upsert(dataToSave);
            if (error) throw error;
            
            window.mostrarToast("¡Dinámica creada con éxito!", "exito");
            document.getElementById('modal-promo').remove();
            cargarPromociones();
        } catch (err) {
            window.mostrarToast("Error BD: " + err.message, "error");
            btn.textContent = "Guardar Dinámica"; btn.disabled = false;
        }
    });
};

window.eliminarPromocion = async function(idPromo) {
    if(confirm("¿Segura de eliminar esta promoción? Dejará de funcionar de inmediato.")) {
        try {
            const { error } = await window.supabase.from('promociones').delete().eq('id_promo', idPromo);
            if(error) throw error;
            window.mostrarToast("Promoción eliminada.", "exito");
            cargarPromociones();
        } catch(e) {
            window.mostrarToast("Error al eliminar.", "error");
        }
    }
};

// MOTOR EXTRACCIÓN Y ENVÍO DE CORREOS MASIVOS
async function dispararEmailMarketing(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-enviar-mkt');
    const audiencia = document.getElementById('mkt-audiencia').value;
    const asunto = document.getElementById('mkt-asunto').value;
    const mensaje = document.getElementById('mkt-mensaje').value;
    
    const btnTexto = document.getElementById('mkt-btn-texto').value.trim();
    const btnUrl = document.getElementById('mkt-btn-url').value.trim();

    let destinatarios = [];

    btn.textContent = "Obteniendo base de datos..."; btn.disabled = true;

    try {
        if (audiencia === 'INDIVIDUAL') {
            const indEmail = document.getElementById('mkt-email-ind').value;
            if(!indEmail) throw new Error("Debes buscar y seleccionar el correo del destinatario.");
            destinatarios.push(indEmail);
        } else if (audiencia === 'TODOS') {
            // Extrae correos de clientes activos
            const { data: d1 } = await window.supabase.from('clientes').select('email').eq('acepta_politicas', true);
            // Extrae correos de equipo activo
            const { data: d2 } = await window.supabase.from('equipo').select('email').eq('estado', true);
            destinatarios = [...(d1||[]), ...(d2||[])].map(u => u.email).filter(e => e);
        } else if (['CLIENTE', 'EMPRESA'].includes(audiencia)) {
            const { data, error } = await window.supabase.from('clientes').select('email').eq('nivel_cuenta', audiencia).eq('acepta_politicas', true);
            if (error) throw error;
            destinatarios = (data||[]).map(u => u.email).filter(e => e);
        } else {
            const { data, error } = await window.supabase.from('equipo').select('email').eq('rol', audiencia).eq('estado', true);
            if (error) throw error;
            destinatarios = (data||[]).map(u => u.email).filter(e => e);
        }

        if (destinatarios.length === 0) throw new Error("No hay usuarios activos que coincidan con esa audiencia.");

        if (!confirm(`El correo se enviará a ${destinatarios.length} dirección(es). ¿Proceder?`)) {
            btn.textContent = "🚀 Disparar Campaña de Correos"; btn.disabled = false;
            return;
        }

        btn.textContent = "Enviando (No cierres la pestaña)...";

        const mensajeHtml = mensaje.replace(/\n/g, "<br>");

        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'enviarCorreoMarketing',
                destinatarios: destinatarios,
                asunto: asunto,
                cuerpo_html: mensajeHtml,
                btn_texto: btnTexto, 
                btn_url: btnUrl
            })
        });

        const dataRes = await response.json();
        if (dataRes.success) {
            window.mostrarToast(`¡Campaña disparada a ${dataRes.enviados} cuentas de correo!`, "exito");
            document.getElementById('form-email-marketing').reset();
            document.getElementById('cont-email-individual').style.display = 'none';
        } else {
            throw new Error(dataRes.error);
        }

    } catch (error) {
        window.mostrarToast(error.message, "error");
    } finally {
        btn.textContent = "🚀 Disparar Campaña de Correos"; 
        btn.disabled = false;
    }
}