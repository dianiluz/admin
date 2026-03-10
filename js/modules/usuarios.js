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
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'obtenerTodosUsuariosERP' })
        });
        const data = await response.json();
        
        if (data.success && data.usuarios) {
            window.usuariosERPGlobales = data.usuarios;
            renderizarTablaUsuarios(window.usuariosERPGlobales);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-peligro);">Error: ${data.error}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-peligro);">Error de conexión.</td></tr>`;
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

                <form id="form-usuario">
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
                            <div class="form-group"><label>CC / NIT</label><input type="text" id="us-cc" value="${u.cc}" required></div>
                            <div class="form-group"><label>Correo Electrónico (Login)</label><input type="email" id="us-email" value="${u.email}" required ${isEdit ? 'readonly style="background:#eee;"' : ''}></div>
                            <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="text" id="us-telefono" value="${u.telefono}" required></div>
                            <div class="form-group"><label>Departamento</label><input type="text" id="us-depto" value="${u.departamento}"></div>
                            <div class="form-group"><label>Ciudad</label><input type="text" id="us-ciudad" value="${u.ciudad}"></div>
                            <div class="form-group"><label>Barrio</label><input type="text" id="us-barrio" value="${u.barrio}"></div>
                            <div class="form-group"><label>Dirección</label><input type="text" id="us-direccion" value="${u.direccion}"></div>
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
                            🔐 <b>Seguridad Automática:</b> Al guardar, se enviará un correo electrónico al usuario con un enlace seguro para que configure su propia contraseña.
                        </p>
                    </div>
                    `}

                    <div class="modal-actions">
                        <button type="button" class="btn-secundario" id="btn-cancelar-us">Cancelar</button>
                        <button type="submit" class="btn-primario">${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('modal-usuario');
    const cerrar = () => modal.remove();

    document.getElementById('btn-x-usuario').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-us').addEventListener('click', cerrar);

    // Lógica dinámica para mostrar campos bancarios solo si es ASESOR
    document.getElementById('us-tipo').addEventListener('change', (e) => {
        const bloqueBanco = document.getElementById('bloque-banco');
        if (e.target.value === 'ASESOR') {
            bloqueBanco.style.display = 'block';
        } else {
            bloqueBanco.style.display = 'none';
        }
    });

    // Guardar Usuario (Crear o Actualizar)
    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.textContent = "Procesando..."; btnSubmit.disabled = true;

        const payload = {
            action: isEdit ? 'actualizarUsuarioERP' : 'crearUsuarioERP',
            usuario: {
                email_original: document.getElementById('us-email-original').value,
                tipo_usuario: document.getElementById('us-tipo').value,
                activo: document.getElementById('us-activo').value,
                nombre: document.getElementById('us-nombre').value,
                cc: document.getElementById('us-cc').value,
                email: document.getElementById('us-email').value,
                telefono: document.getElementById('us-telefono').value,
                departamento: document.getElementById('us-depto').value,
                ciudad: document.getElementById('us-ciudad').value,
                barrio: document.getElementById('us-barrio').value,
                direccion: document.getElementById('us-direccion').value,
                banco: document.getElementById('us-banco').value,
                tipo_cuenta: document.getElementById('us-tipo-cuenta').value,
                num_cuenta: document.getElementById('us-num-cuenta').value
            }
        };

        try {
            const response = await fetch(CUPISSA_CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const data = await response.json();
            if (data.success) {
                window.mostrarToast(data.message, "exito");
                cerrar(); cargarUsuariosERP();
            } else {
                window.mostrarToast("Error: " + data.error, "error");
                btnSubmit.textContent = isEdit ? "Guardar Cambios" : "Crear Usuario"; btnSubmit.disabled = false;
            }
        } catch (error) {
            window.mostrarToast("Error de conexión.", "error"); btnSubmit.disabled = false;
        }
    });

    // Resetear Clave Individualmente
    if (isEdit) {
        document.getElementById('btn-cambiar-clave').addEventListener('click', async () => {
            const nueva = document.getElementById('us-nueva-clave').value;
            if (nueva.length < 6) { window.mostrarToast("La clave debe tener al menos 6 caracteres.", "error"); return; }
            
            try {
                const response = await fetch(CUPISSA_CONFIG.API_URL, {
                    method: 'POST', 
                    body: JSON.stringify({ action: 'resetearClaveERP', email: u.email, nueva_clave: nueva })
                });
                const data = await response.json();
                if (data.success) {
                    window.mostrarToast("Contraseña actualizada con éxito.", "exito");
                    document.getElementById('us-nueva-clave').value = '';
                } else window.mostrarToast(data.error, "error");
            } catch (e) { window.mostrarToast("Error de conexión.", "error"); }
        });

        // Eliminar Usuario
        document.getElementById('btn-eliminar-usuario').addEventListener('click', async () => {
            if (confirm("¿Estás segura de eliminar este usuario? Perderá acceso a la plataforma.")) {
                try {
                    const response = await fetch(CUPISSA_CONFIG.API_URL, {
                        method: 'POST', body: JSON.stringify({ action: 'eliminarUsuarioERP', email: u.email })
                    });
                    const data = await response.json();
                    if (data.success) {
                        window.mostrarToast("Usuario eliminado.", "exito");
                        cerrar(); cargarUsuariosERP();
                    } else window.mostrarToast(data.error, "error");
                } catch (e) { window.mostrarToast("Error de conexión.", "error"); }
            }
        });
    }
};

window.verEstadisticasUsuario = function(email, rol, nombre) {
    // Calculamos estadísticas cruzando la base de pedidos global que ya tienes cargada en el ERP
    let totalCompras = 0;
    let cantPedidos = 0;
    let textoFinanzas = "";

    if (window.pedidosGlobales) {
        const pedidosDelUsuario = window.pedidosGlobales.filter(p => p.usuario_email === email || p.cliente === nombre);
        cantPedidos = pedidosDelUsuario.length;
        
        pedidosDelUsuario.forEach(p => {
            if (String(p.estado_pago).toUpperCase() === 'CONFIRMADO') {
                totalCompras += Number(p.total || 0);
            }
        });
    }

    if (rol === 'ASESOR') {
        // Lógica sugerida: Las comisiones podrían ser un % de las compras que gestionaron.
        // Como no tengo la lógica exacta de comisiones, pongo un mensaje informativo:
        textoFinanzas = `<div style="padding:15px; background:#f0fdf4; border:1px solid #166534; border-radius:8px; margin-top:15px;">
                            <h4 style="color:#166534; margin-bottom:5px;">Panel de Asesor</h4>
                            <p style="font-size:13px;">Para calcular comisiones exactas, se requiere integrar el cruce con ventas cerradas por este asesor.</p>
                         </div>`;
    } else {
        const cupiCoinsAprox = Math.floor(totalCompras * 0.05); // Ejemplo: 5% de cashback en CupiCoins
        textoFinanzas = `<div style="padding:15px; background:rgba(219, 19, 122, 0.05); border:1px solid rgba(219,19,122,0.3); border-radius:8px; margin-top:15px;">
                            <h4 style="color:var(--color-primario); margin-bottom:5px;">Fidelización Cupissa</h4>
                            <p style="font-size:14px; margin-bottom:5px;"><strong>CupiCoins Estimadas:</strong> ${cupiCoinsAprox.toLocaleString('es-CO')} CC</p>
                            <p style="font-size:11px; color:var(--color-texto-suave);">*Basado en el histórico de compras confirmadas.</p>
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