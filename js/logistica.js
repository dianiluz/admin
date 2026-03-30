// js/logistica.js

window.logisticaGlobal = [];
window.clientesLogistica = [];

window.renderLogistica = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    const estilosLogistica = `
        <style>
            .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
            .log-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .log-kpi { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; }
            .log-kpi-titulo { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .log-kpi-valor { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
            
            .log-filtros { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-end; }
            .input-log { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
            .input-log:focus { border-color: #db137a; }
            .label-log { display: block; font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
            
            .btn-log-sm { padding: 6px 10px; font-size: 11px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; transition: 0.2s; }
            .btn-log-update { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
            .btn-log-update:hover { background: #bae6fd; }
            
            .guia-input { width: 100px; padding: 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; }
            .transp-input { width: 100px; padding: 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; }
        </style>
    `;

    dynamicContent.innerHTML = estilosLogistica + `
        <div class="log-header">
            <div>
                <h2 style="margin:0; font-family:'Bree Serif'; color:var(--color-primario);">🚚 Logística y Despachos</h2>
                <p style="margin:5px 0 0 0; color:#64748b; font-size:13px;">Control de envíos, asignación de guías y manifiestos de ruta.</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-secundario" onclick="cargarDatosLogistica()">🔄 Recargar</button>
                <button class="btn-primario" onclick="generarManifiestoDespacho()">📄 Manifiesto PDF del Día</button>
            </div>
        </div>

        <div class="log-kpi-grid">
            <div class="log-kpi" style="border-left-color: #f59e0b;">
                <div class="log-kpi-titulo">Listos para Enviar (Est: 3)</div>
                <div class="log-kpi-valor" id="kpi-log-listos">0</div>
            </div>
            <div class="log-kpi" style="border-left-color: #0ea5e9;">
                <div class="log-kpi-titulo">En Camino (Est: 4)</div>
                <div class="log-kpi-valor" id="kpi-log-camino">0</div>
            </div>
            <div class="log-kpi" style="border-left-color: #10b981;">
                <div class="log-kpi-titulo">Entregados (Últimos 7 días)</div>
                <div class="log-kpi-valor" id="kpi-log-entregados">0</div>
            </div>
        </div>

        <div class="log-filtros">
            <div style="flex: 1; min-width: 150px;">
                <label class="label-log">Filtrar Estado</label>
                <select id="filtro-estado-log" class="input-log" onchange="aplicarFiltrosLogistica()">
                    <option value="3,4">Activos (Listos y En Camino)</option>
                    <option value="3">Solo Listos para Enviar (3)</option>
                    <option value="4">Solo En Camino (4)</option>
                    <option value="5">Entregados Recientemente (5)</option>
                </select>
            </div>
            <div style="flex: 2; min-width: 200px;">
                <label class="label-log">Buscar (ID Pedido, Cliente, Ciudad)</label>
                <input type="text" id="filtro-texto-log" class="input-log" placeholder="Buscar destino..." oninput="aplicarFiltrosLogistica()">
            </div>
        </div>

        <div class="card" style="overflow-x:auto; padding:0;">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:900px;">
                <thead style="background:#f8fafc;">
                    <tr>
                        <th style="padding:15px;">Pedido / Fecha</th>
                        <th style="padding:15px;">Cliente y Destino</th>
                        <th style="padding:15px;">Transportadora</th>
                        <th style="padding:15px;">N° de Guía</th>
                        <th style="padding:15px;">Estado</th>
                        <th style="padding:15px; text-align:center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="tabla-logistica">
                    <tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">⏳ Cargando rutas de despacho...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    cargarDatosLogistica();
};

// ==========================================
// CARGAR DATOS
// ==========================================
async function cargarDatosLogistica() {
    try {
        // Traemos pedidos en estados logísticos (3, 4, y 5)
        const [resPedidos, resClientes] = await Promise.all([
            window.supabase.from('pedidos').select('*').in('estado', [3, 4, 5]).order('fecha_entrega_estimada', { ascending: true }),
            window.supabase.from('clientes').select('*')
        ]);

        if (resPedidos.error) throw resPedidos.error;
        
        window.logisticaGlobal = resPedidos.data || [];
        window.clientesLogistica = resClientes.data || [];
        
        actualizarKpisLogistica();
        aplicarFiltrosLogistica();
        
    } catch (err) {
        document.getElementById('tabla-logistica').innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:30px;">Error: ${err.message}</td></tr>`;
    }
}

function actualizarKpisLogistica() {
    const listos = window.logisticaGlobal.filter(p => String(p.estado) === '3').length;
    const camino = window.logisticaGlobal.filter(p => String(p.estado) === '4').length;
    const entregados = window.logisticaGlobal.filter(p => String(p.estado) === '5').length;

    document.getElementById('kpi-log-listos').innerText = listos;
    document.getElementById('kpi-log-camino').innerText = camino;
    document.getElementById('kpi-log-entregados').innerText = entregados;
}

// ==========================================
// RENDER Y FILTROS
// ==========================================
window.aplicarFiltrosLogistica = function() {
    const filtroEstado = document.getElementById('filtro-estado-log').value.split(',');
    const texto = document.getElementById('filtro-texto-log').value.toLowerCase();

    let filtrados = window.logisticaGlobal.filter(p => {
        const cli = window.clientesLogistica.find(c => c.id_cliente === p.id_cliente) || {};
        const destino = `${cli.direccion || ''} ${cli.barrio || ''} ${cli.ciudad || ''} ${cli.departamento || ''}`.toLowerCase();
        
        const pasaEstado = filtroEstado.includes(String(p.estado));
        const pasaTexto = texto === "" || 
            String(p.id_pedido).toLowerCase().includes(texto) ||
            (cli.nombre && cli.nombre.toLowerCase().includes(texto)) ||
            destino.includes(texto);

        return pasaEstado && pasaTexto;
    });

    renderTablaLogistica(filtrados);
};

function renderTablaLogistica(datos) {
    const tbody = document.getElementById('tabla-logistica');
    
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No hay despachos pendientes con estos filtros.</td></tr>';
        return;
    }

    let filas = '';
    datos.forEach(p => {
        const cli = window.clientesLogistica.find(c => c.id_cliente === p.id_cliente) || {};
        const destinoStr = `${cli.direccion || p.direccion_envio || 'Sin dirección'}, ${cli.barrio || ''} - ${cli.ciudad || ''}`;
        const fechaEst = p.fecha_entrega_estimada ? new Date(p.fecha_entrega_estimada).toLocaleDateString() : 'Por definir';
        
        let badgeEstado = '';
        if(String(p.estado) === '3') badgeEstado = '<span class="semaforo-estado estado-3">3 - Listo</span>';
        if(String(p.estado) === '4') badgeEstado = '<span class="semaforo-estado estado-4">4 - En Camino</span>';
        if(String(p.estado) === '5') badgeEstado = '<span class="semaforo-estado estado-5">5 - Entregado</span>';

        filas += `
            <tr style="border-bottom: 1px solid #e2e8f0;" id="row-log-${p.id_pedido}">
                <td style="padding:15px; font-size:12px;">
                    <strong style="color:var(--color-primario);">${p.id_pedido}</strong><br>
                    <small style="color:#64748b;">Est: ${fechaEst}</small>
                </td>
                <td style="padding:15px; font-size:12px;">
                    <strong>${cli.nombre || 'Cliente Final'}</strong><br>
                    <span style="color:#475569;">${destinoStr}</span><br>
                    <small>📞 ${p.telefono_envio || cli.telefono || ''}</small>
                </td>
                <td style="padding:15px;">
                    <input type="text" class="transp-input" id="transp-${p.id_pedido}" value="${p.transportadora || ''}" placeholder="Ej. Interrapidisimo">
                </td>
                <td style="padding:15px;">
                    <input type="text" class="guia-input" id="guia-${p.id_pedido}" value="${p.guia || ''}" placeholder="N° Guía">
                </td>
                <td style="padding:15px;">
                    <select class="input-log" id="est-${p.id_pedido}" style="width:110px; padding:4px;">
                        <option value="3" ${String(p.estado) === '3' ? 'selected' : ''}>3 - Listo</option>
                        <option value="4" ${String(p.estado) === '4' ? 'selected' : ''}>4 - En Camino</option>
                        <option value="5" ${String(p.estado) === '5' ? 'selected' : ''}>5 - Entregado</option>
                    </select>
                </td>
                <td style="padding:15px; text-align:center;">
                    <button class="btn-log-sm btn-log-update" onclick="guardarCambiosRuta('${p.id_pedido}')">💾 Guardar</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = filas;
}

// ==========================================
// ACTUALIZAR GUÍA Y ESTADO
// ==========================================
window.guardarCambiosRuta = async function(idPedido) {
    const transp = document.getElementById(`transp-${idPedido}`).value.trim();
    const guia = document.getElementById(`guia-${idPedido}`).value.trim();
    const estado = document.getElementById(`est-${idPedido}`).value;

    try {
        const payload = {
            transportadora: transp,
            guia: guia || null,
            estado: parseInt(estado)
        };

        if(estado === '5') {
            payload.fecha_entrega_real = new Date().toISOString();
        }

        const { error } = await window.supabase.from('pedidos').update(payload).eq('id_pedido', idPedido);
        if (error) throw error;

        window.mostrarToast("Datos de envío actualizados", "exito");
        
        // Actualizar localmente para no recargar todo si no es necesario
        const pedIdx = window.logisticaGlobal.findIndex(p => p.id_pedido === idPedido);
        if(pedIdx > -1) {
            window.logisticaGlobal[pedIdx].transportadora = transp;
            window.logisticaGlobal[pedIdx].guia = guia;
            window.logisticaGlobal[pedIdx].estado = estado;
        }
        actualizarKpisLogistica();

    } catch (err) {
        window.mostrarToast("Error: " + err.message, "error");
    }
};

// ==========================================
// MANIFIESTO PDF
// ==========================================
window.generarManifiestoDespacho = function() {
    if (!window.jspdf) return window.mostrarToast("Librería PDF no cargada", "error");
    
    // Filtrar solo los que están "Listos (3)" o "En Camino (4)"
    const despachosActivos = window.logisticaGlobal.filter(p => String(p.estado) === '3' || String(p.estado) === '4');
    
    if(despachosActivos.length === 0) {
        return window.mostrarToast("No hay pedidos activos para despachar.", "error");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal para que quepa bien
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(219, 19, 122);
    doc.text("CUPISSA - MANIFIESTO DE DESPACHO Y RUTAS", 14, 20);
    
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-CO')}`, 14, 27);
    doc.text(`Total Paquetes: ${despachosActivos.length}`, 14, 32);
    
    doc.setDrawColor(219, 19, 122); doc.setLineWidth(0.5); doc.line(14, 35, 280, 35);

    const headers = [["ID Pedido", "Cliente", "Teléfono", "Ciudad / Dirección", "Transportadora", "Firma Recibido"]];
    const data = despachosActivos.map(p => {
        const cli = window.clientesLogistica.find(c => c.id_cliente === p.id_cliente) || {};
        const direccionFull = `${cli.direccion || ''}, ${cli.barrio || ''} - ${cli.ciudad || ''}`;
        return [
            p.id_pedido,
            cli.nombre || 'N/A',
            p.telefono_envio || cli.telefono || '',
            direccionFull,
            p.transportadora || 'MENSAJERÍA LOCAL',
            "" // Espacio en blanco para la firma física del mensajero
        ];
    });

    if (doc.autoTable) {
        doc.autoTable({
            startY: 40,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold' },
                1: { cellWidth: 45 },
                2: { cellWidth: 30 },
                3: { cellWidth: 70 },
                4: { cellWidth: 40 },
                5: { cellWidth: 40 }
            }
        });
    }

    doc.save(`Manifiesto_Rutas_CUPISSA_${Date.now()}.pdf`);
    window.mostrarToast("Manifiesto PDF Generado", "exito");
};