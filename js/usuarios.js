window.usuariosERPGlobales = [];

window.renderUsuarios = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Gestión de Usuarios y Roles</h2>
            <button class="btn-primario" id="btn-crear-usuario">+ Registrar Usuario</button>
        </div>
        <div class="card">
            <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <input type="text" id="buscador-usuarios" class="buscador-panel" placeholder="Buscar por nombre, correo o CC..." style="flex: 1; min-width: 250px;">
                
                <select id="filtro-rol-usuario" class="buscador-panel" style="width: auto;">
                    <option value="">Todos los Roles</option>
                    <option value="CLIENTE">Clientes</option>
                    <option value="EMPRESA">Empresas</option>
                    <option value="ADMIN">Administradores</option>
                    <option value="EMPLEADO">Empleados</option>
                    <option value="ASESOR">Asesores</option>
                </select>

                <select id="filtro-estado-usuario" class="buscador-panel" style="width: auto;">
                    <option value="">Todos los Estados</option>
                    <option value="SI">Activos</option>
                    <option value="NO">Inactivos</option>
                </select>
            </div>
            
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Registro</th>
                            <th>Usuario</th>
                            <th>Contacto</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-usuarios-body">
                        <tr><td colspan="6" style="text-align:center; padding: 20px;">Cargando usuarios...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-crear-usuario').addEventListener('click', () => window.abrirModalUsuario());
    
    const aplicarFiltros = () => {
        const termino = document.getElementById('buscador-usuarios').value.toLowerCase();
        const rol = document.getElementById('filtro-rol-usuario').value;
        const estado = document.getElementById('filtro-estado-usuario').value;

        const filtrados = window.usuariosERPGlobales.filter(u => {
            const matchTexto = (u.nombre && u.nombre.toLowerCase().includes(termino)) || 
                               (u.email && u.email.toLowerCase().includes(termino)) || 
                               (String(u.cc || '').includes(termino));
            const matchRol = rol === "" || u.tipo_usuario === rol;
            const matchEstado = estado === "" || String(u.activo || '').toUpperCase() === estado;
            
            return matchTexto && matchRol && matchEstado;
        });
        renderizarTablaUsuarios(filtrados);
    };

    document.getElementById('buscador-usuarios').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-rol-usuario').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-estado-usuario').addEventListener('change', aplicarFiltros);

    cargarUsuariosERP();
};

async function cargarUsuariosERP() {
    const tbody = document.getElementById('tabla-usuarios-body');
    try {
        const { data, error } = await window.supabase.from('usuarios').select('*').order('fecha_creacion', { ascending: false });
        
        if (error) throw error;
        
        window.usuariosERPGlobales = data || [];
        renderizarTablaUsuarios(window.usuariosERPGlobales);
        
    } catch (error) {
        console.error("Error cargando usuarios:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-peligro);">Error de conexión con la base de datos.</td></tr>`;
    }
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById('tabla-usuarios-body');
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron usuarios.</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const estado = String(u.activo || 'NO').toUpperCase();
        const claseEstado = estado === 'SI' ? 'estado-activo' : 'estado-inactivo';
        
        const formatearFecha = (fechaISO) => {
            if (!fechaISO) return '--';
            const d = new Date(fechaISO); return isNaN(d) ? '--' : d.toLocaleDateString('es-CO');
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:12px; color:var(--color-texto-suave);">${formatearFecha(u.fecha_creacion)}</td>
            <td>
                <strong>${u.nombre || 'Sin Nombre'}</strong><br>
                <span style="font-size:11px; color:var(--color-texto-suave);">CC: ${u.cc || 'N/A'}</span>
            </td>
            <td>
                <div>${u.email || ''}</div>
                <div style="font-size:11px; color:var(--color-texto-suave);">Tel: ${u.telefono || ''}</div>
            </td>
            <td><span class="semaforo-estado" style="background:var(--color-primario); color:#fff;">${u.tipo_usuario || 'CLIENTE'}</span></td>
            <td><span class="semaforo-estado ${claseEstado}">${estado === 'SI' ? 'ACTIVO' : 'BLOQUEADO'}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-direction:column;">
                    <button class="btn-accion btn-editar" onclick="window.abrirModalUsuario('${u.email}')">Gestionar</button>
                    <button class="btn-accion btn-ocultar" onclick="window.verEstadisticasUsuario('${u.email}', '${u.tipo_usuario}', '${u.nombre}')">Estadísticas</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abrirModalUsuario = function(emailEdicion = null) {
    let u = {
        tipo_usuario: 'CLIENTE', nombre: '', cc: '', email: '', telefono: '', activo: 'SI',
        departamento: '', ciudad: '', barrio: '', direccion: '', 
        banco: '', tipo_cuenta: '', num_cuenta: ''
    };
    
    let isEdit = false;
    if (emailEdicion) {
        const encontrado = window.usuariosERPGlobales.find(x => x.email === emailEdicion);
        if (encontrado) {
            u = { ...u, ...encontrado };
            isEdit = true;
        }
    }

    const modalHtml = `
        <div class="modal-overlay" id="modal-usuario">
            <div class="modal-content" style="max-width: 800px;">
                <button type="button" class="btn-cerrar-x" id="btn-x-usuario">&times;</button>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2>${isEdit ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
                    ${isEdit ? `<button type="button" class="btn-accion btn-eliminar" id="btn-eliminar-usuario">🗑 Eliminar Usuario</button>` : ''}
                </div>

                <div id="form-usuario">
                    <input type="hidden" id="us-email-original" value="${u.email}">
                    
                    <div class="detalle-seccion" style="margin-bottom:20px;">
                        <h3 style="margin-bottom:10px;">Perfil y Accesos</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Rol de Usuario</label>
                                <select id="us-tipo" required>
                                    <option value="CLIENTE" ${u.tipo_usuario === 'CLIENTE' ? 'selected' : ''}>CLIENTE</option>
                                    <option value="EMPRESA" ${u.tipo_usuario === 'EMPRESA' ? 'selected' : ''}>EMPRESA</option>
                                    <option value="ASESOR" ${u.tipo_usuario === 'ASESOR' ? 'selected' : ''}>ASESOR</option>
                                    <option value="EMPLEADO" ${u.tipo_usuario === 'EMPLEADO' ? 'selected' : ''}>EMPLEADO</option>
                                    <option value="ADMIN" ${u.tipo_usuario === 'ADMIN' ? 'selected' : ''}>ADMINISTRADOR</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estado en Plataforma</label>
                                <select id="us-activo" required>
                                    <option value="SI" ${u.activo === 'SI' ? 'selected' : ''}>ACTIVO (Permitir Acceso)</option>
                                    <option value="NO" ${u.activo === 'NO' ? 'selected' : ''}>INACTIVO (Bloqueado)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="detalle-seccion" style="margin-bottom:20px;">
                        <h3 style="margin-bottom:10px;">Datos Personales</h3>
                        <div class="form-grid">
                            <div class="form-group"><label>Nombre Completo / Razón Social</label><input type="text" id="us-nombre" value="${u.nombre}" required></div>
                            <div class="form-group"><label>CC / NIT</label><input type="text" id="us-cc" value="${u.cc || ''}"></div>
                            <div class="form-group"><label>Correo Electrónico (Login)</label><input type="email" id="us-email" value="${u.email}" required ${isEdit ? 'readonly style="background:#eee;"' : ''}></div>
                            <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="text" id="us-telefono" value="${u.telefono || ''}"></div>
                            <div class="form-group"><label>Departamento</label><input type="text" id="us-depto" value="${u.departamento || ''}"></div>
                            <div class="form-group"><label>Ciudad</label><input type="text" id="us-ciudad" value="${u.ciudad || ''}"></div>
                            <div class="form-group"><label>Barrio</label><input type="text" id="us-barrio" value="${u.barrio || ''}"></div>
                            <div class="form-group"><label>Dirección</label><input type="text" id="us-direccion" value="${u.direccion || ''}"></div>
                        </div>
                    </div>

                    <div class="detalle-seccion" id="bloque-banco" style="margin-bottom:20px; background:#f0fdf4; border:1px solid #166534; display: ${u.tipo_usuario === 'ASESOR' ? 'block' : 'none'};">
                        <h3 style="margin-bottom:10px; color:#166534;">Datos Financieros (Comisiones Asesor)</h3>
                        <div class="form-grid">
                            <div class="form-group"><label>Banco</label><input type="text" id="us-banco" value="${u.banco || ''}" placeholder="Ej. Bancolombia, Nequi"></div>
                            <div class="form-group">
                                <label>Tipo de Cuenta</label>
                                <select id="us-tipo-cuenta">
                                    <option value="" ${!u.tipo_cuenta ? 'selected' : ''}>Seleccione...</option>
                                    <option value="Ahorros" ${u.tipo_cuenta === 'Ahorros' ? 'selected' : ''}>Ahorros</option>
                                    <option value="Corriente" ${u.tipo_cuenta === 'Corriente' ? 'selected' : ''}>Corriente</option>
                                </select>
                            </div>
                            <div class="form-group"><label>Número de Cuenta</label><input type="text" id="us-num-cuenta" value="${u.num_cuenta || ''}"></div>
                        </div>
                    </div>

                    ${isEdit ? `
                    <div class="detalle-seccion" style="margin-bottom:20px; background:rgba(219, 19, 122, 0.05);">
                        <h3 style="margin-bottom:10px; color:var(--color-primario);">Seguridad</h3>
                        <div style="display:flex; gap:10px; align-items:flex-end;">
                            <div class="form-group" style="flex:1;">
                                <label>Forzar Nueva Contraseña</label>
                                <input type="password" id="us-nueva-clave" placeholder="Escribe para cambiarla...">
                            </div>
                            <button type="button" class="btn-secundario" id="btn-cambiar-clave" style="height: 38px; margin-bottom: 5px;">Aplicar Clave</button>
                        </div>
                    </div>
                    ` : `
                    <div class="detalle-seccion" style="margin-bottom:20px; background:rgba(16, 185, 129, 0.05); border: 1px dashed #10b981; border-radius: 8px;">
                        <p style="color:#166534; font-size: 13px; margin: 0; padding: 12px;">
                            🔐 <b>Seguridad Inicial:</b> Al crear un usuario, su contraseña inicial por defecto será su número de CC / NIT. El usuario recibirá un correo con instrucciones.
                        </p>
                    </div>
                    `}

                    <div class="modal-actions">
                        <button type="button" class="btn-secundario" id="btn-cancelar-us">Cancelar</button>
                        <button type="button" class="btn-primario" id="btn-submit-usuario">${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</button>
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

    document.getElementById('us-tipo').addEventListener('change', (e) => {
        const bloqueBanco = document.getElementById('bloque-banco');
        if (e.target.value === 'ASESOR') {
            bloqueBanco.style.display = 'block';
        } else {
            bloqueBanco.style.display = 'none';
        }
    });

    document.getElementById('btn-submit-usuario').addEventListener('click', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit-usuario');
        btnSubmit.textContent = "Procesando..."; 
        btnSubmit.disabled = true;

        const emailInput = document.getElementById('us-email').value.trim();
        const ccInput = document.getElementById('us-cc').value.replace(/\D/g, ''); 
        const telInput = document.getElementById('us-telefono').value.replace(/\D/g, ''); 

        if (!emailInput) {
            window.mostrarToast("El correo electrónico es obligatorio.", "error");
            btnSubmit.textContent = isEdit ? "Guardar Cambios" : "Crear Usuario"; 
            btnSubmit.disabled = false;
            return;
        }

        const dataToSave = {
            email: emailInput,
            nombre: document.getElementById('us-nombre').value,
            tipo_usuario: document.getElementById('us-tipo').value,
            activo: document.getElementById('us-activo').value,
            cc: ccInput ? parseInt(ccInput) : null,
            telefono: telInput ? parseInt(telInput) : null,
            departamento: document.getElementById('us-depto').value,
            ciudad: document.getElementById('us-ciudad').value,
            barrio: document.getElementById('us-barrio').value,
            direccion: document.getElementById('us-direccion').value
        };

        if (dataToSave.tipo_usuario === 'ASESOR') {
            dataToSave.banco = document.getElementById('us-banco').value;
            dataToSave.tipo_cuenta = document.getElementById('us-tipo-cuenta').value;
            dataToSave.num_cuenta = document.getElementById('us-num-cuenta').value;
        }

        if (!isEdit) {
            dataToSave.password_hash = ccInput || "123456"; 
            dataToSave.fecha_creacion = new Date().toISOString();
        }

        try {
            const { error } = await window.supabase.from('usuarios').upsert(dataToSave, { onConflict: 'email' });
            if (error) throw error;
            
            window.mostrarToast(isEdit ? "Usuario actualizado." : "Usuario creado exitosamente.", "exito");

            // --- LLAMADA AL NUEVO BACKEND PARA ENVIAR CORREO DE BIENVENIDA ---
            if (!isEdit) {
                fetch(CUPISSA_CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'enviarCorreoBienvenida',
                        email: dataToSave.email,
                        nombre: dataToSave.nombre,
                        clave_temporal: dataToSave.password_hash
                    })
                }).catch(err => console.log("Aviso: El correo de bienvenida pudo no enviarse.", err));
            }

            cerrar(); 
            cargarUsuariosERP();
        } catch (error) {
            console.error(error);
            window.mostrarToast("Error de base de datos al guardar.", "error");
            btnSubmit.textContent = isEdit ? "Guardar Cambios" : "Crear Usuario"; 
            btnSubmit.disabled = false;
        }
    });

    if (isEdit) {
        document.getElementById('btn-cambiar-clave').addEventListener('click', async () => {
            const nueva = document.getElementById('us-nueva-clave').value;
            if (nueva.length < 6) { window.mostrarToast("La clave debe tener al menos 6 caracteres.", "error"); return; }
            
            try {
                const { error } = await window.supabase.from('usuarios').update({ password_hash: nueva }).eq('email', u.email);
                if (error) throw error;
                
                window.mostrarToast("Contraseña actualizada con éxito.", "exito");
                document.getElementById('us-nueva-clave').value = '';
            } catch (e) { 
                window.mostrarToast("Error al actualizar contraseña.", "error"); 
            }
        });

        document.getElementById('btn-eliminar-usuario').addEventListener('click', async () => {
            if (confirm("¿Estás segura de eliminar este usuario? Perderá acceso a la plataforma.")) {
                try {
                    const { error } = await window.supabase.from('usuarios').delete().eq('email', u.email);
                    if (error) throw error;
                    
                    window.mostrarToast("Usuario eliminado.", "exito");
                    cerrar(); 
                    cargarUsuariosERP();
                } catch (e) { 
                    window.mostrarToast("Error al eliminar de la base de datos.", "error"); 
                }
            }
        });
    }
};

window.verEstadisticasUsuario = async function(email, rol, nombre) {
    let totalCompras = 0;
    let cantPedidos = 0;
    let textoFinanzas = "";

    // Para que las estadísticas SIEMPRE sean reales, consultamos Supabase en vivo
    const btnOrigen = event.target;
    btnOrigen.textContent = "Calculando...";

    try {
        const { data: pedidos, error } = await window.supabase
            .from('pedidos')
            .select('estado_pago, total')
            .or(`usuario_email.eq.${email},cliente.ilike.%${nombre}%`); // Busca por email O por nombre
            
        if (!error && pedidos) {
            cantPedidos = pedidos.length;
            pedidos.forEach(p => {
                if (String(p.estado_pago).toUpperCase() === 'CONFIRMADO') {
                    totalCompras += Number(p.total || 0);
                }
            });
        }
    } catch (e) {
        console.error("Fallo obteniendo estadísticas", e);
    }

    btnOrigen.textContent = "Estadísticas"; // Restauramos el botón

    if (rol === 'ASESOR') {
        textoFinanzas = `
            <div style="padding:15px; background:#f0fdf4; border:1px solid #166534; border-radius:8px; margin-top:15px;">
                <h4 style="color:#166534; margin-bottom:5px;">Panel de Asesor</h4>
                <p style="font-size:13px;">Este usuario es un Asesor de ventas. El cruce con ventas cerradas por referidos se habilita conectando la columna 'vendedor' en los pedidos.</p>
            </div>`;
    } else {
        const cupiCoinsAprox = Math.floor(totalCompras * 0.05); // Ejemplo: 5% de cashback en CupiCoins
        textoFinanzas = `
            <div style="padding:15px; background:rgba(219, 19, 122, 0.05); border:1px solid rgba(219,19,122,0.3); border-radius:8px; margin-top:15px;">
                <h4 style="color:var(--color-primario); margin-bottom:5px;">Fidelización Cupissa</h4>
                <p style="font-size:14px; margin-bottom:5px;"><strong>CupiCoins Estimadas:</strong> ${cupiCoinsAprox.toLocaleString('es-CO')} CC</p>
                <p style="font-size:11px; color:var(--color-texto-suave);">*Lectura en tiempo real de la base de datos de compras confirmadas.</p>
            </div>`;
    }

    const modalHtml = `
        <div class="modal-overlay" id="modal-estadisticas">
            <div class="modal-content" style="max-width: 500px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="margin-bottom: 20px;">Estadísticas: ${nombre}</h2>
                
                <div style="display:flex; justify-content:space-between; padding-bottom:10px; border-bottom:1px solid #eee;">
                    <span>Rol de Cuenta:</span>
                    <strong>${rol}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                    <span>Pedidos Realizados:</span>
                    <strong>${cantPedidos}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:18px;">
                    <span>Total Comprado (Confirmado):</span>
                    <strong style="color:var(--color-primario);">$${totalCompras.toLocaleString('es-CO')}</strong>
                </div>

                ${textoFinanzas}
                
                <div class="modal-actions" style="margin-top:20px;">
                    <button type="button" class="btn-primario" onclick="this.closest('.modal-overlay').remove()" style="width:100%;">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};