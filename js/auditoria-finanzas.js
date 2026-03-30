// js/auditoria-finanzas.js

window.auditoriaFinanzasGlobal = [];
window.clientesGlobalesAudi = [];

window.renderAuditoriaFinanzas = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    const estilosAuditoria = `
        <style>
            .audi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
            .audi-filtros { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-end; }
            .input-audi { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
            .input-audi:focus { border-color: #db137a; }
            .label-audi { display: block; font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
            
            .audi-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .audi-kpi { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #334155; }
            .audi-kpi-titulo { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .audi-kpi-valor { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
            
            .btn-audi-sm { padding: 4px 8px; font-size: 11px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; transition: 0.2s; }
            .btn-audi-edit { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
            .btn-audi-edit:hover { background: #e2e8f0; }
            .btn-audi-del { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
            .btn-audi-del:hover { background: #fee2e2; }
            .btn-audi-lock { background: #f8fafc; color: #94a3b8; border: 1px dashed #cbd5e1; cursor: not-allowed; }
            .badge-tipo { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
        </style>
    `;

    dynamicContent.innerHTML = estilosAuditoria + `
        <div class="audi-header">
            <div>
                <h2 style="margin:0; font-family:'Bree Serif'; color:var(--color-primario);">💰 Auditoría Financiera</h2>
                <p style="margin:5px 0 0 0; color:#64748b; font-size:13px;">Registro maestro de transacciones y ventas del ERP. Modo solo lectura y edición de administrador.</p>
            </div>
            <button class="btn-secundario" onclick="cargarFinanzasAuditoria()">🔄 Sincronizar Datos</button>
        </div>

        <div class="audi-filtros">
            <div style="flex: 1; min-width: 150px;">
                <label class="label-audi">Mes / Periodo</label>
                <input type="month" id="filtro-mes-audi" class="input-audi" onchange="aplicarFiltrosAuditoria()">
            </div>
            <div style="flex: 1; min-width: 150px;">
                <label class="label-audi">Tipo de Movimiento</label>
                <select id="filtro-tipo-audi" class="input-audi" onchange="aplicarFiltrosAuditoria()">
                    <option value="">TODOS</option>
                    <option value="INGRESO">INGRESOS</option>
                    <option value="EGRESO">EGRESOS</option>
                    <option value="TRASLADO">TRASLADOS INTERNOS</option>
                </select>
            </div>
            <div style="flex: 2; min-width: 200px;">
                <label class="label-audi">Buscar (Tercero, Concepto, Ref)</label>
                <input type="text" id="filtro-texto-audi" class="input-audi" placeholder="Buscar..." oninput="aplicarFiltrosAuditoria()">
            </div>
            <button class="btn-primario" style="background:#334155; border:none;" onclick="limpiarFiltrosAuditoria()">Limpiar</button>
        </div>

        <div class="audi-kpi-grid">
            <div class="audi-kpi" style="border-left-color: #10b981;">
                <div class="audi-kpi-titulo">Total Ingresos (Ventas + Manuales)</div>
                <div class="audi-kpi-valor" id="kpi-audi-ing" style="color: #10b981;">$0</div>
            </div>
            <div class="audi-kpi" style="border-left-color: #ef4444;">
                <div class="audi-kpi-titulo">Total Egresos Filtrados</div>
                <div class="audi-kpi-valor" id="kpi-audi-egr" style="color: #ef4444;">$0</div>
            </div>
            <div class="audi-kpi" style="border-left-color: #0ea5e9;">
                <div class="audi-kpi-titulo">Balance (Flujo Neto)</div>
                <div class="audi-kpi-valor" id="kpi-audi-neto" style="color: #0ea5e9;">$0</div>
            </div>
        </div>

        <div class="card" style="overflow-x:auto; padding:0;">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:900px;">
                <thead style="background:#f8fafc;">
                    <tr>
                        <th style="padding:15px;">ID / Fecha</th>
                        <th style="padding:15px;">Tipo</th>
                        <th style="padding:15px;">Cuenta (PUC) / Concepto</th>
                        <th style="padding:15px;">Tercero / Origen</th>
                        <th style="padding:15px;">Método</th>
                        <th style="padding:15px; text-align:right;">Monto</th>
                        <th style="padding:15px; text-align:center;">Soporte</th>
                        <th style="padding:15px; text-align:center;">Auditoría</th>
                    </tr>
                </thead>
                <tbody id="tabla-auditoria-finanzas">
                    <tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">⏳ Sincronizando con Base de Datos...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('filtro-mes-audi').value = mesActual;

    cargarFinanzasAuditoria();
};

// ==========================================
// Cargar Datos de Supabase (FUSIÓN DE TABLAS)
// ==========================================
async function cargarFinanzasAuditoria() {
    try {
        // Obtenemos Finanzas, Pedidos pagados y Clientes al mismo tiempo
        const [resFinanzas, resPedidos, resClientes] = await Promise.all([
            window.supabase.from('finanzas').select('*'),
            window.supabase.from('pedidos').select('*').in('estado_pago', ['CONFIRMADO', 'PAGADO']),
            window.supabase.from('clientes').select('id_cliente, nombre')
        ]);

        if (resFinanzas.error) throw resFinanzas.error;
        if (resPedidos.error) throw resPedidos.error;

        // Mapear nombres de clientes para los pedidos
        const mapaClientes = {};
        if (resClientes.data) {
            resClientes.data.forEach(c => mapaClientes[c.id_cliente] = c.nombre);
            window.clientesGlobalesAudi = resClientes.data;
        }

        // Convertir los Pedidos al formato de Finanzas
        const ventasConvertidas = (resPedidos.data || []).map(p => ({
            id: p.id_pedido,
            fecha: p.fecha_entrega_real || p.created_at,
            tipo: 'INGRESO',
            categoria: '4135 - Venta ERP / POS',
            descripcion: 'Ingreso generado por sistema de pedidos',
            creado_por: mapaClientes[p.id_cliente] || 'Cliente (Sistema)',
            metodo_pago: p.metodo_pago || 'Múltiple',
            monto: p.total,
            soporte_url: null,
            es_venta_automatica: true // Bandera de seguridad
        }));

        // Fusionar ambas tablas y ordenar por fecha descendente
        const historialCompleto = [...(resFinanzas.data || []), ...ventasConvertidas];
        window.auditoriaFinanzasGlobal = historialCompleto.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        
        aplicarFiltrosAuditoria();
        
    } catch (err) {
        document.getElementById('tabla-auditoria-finanzas').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red; padding:30px;">Error de conexión: ${err.message}</td></tr>`;
    }
}

// ==========================================
// Filtros y Renderizado
// ==========================================
window.aplicarFiltrosAuditoria = function() {
    const mes = document.getElementById('filtro-mes-audi').value; // Formato YYYY-MM
    const tipo = document.getElementById('filtro-tipo-audi').value;
    const texto = document.getElementById('filtro-texto-audi').value.toLowerCase();

    let filtrados = window.auditoriaFinanzasGlobal.filter(item => {
        let pasaMes = true;
        if (mes) {
            const fechaItem = new Date(item.fecha);
            const mesItem = `${fechaItem.getFullYear()}-${String(fechaItem.getMonth() + 1).padStart(2, '0')}`;
            pasaMes = mesItem === mes;
        }
        
        let pasaTipo = tipo === "" || item.tipo === tipo;
        
        let pasaTexto = texto === "" || 
            (item.categoria && item.categoria.toLowerCase().includes(texto)) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(texto)) ||
            (item.creado_por && item.creado_por.toLowerCase().includes(texto)) ||
            (item.id && item.id.toLowerCase().includes(texto));

        return pasaMes && pasaTipo && pasaTexto;
    });

    renderTablaAuditoria(filtrados);
};

window.limpiarFiltrosAuditoria = function() {
    document.getElementById('filtro-mes-audi').value = '';
    document.getElementById('filtro-tipo-audi').value = '';
    document.getElementById('filtro-texto-audi').value = '';
    aplicarFiltrosAuditoria();
};

function renderTablaAuditoria(datos) {
    const tbody = document.getElementById('tabla-auditoria-finanzas');
    let ing = 0, egr = 0;
    
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No se encontraron registros con los filtros actuales.</td></tr>';
        document.getElementById('kpi-audi-ing').innerText = "$0";
        document.getElementById('kpi-audi-egr').innerText = "$0";
        document.getElementById('kpi-audi-neto').innerText = "$0";
        return;
    }

    let filas = '';
    datos.forEach(item => {
        if(item.tipo === 'INGRESO') ing += Number(item.monto);
        else if(item.tipo === 'EGRESO') egr += Number(item.monto);

        let badgeStyle = "background:#f1f5f9; color:#475569;";
        let colorMonto = "#334155";
        let signo = "";

        if (item.tipo === 'INGRESO') { badgeStyle = "background:#dcfce7; color:#166534;"; colorMonto = "#10b981"; signo = "+"; }
        if (item.tipo === 'EGRESO') { badgeStyle = "background:#fee2e2; color:#991b1b;"; colorMonto = "#ef4444"; signo = "-"; }
        if (item.tipo === 'TRASLADO') { badgeStyle = "background:#e0f2fe; color:#0369a1;"; colorMonto = "#0ea5e9"; signo = "⇄"; }

        // Si es una venta automática, no dejamos editarla aquí. Debe hacerse desde Pedidos.
        let botonesAuditoria = `
            <button class="btn-audi-sm btn-audi-edit" onclick='abrirModalEdicionAuditoria(${JSON.stringify(item).replace(/'/g, "&#39;")})' title="Editar Registro">✏️</button>
            <button class="btn-audi-sm btn-audi-del" onclick="eliminarRegistroFinanciero('${item.id}')" title="Eliminar Registro">🗑️</button>
        `;

        if(item.es_venta_automatica) {
            botonesAuditoria = `<button class="btn-audi-sm btn-audi-lock" title="Venta de Sistema. Editar desde Pedidos" disabled>🔒 Sistema</button>`;
        }

        filas += `
            <tr style="border-bottom: 1px solid #e2e8f0; ${item.anulado ? 'opacity:0.5; background:#f8fafc;' : ''}">
                <td style="padding:15px; font-size:11px;">
                    <div style="color:#94a3b8; margin-bottom:3px;">ID: ${item.id.substring(0,8).toUpperCase()}</div>
                    <b>${new Date(item.fecha).toLocaleString()}</b>
                </td>
                <td style="padding:15px;"><span class="badge-tipo" style="${badgeStyle}">${item.tipo}</span></td>
                <td style="padding:15px; font-size:12px;"><b>${item.categoria}</b><br><span style="color:#64748b;">${item.descripcion || '-'}</span></td>
                <td style="padding:15px; font-size:12px; font-weight:bold;">${item.creado_por || 'SISTEMA'}</td>
                <td style="padding:15px; font-size:12px;">${item.metodo_pago || '-'}</td>
                <td style="padding:15px; text-align:right; font-weight:bold; color:${colorMonto}; ${item.anulado ? 'text-decoration:line-through;' : ''}">${signo} $${Number(item.monto).toLocaleString('es-CO')}</td>
                <td style="padding:15px; text-align:center;">
                    ${item.soporte_url ? `<a href="${item.soporte_url}" target="_blank" style="color:var(--color-primario); text-decoration:none; font-weight:bold;">📄</a>` : '-'}
                </td>
                <td style="padding:15px; text-align:center; min-width:90px;">
                    ${botonesAuditoria}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = filas;

    document.getElementById('kpi-audi-ing').innerText = `$${ing.toLocaleString('es-CO')}`;
    document.getElementById('kpi-audi-egr').innerText = `$${egr.toLocaleString('es-CO')}`;
    document.getElementById('kpi-audi-neto').innerText = `$${(ing - egr).toLocaleString('es-CO')}`;
}

// ==========================================
// MODAL: EDICIÓN DE REGISTRO (MODO DIOS)
// ==========================================
window.abrirModalEdicionAuditoria = function(item) {
    if(item.es_venta_automatica) return; // Validación extra de seguridad

    const modalHtml = `
        <div class="modal-overlay" id="modal-audi-edit">
            <div class="modal-content" style="max-width:500px; padding:0; border-radius:8px; overflow:hidden;">
                <div style="background:#334155; color:white; padding:15px 25px; display:flex; justify-content:space-between;">
                    <h3 style="margin:0; font-size:16px;">⚠️ Edición de Auditoría</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; color:white; cursor:pointer; font-size:20px;">&times;</button>
                </div>
                <form id="form-audi-edit" style="padding:25px; background:white;">
                    <input type="hidden" name="id" value="${item.id}">
                    <p style="font-size:11px; color:#ef4444; margin-top:0; margin-bottom:15px; font-weight:bold;">MODIFICAR ESTE REGISTRO ALTERARÁ LOS BALANCES CONTABLES.</p>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                        <div>
                            <label class="label-audi">Tipo</label>
                            <select name="tipo" class="input-audi" required>
                                <option value="INGRESO" ${item.tipo === 'INGRESO' ? 'selected' : ''}>INGRESO</option>
                                <option value="EGRESO" ${item.tipo === 'EGRESO' ? 'selected' : ''}>EGRESO</option>
                                <option value="TRASLADO" ${item.tipo === 'TRASLADO' ? 'selected' : ''}>TRASLADO</option>
                            </select>
                        </div>
                        <div>
                            <label class="label-audi">Monto ($)</label>
                            <input type="number" name="monto" value="${item.monto}" required class="input-audi" style="font-weight:bold;">
                        </div>
                    </div>

                    <label class="label-audi">Tercero / Origen</label>
                    <input type="text" name="creado_por" value="${item.creado_por || ''}" required class="input-audi" style="margin-bottom:15px;">

                    <label class="label-audi">Categoría / PUC</label>
                    <input type="text" name="categoria" value="${item.categoria || ''}" required class="input-audi" style="margin-bottom:15px;">

                    <label class="label-audi">Descripción</label>
                    <input type="text" name="descripcion" value="${item.descripcion || ''}" required class="input-audi" style="margin-bottom:15px;">

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                        <div>
                            <label class="label-audi">Método de Pago</label>
                            <input type="text" name="metodo_pago" value="${item.metodo_pago || ''}" required class="input-audi">
                        </div>
                        <div>
                            <label class="label-audi">Fecha (Auditoría)</label>
                            <input type="datetime-local" name="fecha" value="${item.fecha ? item.fecha.substring(0, 16) : ''}" required class="input-audi">
                        </div>
                    </div>

                    <button type="submit" class="btn-primario" id="btn-save-audi" style="width:100%; padding:15px; background:#334155; border:none;">Forzar Guardado</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-audi-edit').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-audi'); btn.innerText = "Guardando..."; btn.disabled = true;
        const fd = new FormData(e.target);
        
        const payload = {
            tipo: fd.get('tipo'),
            monto: Number(fd.get('monto')),
            creado_por: fd.get('creado_por'),
            categoria: fd.get('categoria'),
            descripcion: fd.get('descripcion'),
            metodo_pago: fd.get('metodo_pago'),
            fecha: new Date(fd.get('fecha')).toISOString()
        };

        try {
            const { error } = await window.supabase.from('finanzas').update(payload).eq('id', fd.get('id'));
            if (error) throw error;
            
            if(typeof window.mostrarToast === 'function') window.mostrarToast("Registro financiero actualizado", "exito");
            document.getElementById('modal-audi-edit').remove();
            cargarFinanzasAuditoria(); 
        } catch (err) {
            alert("Error al actualizar: " + err.message);
            btn.innerText = "Forzar Guardado"; btn.disabled = false;
        }
    };
};

// ==========================================
// ELIMINACIÓN DE REGISTRO (MODO DIOS)
// ==========================================
window.eliminarRegistroFinanciero = async function(id) {
    if(confirm(`🚨 ADVERTENCIA DE AUDITORÍA 🚨\n\nEstás a punto de ELIMINAR permanentemente un registro financiero de la base de datos.\nEsto alterará irreversiblemente los balances de caja y P&G.\n\n¿Estás absolutamente seguro de continuar?`)) {
        try {
            const { error } = await window.supabase.from('finanzas').delete().eq('id', id);
            if (error) throw error;
            
            if(typeof window.mostrarToast === 'function') window.mostrarToast("Registro eliminado correctamente", "exito");
            cargarFinanzasAuditoria();
        } catch (err) {
            alert("Error al eliminar el registro: " + err.message);
        }
    }
};