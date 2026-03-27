window.directorioGlobal = [];

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
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s ease'; setTimeout(() => toast.remove(), 500); }, 4500);
};

window.renderUsuarios = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Directorio de Clientes y Equipo (RRHH)</h2>
            <button class="btn-primario" id="btn-crear-usuario">+ Registrar Perfil</button>
        </div>
        <div class="card">
            <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <input type="text" id="buscador-usuarios" class="buscador-panel" placeholder="Buscar por nombre, correo o CC..." style="flex: 1; min-width: 250px;">
                
                <select id="filtro-rol-usuario" class="buscador-panel" style="width: auto;">
                    <option value="">Todos los Roles</option>
                    <optgroup label="Clientes">
                        <option value="CLIENTE">Clientes</option>
                        <option value="EMPRESA">Empresas (Mayoristas)</option>
                    </optgroup>
                    <optgroup label="Equipo Interno">
                        <option value="ADMIN">Administradores</option>
                        <option value="EMPLEADO">Empleados</option>
                        <option value="ASESOR">Asesores Externos</option>
                    </optgroup>
                </select>
            </div>
            
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Ingreso</th>
                            <th>Usuario / Perfil</th>
                            <th>Contacto</th>
                            <th>Rol asignado</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-usuarios-body">
                        <tr><td colspan="6" style="text-align:center; padding: 20px;">Cargando directorio...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-crear-usuario').addEventListener('click', () => window.abrirModalUsuario());
    
    const aplicarFiltros = () => {
        const termino = document.getElementById('buscador-usuarios').value.toLowerCase();
        const rol = document.getElementById('filtro-rol-usuario').value;

        const filtrados = window.directorioGlobal.filter(u => {
            const matchTexto = (u.nombre && u.nombre.toLowerCase().includes(termino)) || 
                               (u.email && u.email.toLowerCase().includes(termino)) || 
                               (String(u.cc || '').includes(termino)) ||
                               (String(u.codigo_colaborador || '').toLowerCase().includes(termino));
            const matchRol = rol === "" || u.rol_unificado === rol;
            return matchTexto && matchRol;
        });
        renderizarTablaUsuarios(filtrados);
    };

    document.getElementById('buscador-usuarios').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-rol-usuario').addEventListener('change', aplicarFiltros);

    cargarDirectorioCompleto();
};

async function cargarDirectorioCompleto() {
    const tbody = document.getElementById('tabla-usuarios-body');
    try {
        const { data: clientesData, error: errCli } = await window.supabase.from('clientes').select('*');
        if (errCli) throw errCli;

        const { data: equipoData, error: errEq } = await window.supabase.from('equipo').select('*');
        if (errEq) throw errEq;

        let listaUnificada = [];

        (clientesData || []).forEach(c => {
            listaUnificada.push({
                ...c, source_table: 'clientes', id_unificado: c.id_cliente,
                rol_unificado: c.nivel_cuenta || 'CLIENTE', fecha_unificada: c.fecha_registro,
                estado_unificado: c.acepta_politicas ? 'ACTIVO' : 'PENDIENTE'
            });
        });

        (equipoData || []).forEach(e => {
            listaUnificada.push({
                ...e, source_table: 'equipo', id_unificado: e.id_trabajador,
                rol_unificado: e.rol || 'EMPLEADO', fecha_unificada: e.fecha_vinculacion,
                estado_unificado: e.estado || 'ACTIVO'
            });
        });

        listaUnificada.sort((a, b) => new Date(b.fecha_unificada) - new Date(a.fecha_unificada));

        window.directorioGlobal = listaUnificada;
        renderizarTablaUsuarios(window.directorioGlobal);
        
    } catch (error) {
        console.error("Error cargando directorio:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-peligro);">Error BD: ${error.message}</td></tr>`;
    }
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById('tabla-usuarios-body');
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron registros.</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const claseEstado = u.estado_unificado === 'ACTIVO' ? 'estado-activo' : 'estado-inactivo';
        
        const formatearFecha = (fechaISO) => {
            if (!fechaISO) return '--';
            const d = new Date(fechaISO); return isNaN(d) ? '--' : d.toLocaleDateString('es-CO');
        };

        const tagFuente = u.source_table === 'equipo' 
            ? `<span style="font-size:9px; background:#1e293b; color:#fff; padding:2px 4px; border-radius:3px; margin-left:5px;">Staff</span>` 
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:12px; color:var(--color-texto-suave);">${formatearFecha(u.fecha_unificada)}</td>
            <td>
                <strong>${u.nombre || 'Sin Nombre'}</strong> ${tagFuente}<br>
                <span style="font-size:11px; color:var(--color-texto-suave);">${u.source_table === 'clientes' ? 'CC: ' + (u.cc || 'N/A') : 'Cód: ' + (u.codigo_colaborador || 'N/A')}</span>
            </td>
            <td>
                <div>${u.email || 'Sin correo'}</div>
                <div style="font-size:11px; color:var(--color-texto-suave);">Tel: ${u.telefono || 'N/A'} ${u.ciudad ? '| ' + u.ciudad : ''}</div>
            </td>
            <td><span class="semaforo-estado" style="background:var(--color-primario); color:#fff;">${u.rol_unificado}</span></td>
            <td><span class="semaforo-estado ${claseEstado}">${u.estado_unificado}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-direction:column;">
                    <button class="btn-accion btn-editar" onclick="window.abrirModalUsuario('${u.email}')">Gestionar Perfil</button>
                    ${u.source_table === 'clientes' ? `<button class="btn-accion btn-ocultar" onclick="window.verEstadisticasUsuario('${u.id_unificado}', this)">Estadísticas</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abrirModalUsuario = function(emailEdicion = null) {
    let u = {
        source_table: 'clientes', id_unificado: '', email: '', nombre: '', telefono: '', rol_unificado: 'CLIENTE',
        cc: '', departamento: '', ciudad: '', barrio: '', direccion: '', 
        codigo_referido: '', acepta_politicas: true,
        confianza_nombre: '', confianza_telf: '', confianza_dir: '',
        codigo_colaborador: '', estado_equipo: 'ACTIVO',
        banco: '', tipo_cuenta: '', num_cuenta: ''
    };
    
    let isEdit = false;
    if (emailEdicion) {
        const encontrado = window.directorioGlobal.find(x => x.email === emailEdicion);
        if (encontrado) {
            u = { 
                ...u, ...encontrado, 
                estado_equipo: encontrado.estado || 'ACTIVO',
                acepta_politicas: encontrado.acepta_politicas !== false
            };
            isEdit = true;
        }
    }

    const genRef = u.codigo_referido || `REF${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2,4).toUpperCase()}`;
    const genCol = u.codigo_colaborador || `COL-${Date.now().toString().slice(-4)}`;

    let opcionesRolHtml = '';
    if (!isEdit || u.source_table === 'clientes') {
        opcionesRolHtml += `
            <optgroup label="Tabla: CLIENTES">
                <option value="CLIENTE" ${u.rol_unificado === 'CLIENTE' ? 'selected' : ''}>CLIENTE</option>
                <option value="EMPRESA" ${u.rol_unificado === 'EMPRESA' ? 'selected' : ''}>EMPRESA (Mayorista)</option>
            </optgroup>`;
    }
    if (!isEdit || u.source_table === 'equipo') {
        opcionesRolHtml += `
            <optgroup label="Tabla: EQUIPO">
                <option value="ASESOR" ${u.rol_unificado === 'ASESOR' ? 'selected' : ''}>ASESOR EXTERNO</option>
                <option value="EMPLEADO" ${u.rol_unificado === 'EMPLEADO' ? 'selected' : ''}>EMPLEADO</option>
                <option value="ADMIN" ${u.rol_unificado === 'ADMIN' ? 'selected' : ''}>ADMINISTRADOR</option>
            </optgroup>`;
    }

    const modalHtml = `
        <div class="modal-overlay" id="modal-usuario">
            <div class="modal-content" style="max-width: 900px; max-height: 95vh; overflow-y:auto;">
                <button type="button" class="btn-cerrar-x" id="btn-x-usuario">&times;</button>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2>${isEdit ? 'Editar Perfil' : 'Registrar Nuevo Perfil'}</h2>
                    ${isEdit ? `<button type="button" class="btn-accion btn-eliminar" id="btn-eliminar-usuario">🗑 Borrar Registro</button>` : ''}
                </div>

                <div id="form-usuario">
                    <input type="hidden" id="us-id" value="${u.id_unificado}">
                    <input type="hidden" id="us-source-table" value="${u.source_table}">
                    
                    <div class="detalle-seccion" style="margin-bottom:20px; background:var(--color-fondo); border:1px solid #eee;">
                        <h3 style="margin-bottom:10px;">Rol y Asignación de Tabla</h3>
                        <div class="form-group">
                            <label>Nivel de Cuenta / Rol</label>
                            <select id="us-rol" required ${isEdit ? 'disabled' : ''} style="${isEdit ? 'background:#eee; cursor:not-allowed;' : ''}">
                                ${opcionesRolHtml}
                            </select>
                            ${isEdit ? '<small style="color:var(--color-advertencia); display:block; margin-top:5px;">Para evitar pérdida de historiales, el cambio de rol está limitado a opciones de su misma tabla de origen.</small>' : ''}
                        </div>
                    </div>

                    <div class="detalle-seccion" style="margin-bottom:20px;">
                        <h3 style="margin-bottom:10px;">Datos Principales</h3>
                        <div class="form-grid">
                            <div class="form-group"><label>Nombre Completo / Razón Social</label><input type="text" id="us-nombre" value="${u.nombre || ''}" required></div>
                            <div class="form-group"><label>Correo Electrónico (Login)</label><input type="email" id="us-email" value="${u.email}" required ${isEdit ? 'readonly style="background:#eee; cursor:not-allowed;"' : ''}></div>
                            <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="number" id="us-telefono" value="${u.telefono || ''}" required></div>
                        </div>
                    </div>

                    <div id="bloque-clientes" style="display: none;">
                        <div class="detalle-seccion" style="margin-bottom:20px;">
                            <h3 style="margin-bottom:10px;">Ubicación e Información del Cliente</h3>
                            <div class="form-grid">
                                <div class="form-group"><label>CC / NIT</label><input type="number" id="us-cc" value="${u.cc || ''}"></div>
                                <div class="form-group">
                                    <label>Estado de Políticas</label>
                                    <select id="us-politicas">
                                        <option value="true" ${u.acepta_politicas ? 'selected' : ''}>Aceptadas (Activo)</option>
                                        <option value="false" ${!u.acepta_politicas ? 'selected' : ''}>Pendiente (Inactivo)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Código de Referido (Automático)</label>
                                    <input type="text" id="us-codigo-ref" value="${genRef}" style="background:#fdf2f8; font-weight:bold; color:var(--color-primario);">
                                </div>
                                
                                <div class="form-group" style="position:relative;">
                                    <label>Barrio (Buscador Local)</label>
                                    <input type="text" id="us-barrio" class="calc-envio" value="${u.barrio || ''}" autocomplete="off" required>
                                    <div id="us-res-barrios" class="resultados-flotantes" style="display:none; width:100%; position:absolute; top:100%; left:0; z-index:100; background:#fff; border:1px solid #ccc; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                                </div>

                                <div class="form-group"><label>Ciudad / Municipio</label><input type="text" id="us-ciudad" class="calc-envio" value="${u.ciudad || ''}"></div>
                                <div class="form-group"><label>Departamento (Auto)</label><input type="text" id="us-depto" value="${u.departamento || ''}" readonly style="background:#e2e8f0; font-weight:600;"></div>
                                
                                <div class="form-group"><label>Dirección Específica</label><input type="text" id="us-direccion" value="${u.direccion || ''}"></div>
                            </div>
                        </div>

                        <div class="detalle-seccion" style="margin-bottom:20px; background:#fffbf0; border:1px solid #d97706;">
                            <h3 style="margin-bottom:10px; color:#d97706;">Datos de Confianza (Recibir pedidos)</h3>
                            <div class="form-grid">
                                <div class="form-group"><label>Nombre Persona Confianza</label><input type="text" id="us-conf-nombre" value="${u.confianza_nombre || ''}" placeholder="Ej. Portero, Vecino"></div>
                                <div class="form-group"><label>Teléfono Confianza</label><input type="number" id="us-conf-tel" value="${u.confianza_telf || ''}"></div>
                                <div class="form-group" style="grid-column: 1 / -1;"><label>Dirección de Confianza</label><input type="text" id="us-conf-dir" value="${u.confianza_dir || ''}"></div>
                            </div>
                        </div>
                    </div>

                    <div id="bloque-equipo" style="display: none;">
                        <div class="detalle-seccion" style="margin-bottom:20px; background:#f0fdf4; border:1px solid #166534;">
                            <h3 style="margin-bottom:10px; color:#166534;">Información Laboral y Financiera</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Código Colaborador (Automático)</label>
                                    <input type="text" id="us-codigo-colab" value="${genCol}" style="background:#e0f2fe; font-weight:bold;">
                                </div>
                                <div class="form-group">
                                    <label>Estado Laboral</label>
                                    <select id="us-estado-eq">
                                        <option value="ACTIVO" ${u.estado_equipo === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
                                        <option value="INACTIVO" ${u.estado_equipo === 'INACTIVO' ? 'selected' : ''}>INACTIVO / SUSPENDIDO</option>
                                    </select>
                                </div>
                                <div class="form-group"><label>Banco (Para pagos)</label><input type="text" id="eq-banco" value="${u.banco || ''}" placeholder="Ej. Bancolombia"></div>
                                <div class="form-group">
                                    <label>Tipo Cuenta</label>
                                    <select id="eq-tipo-cuenta">
                                        <option value="" ${!u.tipo_cuenta ? 'selected' : ''}>Seleccionar...</option>
                                        <option value="Ahorros" ${u.tipo_cuenta === 'Ahorros' ? 'selected' : ''}>Ahorros</option>
                                        <option value="Corriente" ${u.tipo_cuenta === 'Corriente' ? 'selected' : ''}>Corriente</option>
                                    </select>
                                </div>
                                <div class="form-group"><label>Número de Cuenta</label><input type="number" id="eq-num-cuenta" value="${u.num_cuenta || ''}"></div>
                            </div>
                        </div>
                    </div>

                    ${isEdit ? `
                    <div class="detalle-seccion" style="margin-bottom:20px; background:rgba(219, 19, 122, 0.05);">
                        <h3 style="margin-bottom:10px; color:var(--color-primario);">Seguridad de Acceso</h3>
                        <div style="display:flex; gap:10px; align-items:flex-end;">
                            <div class="form-group" style="flex:1;">
                                <label>Forzar Envío de Correo de Recuperación</label>
                                <p style="font-size:11px; margin:0 0 5px 0; color:#666;">Enviará un enlace directo al correo para que el usuario asigne una clave nueva.</p>
                            </div>
                            <button type="button" class="btn-secundario" id="btn-enviar-recuperacion" style="height: 38px; margin-bottom: 5px;">Enviar Enlace a Gmail</button>
                        </div>
                    </div>
                    ` : `
                    <div class="detalle-seccion" style="margin-bottom:20px; background:rgba(16, 185, 129, 0.05); border: 1px dashed #10b981; border-radius: 8px;">
                        <p style="color:#166534; font-size: 13px; margin: 0; padding: 12px;">
                            🔐 <b>Creación de App:</b> Al guardar, el sistema generará una contraseña aleatoria de alta seguridad y enviará automáticamente el correo de bienvenida.
                        </p>
                    </div>
                    `}

                    <div class="modal-actions">
                        <button type="button" class="btn-secundario" id="btn-cancelar-us">Cancelar</button>
                        <button type="button" class="btn-primario" id="btn-submit-usuario">${isEdit ? 'Actualizar Registro' : 'Crear y Enviar Bienvenida'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('modal-usuario');
    const cerrar = () => modal.remove();

    document.getElementById('btn-x-usuario').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-us').addEventListener('click', cerrar);

    // AUTOCOMPLETADO DE UBICACIÓN
    const inputBarrio = document.getElementById('us-barrio');
    const resBarrios = document.getElementById('us-res-barrios');
    
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
                    inputBarrio.value = m.n; document.getElementById('us-ciudad').value = m.m;
                    resBarrios.style.display = 'none'; autocompletarDepto();
                };
                resBarrios.appendChild(div);
            });
            resBarrios.style.display = 'block';
        } else { resBarrios.style.display = 'none'; }
    });

    const autocompletarDepto = () => {
        const ciudad = document.getElementById('us-ciudad').value.trim().toUpperCase();
        let deptEncontrado = "";
        for (const [dept, ciudades] of Object.entries(window.MUNICIPIOS || {})) {
            if (ciudades.map(c=>c.toUpperCase()).includes(ciudad)) { deptEncontrado = dept; break; }
        }
        document.getElementById('us-depto').value = deptEncontrado;
    };
    document.querySelectorAll('.calc-envio').forEach(el => el.addEventListener('blur', autocompletarDepto));
    document.addEventListener('click', (e) => { if(!inputBarrio.contains(e.target)) resBarrios.style.display = 'none'; });

    // LÓGICA DINÁMICA: MOSTRAR/OCULTAR BLOQUES
    const rolSelect = document.getElementById('us-rol');
    const bloqueClientes = document.getElementById('bloque-clientes');
    const bloqueEquipo = document.getElementById('bloque-equipo');

    const actualizarFormulario = () => {
        const val = rolSelect.value;
        if (['CLIENTE', 'EMPRESA'].includes(val)) {
            bloqueClientes.style.display = 'block'; bloqueEquipo.style.display = 'none';
        } else {
            bloqueClientes.style.display = 'none'; bloqueEquipo.style.display = 'block';
        }
    };
    rolSelect.addEventListener('change', actualizarFormulario);
    actualizarFormulario();

    document.getElementById('btn-submit-usuario').addEventListener('click', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit-usuario');
        btnSubmit.textContent = "Guardando..."; btnSubmit.disabled = true;

        const emailInput = document.getElementById('us-email').value.trim();
        const rolElegido = document.getElementById('us-rol').value;
        const isTeam = ['ADMIN', 'EMPLEADO', 'ASESOR'].includes(rolElegido);
        const telInput = document.getElementById('us-telefono').value.replace(/\D/g, ''); 

        if (!emailInput) {
            window.mostrarToast("El correo electrónico es obligatorio.", "error");
            btnSubmit.textContent = isEdit ? "Actualizar Registro" : "Crear y Enviar Bienvenida"; 
            btnSubmit.disabled = false; return;
        }

        let tablaDestino = isTeam ? 'equipo' : 'clientes';
        let payload = {};

        if (isTeam) {
            payload = {
                email: emailInput,
                nombre: document.getElementById('us-nombre').value,
                rol: rolElegido,
                telefono: telInput ? Number(telInput) : null,
                codigo_colaborador: document.getElementById('us-codigo-colab').value,
                estado: document.getElementById('us-estado-eq').value,
                banco: document.getElementById('eq-banco').value || null,
                tipo_cuenta: document.getElementById('eq-tipo-cuenta').value || null,
                num_cuenta: document.getElementById('eq-num-cuenta').value || null
            };
        } else {
            const ccInput = document.getElementById('us-cc').value.replace(/\D/g, '');
            const telConfInput = document.getElementById('us-conf-tel').value.replace(/\D/g, '');
            payload = {
                email: emailInput,
                nombre: document.getElementById('us-nombre').value,
                cc: ccInput ? Number(ccInput) : null,
                telefono: telInput ? Number(telInput) : null,
                departamento: document.getElementById('us-depto').value,
                ciudad: document.getElementById('us-ciudad').value,
                barrio: document.getElementById('us-barrio').value,
                direccion: document.getElementById('us-direccion').value,
                nivel_cuenta: rolElegido,
                codigo_referido: document.getElementById('us-codigo-ref').value,
                acepta_politicas: document.getElementById('us-politicas').value === 'true',
                confianza_nombre: document.getElementById('us-conf-nombre').value || null,
                confianza_telf: telConfInput ? Number(telConfInput) : null,
                confianza_dir: document.getElementById('us-conf-dir').value || null
            };
        }

        try {
            let dbError = null;

            // SISTEMA DE GUARDADO INFALIBLE (INSERT/UPDATE DIRECTO)
            if (isEdit) {
                const idCol = isTeam ? 'id_trabajador' : 'id_cliente';
                const idVal = document.getElementById('us-id').value;
                const { error } = await window.supabase.from(tablaDestino).update(payload).eq(idCol, idVal);
                dbError = error;
            } else {
                if (isTeam) payload.fecha_vinculacion = new Date().toISOString();
                else payload.fecha_registro = new Date().toISOString();
                
                const { error } = await window.supabase.from(tablaDestino).insert([payload]);
                dbError = error;
            }

            if (dbError) throw dbError;
            
            window.mostrarToast(isEdit ? "Registro actualizado." : "Registro creado exitosamente.", "exito");

            // DISPARADOR DE AUTH Y CORREO PARA NUEVOS USUARIOS
            if (!isEdit) {
                const claveSegura = `Cupissa${Date.now().toString().slice(-4)}*`;
                fetch(CUPISSA_CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'crearUsuarioAuthYBienvenida',
                        email: payload.email,
                        nombre: payload.nombre,
                        clave_temporal: claveSegura
                    })
                }).catch(err => console.log("Aviso de red interno:", err));
            }

            cerrar(); cargarDirectorioCompleto();
        } catch (error) {
            console.error("Error detallado BD:", error);
            // Mostrará el error exacto que envía Supabase para que no tengamos que adivinar
            window.mostrarToast("Error BD: " + (error.message || "No se pudo guardar"), "error");
            btnSubmit.textContent = isEdit ? "Actualizar Registro" : "Crear y Enviar Bienvenida"; 
            btnSubmit.disabled = false;
        }
    });

    if (isEdit) {
        document.getElementById('btn-enviar-recuperacion').addEventListener('click', async (e) => {
            const btnRec = e.target;
            btnRec.textContent = "Enviando..."; btnRec.disabled = true;
            try {
                const res = await fetch(CUPISSA_CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'recuperarClave', email: u.email })
                }).then(r => r.json());

                if (res.success) { window.mostrarToast("Correo de recuperación enviado exitosamente.", "exito"); btnRec.textContent = "¡Enviado!"; } 
                else { window.mostrarToast("Error del servidor: " + res.error, "error"); btnRec.textContent = "Reintentar"; btnRec.disabled = false; }
            } catch (err) { window.mostrarToast("Fallo de red o bloqueado por el navegador.", "error"); btnRec.textContent = "Reintentar"; btnRec.disabled = false; }
        });

        document.getElementById('btn-eliminar-usuario').addEventListener('click', async () => {
            if (confirm("⚠️ ¿Estás completamente segura de eliminar este registro?")) {
                try {
                    const idCol = u.source_table === 'clientes' ? 'id_cliente' : 'id_trabajador';
                    const idParaBorrar = document.getElementById('us-id').value;
                    const { error } = await window.supabase.from(u.source_table).delete().eq(idCol, idParaBorrar);
                    if (error) throw error;
                    
                    window.mostrarToast("Registro eliminado permanentemente.", "exito");
                    cerrar(); cargarDirectorioCompleto();
                } catch (e) { window.mostrarToast("Error al eliminar. Puede tener datos asociados.", "error"); }
            }
        });
    }
};

window.verEstadisticasUsuario = async function(idCliente, btnContext) {
    if (!idCliente) { window.mostrarToast("ID de perfil inválido.", "error"); return; }
    const cliente = window.directorioGlobal.find(c => c.id_unificado === idCliente);
    if (!cliente) return;

    const btnOrigen = btnContext || document.activeElement;
    const txtOriginal = btnOrigen.textContent;
    btnOrigen.textContent = "Analizando..."; btnOrigen.disabled = true;

    let totalConfirmado = 0; let cantPedidos = 0; let htmlHistorialCupi = "";

    try {
        const { data: pedidos, error: errPed } = await window.supabase.from('pedidos').select('id_pedido, estado_pago, total, created_at').eq('id_cliente', idCliente).order('created_at', { ascending: false });
        if (!errPed && pedidos) {
            cantPedidos = pedidos.length;
            pedidos.forEach(p => { if (String(p.estado_pago).toUpperCase() === 'CONFIRMADO') totalConfirmado += Number(p.total || 0); });
        }

        const { data: histoData, error: errHist } = await window.supabase.from('cupicoins_historial').select('*').eq('id_cliente', idCliente).order('fecha', { ascending: false }).limit(10); 
        if (!errHist && histoData && histoData.length > 0) {
            histoData.forEach(h => {
                const color = Number(h.movimiento) > 0 ? '#10b981' : '#ef4444';
                const signo = Number(h.movimiento) > 0 ? '+' : '';
                const fechaFormat = h.fecha ? new Date(h.fecha).toLocaleDateString('es-CO') : '--';
                htmlHistorialCupi += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:12px;">
                        <div><strong>${h.motivo || 'Movimiento'}</strong><br><span style="color:#888;">${fechaFormat}</span></div>
                        <strong style="color:${color}; font-size:14px;">${signo}${h.movimiento}</strong>
                    </div>`;
            });
        } else { htmlHistorialCupi = `<p style="font-size:12px; color:#888; text-align:center; padding:10px;">Sin movimientos de billetera registrados.</p>`; }
    } catch (e) {}

    btnOrigen.textContent = txtOriginal; btnOrigen.disabled = false;

    const modalHtml = `
        <div class="modal-overlay" id="modal-estadisticas">
            <div class="modal-content" style="max-width: 550px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="margin-bottom: 20px; color: var(--color-primario);">Estadísticas: ${cliente.nombre}</h2>
                <div style="display:flex; justify-content:space-between; padding-bottom:10px; border-bottom:1px solid #eee;"><span>CC/NIT:</span><strong>${cliente.cc || 'N/A'}</strong></div>
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;"><span>Volumen de Pedidos (Compras):</span><strong>${cantPedidos}</strong></div>
                <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:18px;"><span>Total Facturado (Confirmado):</span><strong style="color:#10b981;">$${totalConfirmado.toLocaleString('es-CO')}</strong></div>
                <div style="padding:20px; background:rgba(219, 19, 122, 0.05); border:1px solid rgba(219,19,122,0.3); border-radius:8px; margin-top:20px; text-align:center;">
                    <p style="font-size:13px; margin:0 0 5px 0; color:#555; text-transform:uppercase; font-weight:bold;">Saldo Disponible CupiCoins</p>
                    <h1 style="color:var(--color-primario); margin:0; font-size:36px; line-height:1;">${Number(cliente.cupicoins_totales || 0).toLocaleString('es-CO')} CC</h1>
                </div>
                <h4 style="margin:20px 0 10px 0; border-bottom:2px solid #eee; padding-bottom:5px;">Últimos Movimientos de Billetera</h4>
                <div style="max-height: 200px; overflow-y: auto; padding-right:10px;">${htmlHistorialCupi}</div>
                <div class="modal-actions" style="margin-top:20px;"><button type="button" class="btn-primario" onclick="this.closest('.modal-overlay').remove()" style="width:100%;">Cerrar Historial</button></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};