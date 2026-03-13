window.promocionesGlobales = [];

window.renderMarketing = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Marketing y Fidelización</h2>
            <button class="btn-primario" id="btn-crear-promo">+ Crear Cupón / Promo</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
            
            <div class="card">
                <h3 style="color: var(--color-primario); margin-bottom: 15px;">⏳ Cupones y Promociones Flash</h3>
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
                <p style="font-size: 13px; color: var(--color-texto-suave); margin-bottom: 15px;">Envía correos con tu alias oficial. Los envíos masivos se hacen con copia oculta para proteger la privacidad.</p>
                
                <form id="form-email-marketing" class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Audiencia (Destinatarios)</label>
                        <select id="mkt-audiencia" required style="font-weight:bold;">
                            <option value="TODOS">Todos los Usuarios Registrados (Cualquier rol)</option>
                            <option value="CLIENTE">Solo Clientes Activos</option>
                            <option value="EMPRESA">Solo Empresas Activas</option>
                            <option value="ASESOR">Solo Asesores Activos</option>
                            <option value="EMPLEADO">Solo Empleados Activos</option>
                            <option value="ADMIN">Solo Administradores</option>
                            <option value="INDIVIDUAL">👤 Usuario Específico (Buscar individualmente)</option>
                        </select>
                    </div>

                    <div class="form-group" id="cont-email-individual" style="display:none; grid-column: 1 / -1; position:relative;">
                        <label style="color:var(--color-primario);">Buscar Usuario (Por nombre, correo o CC)</label>
                        <input type="text" id="mkt-buscador-usuario" placeholder="🔍 Escribe para buscar en la base de datos..." autocomplete="off">
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

    // LÓGICA DE AUDIENCIA Y BUSCADOR INTELIGENTE
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

        // Búsqueda en vivo en Supabase
        const { data, error } = await window.supabase.from('usuarios')
            .select('nombre, email, cc')
            .or(`nombre.ilike.%${val}%,email.ilike.%${val}%,cc.eq.${parseInt(val) || 0}`)
            .limit(10);
        
        if (!error && data && data.length > 0) {
            data.forEach(m => {
                const div = document.createElement('div');
                div.style.padding = '10px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong style="color:var(--color-primario);">${m.nombre}</strong><br><small>${m.email} | CC: ${m.cc || 'N/A'}</small>`;
                
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

    // Envío de Email Marketing
    document.getElementById('form-email-marketing').addEventListener('submit', dispararEmailMarketing);

    cargarPromociones();
};

async function cargarPromociones() {
    const tbody = document.getElementById('tabla-promos-body');
    try {
        const { data, error } = await window.supabase.from('promociones').select('*').order('fecha_limite', { ascending: true });
        if (error) throw error;

        window.promocionesGlobales = data || [];
        renderizarTablaPromociones(window.promocionesGlobales);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error al cargar promociones.</td></tr>`;
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
        const esCupon = p.tipo === 'CUPON_DESCUENTO';
        const infoDesc = esCupon ? `${p.descuento_porcentaje}% OFF` : `Cuesta: ${p.costo_cupicoins} CC`;
        
        let infoAlcance = `<b>${p.alcance}</b>`;
        if (p.alcance !== 'WEB' && p.alcance_valor) infoAlcance += `<br><small>${p.alcance_valor}</small>`;

        let txtTiempo = '--';
        let colorSemaforo = '';
        if (p.fecha_limite) {
            const limite = new Date(p.fecha_limite);
            if (limite < ahora) {
                txtTiempo = 'Vencido';
                colorSemaforo = 'estado-6'; 
            } else {
                const diffHoras = Math.floor((limite - ahora) / (1000 * 60 * 60));
                if(diffHoras < 24) {
                    txtTiempo = `¡En ${diffHoras} horas! ⏳`;
                    colorSemaforo = 'estado-4'; 
                } else {
                    txtTiempo = `En ${Math.floor(diffHoras/24)} días`;
                    colorSemaforo = 'estado-3'; 
                }
            }
        }

        const estadoClase = String(p.activa) === 'SI' ? 'estado-activo' : 'estado-inactivo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="semaforo-estado" style="background:#eee; color:#333;">${esCupon ? 'CUPÓN' : 'CUPI-PROMO'}</span></td>
            <td><strong>${p.codigo || p.titulo}</strong><br><span style="font-size:11px; color:#888;">${p.titulo}</span></td>
            <td style="color:var(--color-primario); font-weight:bold;">${infoDesc}</td>
            <td style="font-size:12px;">${infoAlcance}</td>
            <td><span class="semaforo-estado ${colorSemaforo}">${txtTiempo}</span></td>
            <td><span class="semaforo-estado ${estadoClase}">${String(p.activa) === 'SI' ? 'ACTIVA' : 'PAUSADA'}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-direction:column;">
                    <button class="btn-accion btn-eliminar" onclick="window.eliminarPromocion('${p.id}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abrirModalPromo = function() {
    const idGenerado = "PROMO-" + Date.now().toString().slice(-6);

    const modalHtml = `
        <div class="modal-overlay" id="modal-promo">
            <div class="modal-content" style="max-width: 700px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="color:var(--color-primario); margin-bottom: 20px;">Crear Dinámica de Marketing</h2>

                <form id="form-crear-promo" class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Tipo de Dinámica</label>
                        <select id="prm-tipo" required style="font-weight:bold; color:var(--color-primario);">
                            <option value="CUPON_DESCUENTO">🎟️ Cupón de Descuento Flash (Temu Style)</option>
                            <option value="PROMO_CUPICOINS">💎 Promoción Canjeable por CupiCoins</option>
                        </select>
                    </div>

                    <div class="form-group"><label>ID Interno</label><input type="text" id="prm-id" value="${idGenerado}" readonly style="background:#eee;"></div>
                    <div class="form-group"><label>Estado Inicial</label><select id="prm-activa"><option value="SI">ACTIVA</option><option value="NO">PAUSADA</option></select></div>

                    <div class="form-group" style="grid-column: 1 / -1;"><label>Título Público</label><input type="text" id="prm-titulo" placeholder="Ej: Flash Sale Princesas" required></div>
                    
                    <div class="form-group" id="bloque-codigo"><label>Código del Cupón (Ej: FLASH50)</label><input type="text" id="prm-codigo" style="text-transform:uppercase;"></div>
                    <div class="form-group" id="bloque-descuento"><label>% Descuento (Solo número)</label><input type="number" id="prm-desc" value="0" min="0" max="100"></div>
                    <div class="form-group" id="bloque-costo" style="display:none;"><label>Costo en CupiCoins</label><input type="number" id="prm-costo" value="0" min="0"></div>

                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Fecha y Hora Límite (Para el cronómetro) ⏳</label>
                        <input type="datetime-local" id="prm-fecha" required>
                    </div>

                    <div class="detalle-seccion" style="grid-column: 1 / -1; background:#f9fafb; margin-top:10px;">
                        <h4 style="margin-bottom:10px;">Alcance del Descuento</h4>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1;">
                                <label>Aplicar a:</label>
                                <select id="prm-alcance" required>
                                    <option value="WEB">Toda la Tienda (Carrito)</option>
                                    <option value="MUNDO">Un Mundo Específico</option>
                                    <option value="CATEGORIA">Una Categoría</option>
                                    <option value="PRODUCTO">Un Producto Específico (Ref)</option>
                                </select>
                            </div>
                            <div style="flex:1;" id="bloque-alcance-valor">
                                <label>Valor del Alcance:</label>
                                <input type="text" id="prm-alcance-valor" placeholder="Ej: MUNDO TEXTIL o CUP2025001">
                            </div>
                        </div>
                        <small style="color:#666; display:block; margin-top:5px;">Si eliges "Toda la Tienda", deja el valor vacío.</small>
                    </div>

                    <div class="modal-actions" style="grid-column: 1 / -1;">
                        <button type="button" class="btn-secundario" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button type="submit" class="btn-primario" id="btn-save-promo">Activar Dinámica</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const selectTipo = document.getElementById('prm-tipo');
    const selectAlcance = document.getElementById('prm-alcance');
    
    selectTipo.addEventListener('change', (e) => {
        if(e.target.value === 'CUPON_DESCUENTO') {
            document.getElementById('bloque-codigo').style.display = 'block';
            document.getElementById('bloque-descuento').style.display = 'block';
            document.getElementById('bloque-costo').style.display = 'none';
        } else {
            document.getElementById('bloque-codigo').style.display = 'none';
            document.getElementById('bloque-descuento').style.display = 'none';
            document.getElementById('bloque-costo').style.display = 'block';
        }
    });

    selectAlcance.addEventListener('change', (e) => {
        document.getElementById('prm-alcance-valor').disabled = (e.target.value === 'WEB');
        if(e.target.value === 'WEB') document.getElementById('prm-alcance-valor').value = '';
    });
    selectAlcance.dispatchEvent(new Event('change'));

    document.getElementById('form-crear-promo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-promo');
        btn.textContent = "Guardando..."; btn.disabled = true;

        const dataToSave = {
            id: document.getElementById('prm-id').value,
            tipo: document.getElementById('prm-tipo').value,
            activa: document.getElementById('prm-activa').value,
            titulo: document.getElementById('prm-titulo').value,
            codigo: document.getElementById('prm-codigo').value.toUpperCase() || null,
            descuento_porcentaje: parseInt(document.getElementById('prm-desc').value) || 0,
            costo_cupicoins: parseInt(document.getElementById('prm-costo').value) || 0,
            fecha_limite: document.getElementById('prm-fecha').value || null,
            alcance: document.getElementById('prm-alcance').value,
            alcance_valor: document.getElementById('prm-alcance-valor').value || null
        };

        try {
            const { error } = await window.supabase.from('promociones').upsert(dataToSave);
            if (error) throw error;
            
            window.mostrarToast("¡Dinámica creada con éxito!", "exito");
            document.getElementById('modal-promo').remove();
            cargarPromociones();
        } catch (err) {
            window.mostrarToast("Error BD: " + err.message, "error");
            btn.textContent = "Activar Dinámica"; btn.disabled = false;
        }
    });
};

window.eliminarPromocion = async function(id) {
    if(confirm("¿Segura de eliminar esta promoción? Desaparecerá de la tienda de inmediato.")) {
        try {
            const { error } = await window.supabase.from('promociones').delete().eq('id', id);
            if(error) throw error;
            window.mostrarToast("Promoción eliminada.", "exito");
            cargarPromociones();
        } catch(e) {
            window.mostrarToast("Error al eliminar.", "error");
        }
    }
};

// MOTOR DE ENVÍO DE CORREOS MASIVOS
async function dispararEmailMarketing(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-enviar-mkt');
    const audiencia = document.getElementById('mkt-audiencia').value;
    const asunto = document.getElementById('mkt-asunto').value;
    const mensaje = document.getElementById('mkt-mensaje').value;
    
    // Novedad: Botones dinámicos
    const btnTexto = document.getElementById('mkt-btn-texto').value.trim();
    const btnUrl = document.getElementById('mkt-btn-url').value.trim();

    let destinatarios = [];

    btn.textContent = "Obteniendo lista..."; btn.disabled = true;

    try {
        if (audiencia === 'INDIVIDUAL') {
            const indEmail = document.getElementById('mkt-email-ind').value;
            if(!indEmail) throw new Error("Debes buscar y seleccionar el correo del destinatario.");
            destinatarios.push(indEmail);
        } else {
            let query = window.supabase.from('usuarios').select('email');
            // Si elige un rol específico, lo filtramos. Si elige TODOS, trae a todos.
            if (audiencia !== 'TODOS') {
                query = query.eq('tipo_usuario', audiencia).eq('activo', 'SI');
            }
            
            const { data, error } = await query;
            if(error) throw error;
            
            destinatarios = data.map(u => u.email).filter(e => e); // Filtramos vacíos
        }

        if (destinatarios.length === 0) throw new Error("No se encontraron usuarios para esta audiencia.");

        if (!confirm(`Se enviará este correo a ${destinatarios.length} persona(s). ¿Proceder?`)) {
            btn.textContent = "🚀 Disparar Campaña de Correos"; btn.disabled = false;
            return;
        }

        btn.textContent = "Enviando (No cierres la página)...";

        const mensajeHtml = mensaje.replace(/\n/g, "<br>");

        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'enviarCorreoMarketing',
                destinatarios: destinatarios,
                asunto: asunto,
                cuerpo_html: mensajeHtml,
                btn_texto: btnTexto, // Mandamos el botón opcional
                btn_url: btnUrl
            })
        });

        const dataRes = await response.json();
        if (dataRes.success) {
            window.mostrarToast(`¡Campaña disparada a ${dataRes.enviados} usuarios!`, "exito");
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