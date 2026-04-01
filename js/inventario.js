// js/inventario.js

window.inventarioGlobal = [];
window.parametrosInv = { categorias: [], unidades: [] };

// ==========================================
// 1. INTERFAZ Y ESTILOS
// ==========================================
window.renderInventario = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    dynamicContent.innerHTML = `
        <style>
            .inv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
            .panel-resumen { background: #1e293b; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
            .p-valor { font-size: 22px; font-weight: bold; color: #db137a; }
            .search-box { position: relative; display: flex; gap: 8px; width: 100%; max-width: 500px; }
            .inv-search { width: 100%; padding: 12px 15px; border: 2px solid #e2e8f0; border-radius: 10px; outline: none; }
            .row-master { background: white; border-bottom: 2px solid #f1f5f9; cursor: pointer; }
            .row-color { background: #f8fafc; display: none; border-bottom: 1px solid #edf2f7; font-size: 13px; }
            .badge-stock { padding: 4px 10px; border-radius: 20px; font-weight: bold; color: white; font-size: 12px; }
            .critico { border-left: 5px solid #ef4444 !important; }
            .alerta { border-left: 5px solid #f59e0b !important; }
            .btn-pdf { background: #e11d48; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
            
            /* Estilos para Previsualización de Imagen */
            .img-preview-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; cursor: zoom-in; transition: 0.2s; border: 1px solid #ddd; }
            .img-preview-thumb:hover { transform: scale(1.1); }
            .full-img-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: none; align-items: center; justify-content: center; cursor: zoom-out; }
            .full-img-overlay img { max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        </style>

        <div id="full-img-viewer" class="full-img-overlay" onclick="this.style.display='none'">
            <img id="img-zoom" src="">
        </div>

        <div class="inv-header">
            <div>
                <h2 style="font-family:'Bree Serif'; color:var(--color-primario); margin:0;">📦 Bodega Cupissa Pro</h2>
                <p style="margin:5px 0 0 0; color:#64748b;">Inventario Agrupado e Imágenes a Pantalla Completa.</p>
            </div>
            <div style="display:flex; gap:10px;">
                <div class="search-box">
                    <input type="text" id="inv-buscador" class="inv-search" placeholder="Buscar..." onkeyup="filtrarInventario()">
                </div>
                <button class="btn-pdf" onclick="exportarPDF()">📄 PDF</button>
                <button class="btn-primario" onclick="abrirModalInsumo()">+ Nuevo Item</button>
            </div>
        </div>

        <div class="panel-resumen">
            <div><small>PRODUCTOS</small><div id="total-unicos" class="p-valor">0</div></div>
            <div><small>STOCK FÍSICO</small><div id="total-stock" class="p-valor">0</div></div>
            <div><small>VALORIZACIÓN</small><div id="total-dinero" class="p-valor">$0</div></div>
            <div><small>ALERTAS</small><div id="total-alertas" style="color:#ef4444; font-weight:bold; font-size:22px;">0</div></div>
        </div>

        <button id="btn-delete-mass" style="background:#ef4444; color:white; padding:10px 15px; border:none; border-radius:8px; margin-bottom:10px; cursor:pointer; display:none;" onclick="eliminarSeleccionados()">
            🗑️ Eliminar Seleccionados (<span id="count-sel">0</span>)
        </button>

        <div class="card" style="padding:0; overflow:hidden; border-radius:12px; border:1px solid #e2e8f0;">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead style="background:#f1f5f9;">
                    <tr>
                        <th style="padding:15px; width:30px;"><input type="checkbox" id="master-chk" onclick="seleccionarTodo(this)"></th>
                        <th style="padding:15px;">Producto</th>
                        <th style="padding:15px;">Categoría</th>
                        <th style="padding:15px;">Stock Total</th>
                        <th style="padding:15px;">Inversión</th>
                        <th style="padding:15px; text-align:right;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tabla-consolidada"></tbody>
            </table>
        </div>
    `;
    cargarDatosInventario();
};

// ==========================================
// 2. CARGA Y VISUALIZACIÓN
// ==========================================
async function cargarDatosInventario() {
    const [resInv, resParam] = await Promise.all([
        window.supabase.from('inventario_insumos').select('*').order('nombre', { ascending: true }),
        window.supabase.from('parametros_inventario').select('*')
    ]);

    window.inventarioGlobal = resInv.data || [];
    window.parametrosInv = { 
        categorias: resParam.data?.filter(p => p.tipo === 'CATEGORIA').map(p => p.valor) || [],
        unidades: resParam.data?.filter(p => p.tipo === 'UNIDAD').map(p => p.valor) || []
    };

    actualizarInterfaz(window.inventarioGlobal);
}

function actualizarInterfaz(datos) {
    const tbody = document.getElementById('tabla-consolidada');
    tbody.innerHTML = '';
    const grupos = {};
    let tStock = 0, tDinero = 0, tAlertas = 0;

    datos.forEach(item => {
        const nombre = item.nombre.trim().toUpperCase();
        if (!grupos[nombre]) {
            grupos[nombre] = { items: [], stock: 0, valor: 0, cat: item.categoria };
        }
        grupos[nombre].items.push(item);
        const cant = Number(item.cantidad_actual || 0);
        grupos[nombre].stock += cant;
        grupos[nombre].valor += (cant * Number(item.costo_promedio || 0));
        tStock += cant;
        tDinero += (cant * Number(item.costo_promedio || 0));
        if(cant <= 2) tAlertas++;
    });

    Object.keys(grupos).forEach(nombre => {
        const g = grupos[nombre];
        const idG = nombre.replace(/\s+/g, '_');
        const st = g.stock;
        
        const master = document.createElement('tr');
        master.className = `row-master ${st <= 0 ? 'critico' : st <= 2 ? 'alerta' : ''}`;
        master.innerHTML = `
            <td style="padding:15px;"><input type="checkbox" class="chk-item chk-group" data-ids='${JSON.stringify(g.items.map(i => i.id))}' onchange="gestionarBtnMass()"></td>
            <td style="padding:15px;" onclick="toggleDetalle('${idG}')">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${g.items[0].foto_url || 'https://via.placeholder.com/45'}" class="img-preview-thumb" onclick="event.stopPropagation(); zoomImg(this.src)">
                    <div><b>${nombre}</b><br><small style="color:#db137a;">▼ Ver ${g.items.length} Colores</small></div>
                </div>
            </td>
            <td style="padding:15px;">${g.cat}</td>
            <td style="padding:15px;"><span class="badge-stock" style="background:${st <= 2 ? '#ef4444' : '#10b981'};">${st} Unidades</span></td>
            <td style="padding:15px; font-weight:bold;">$${g.valor.toLocaleString()}</td>
            <td style="padding:15px; text-align:right;"><button class="btn-accion-sm" onclick="toggleDetalle('${idG}')">Colores</button></td>
        `;
        tbody.appendChild(master);

        g.items.forEach(cItem => {
            const rowC = document.createElement('tr');
            rowC.className = `row-color row-det-${idG}`;
            rowC.innerHTML = `
                <td style="padding:10px 40px;"><input type="checkbox" class="chk-item chk-single" value="${cItem.id}" onchange="gestionarBtnMass()"></td>
                <td style="padding:10px 15px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${cItem.foto_url || 'https://via.placeholder.com/35'}" class="img-preview-thumb" style="width:30px; height:30px;" onclick="event.stopPropagation(); zoomImg(this.src)">
                        <span>🎨 ${cItem.color} <small>(${cItem.referencia})</small></span>
                    </div>
                </td>
                <td></td>
                <td style="padding:10px 15px;">${cItem.cantidad_actual} ${cItem.unidad_medida}</td>
                <td style="padding:10px 15px;">$${(cItem.cantidad_actual * cItem.costo_promedio).toLocaleString()}</td>
                <td style="padding:10px 15px; text-align:right;">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <button class="btn-accion-sm" onclick='abrirModalInsumo(${JSON.stringify(cItem)})'>✏️</button>
                        <button class="btn-accion-sm" style="color:#ef4444;" onclick="eliminarUno('${cItem.id}', '${cItem.nombre}')">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(rowC);
        });
    });

    document.getElementById('total-unicos').innerText = Object.keys(grupos).length;
    document.getElementById('total-stock').innerText = tStock;
    document.getElementById('total-dinero').innerText = `$${tDinero.toLocaleString('es-CO')}`;
    document.getElementById('total-alertas').innerText = tAlertas;
}

// ==========================================
// 3. ELIMINACIÓN Y CONTROL
// ==========================================
window.gestionarBtnMass = function() {
    const seleccionados = document.querySelectorAll('.chk-item:checked').length;
    const btn = document.getElementById('btn-delete-mass');
    btn.style.display = seleccionados > 0 ? 'block' : 'none';
    document.getElementById('count-sel').innerText = seleccionados;
};

window.eliminarSeleccionados = async function() {
    const checks = document.querySelectorAll('.chk-item:checked');
    let idsParaBorrar = [];

    checks.forEach(c => {
        if (c.classList.contains('chk-group')) {
            // Si es un checkbox de grupo, extraemos el array de IDs
            const grupoIds = JSON.parse(c.dataset.ids);
            idsParaBorrar = idsParaBorrar.concat(grupoIds);
        } else {
            // Si es un color individual
            idsParaBorrar.push(c.value);
        }
    });

    // Limpiar duplicados por si se marcó el grupo y el hijo a la vez
    idsParaBorrar = [...new Set(idsParaBorrar)];

    if (idsParaBorrar.length === 0) return;

    if (confirm(`⚠️ ATENCIÓN: Estás a punto de eliminar ${idsParaBorrar.length} registros permanentemente. ¿Proceder?`)) {
        const { error } = await window.supabase.from('inventario_insumos').delete().in('id', idsParaBorrar);
        if (!error) {
            window.mostrarToast("Eliminación masiva completada", "exito");
            cargarDatosInventario();
            document.getElementById('btn-delete-mass').style.display = 'none';
        } else {
            alert("Error al eliminar: " + error.message);
        }
    }
};

window.zoomImg = function(url) {
    const viewer = document.getElementById('full-img-viewer');
    const img = document.getElementById('img-zoom');
    img.src = url;
    viewer.style.display = 'flex';
};

// ==========================================
// 4. MODAL Y REGISTRO (CÁMARA TRASERA ACTIVA)
// ==========================================
window.abrirModalInsumo = function(item = null) {
    const esEdit = item !== null;
    const modalHtml = `
        <div class="modal-overlay" id="modal-insumo">
            <div class="modal-content" style="max-width:450px; border-radius:15px; padding:0; overflow:hidden;">
                <div style="background:var(--color-primario); color:white; padding:15px; display:flex; justify-content:space-between;">
                    <h3 style="margin:0;">${esEdit ? 'Editar Producto' : 'Nuevo Registro'}</h3>
                    <button onclick="document.getElementById('modal-insumo').remove()" style="background:none; border:none; color:white; font-size:25px; cursor:pointer;">&times;</button>
                </div>
                <form id="form-insumo" style="padding:20px;">
                    <input type="hidden" name="id" value="${esEdit ? item.id : ''}">
                    <label style="font-size:11px; font-weight:bold;">NOMBRE DEL PRODUCTO</label>
                    <input type="text" name="nombre" required class="inv-search" value="${esEdit ? item.nombre : ''}" style="margin-bottom:10px;">
                    <label style="font-size:11px; font-weight:bold;">COLOR</label>
                    <input type="text" name="color" required class="inv-search" value="${esEdit ? item.color : ''}" style="margin-bottom:15px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                        <select name="categoria" class="inv-search">${window.parametrosInv.categorias.map(c => `<option value="${c}" ${esEdit && item.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
                        <select name="unidad" class="inv-search">${window.parametrosInv.unidades.map(u => `<option value="${u}" ${esEdit && item.unidad_medida === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                        <input type="number" name="cantidad" placeholder="Stock" required class="inv-search" value="${esEdit ? item.cantidad_actual : ''}">
                        <input type="number" name="costo" placeholder="Costo" required class="inv-search" value="${esEdit ? item.costo_promedio : ''}">
                    </div>
                    <label style="font-size:11px; font-weight:bold;">FOTO DE ESTE COLOR</label>
                    <input type="file" id="f-cam-color" accept="image/*" capture="environment" style="display:none;" onchange="previewImg(this)">
                    <button type="button" class="inv-search" onclick="document.getElementById('f-cam-color').click()">📷 Abrir Cámara</button>
                    <div id="prev-color" style="text-align:center; margin-top:10px;"></div>
                    <button type="submit" class="btn-primario" style="width:100%; padding:15px; border-radius:10px; margin-top:10px;">GUARDAR</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-insumo').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const nom = fd.get('nombre').toUpperCase();
        const col = fd.get('color').toUpperCase();
        const nStock = Number(fd.get('cantidad'));

        const payload = {
            nombre: nom, color: col,
            categoria: fd.get('categoria'), unidad_medida: fd.get('unidad'),
            cantidad_actual: nStock, costo_promedio: Number(fd.get('costo')),
            stock_minimo: 2, ultima_actualizacion: new Date().toISOString()
        };

        if (esEdit) {
            // Historial si cambia stock
            if (item.cantidad_actual != nStock) {
                await window.supabase.from('historial_stock').insert([{
                    id_item: item.id, nombre_item: `${nom} (${col})`,
                    cantidad_anterior: item.cantidad_actual, cantidad_nueva: nStock,
                    motivo: 'AJUSTE MANUAL', fecha: new Date().toISOString()
                }]);
            }
            await window.supabase.from('inventario_insumos').update(payload).eq('id', fd.get('id'));
        } else {
            const { count } = await window.supabase.from('inventario_insumos').select('*', { count: 'exact', head: true });
            payload.referencia = `INSCUP${String(count + 1).padStart(4, '0')}`;
            await window.supabase.from('inventario_insumos').insert([payload]);
        }
        document.getElementById('modal-insumo').remove();
        cargarDatosInventario();
    };
};

// ==========================================
// 5. UTILIDADES
// ==========================================
window.filtrarInventario = () => {
    const q = document.getElementById('inv-buscador').value.toUpperCase();
    const f = window.inventarioGlobal.filter(i => i.nombre.includes(q) || i.color.includes(q) || i.referencia?.includes(q));
    actualizarInterfaz(f);
};
window.toggleDetalle = (id) => { document.querySelectorAll(`.row-det-${id}`).forEach(r => r.style.display = r.style.display === 'table-row' ? 'none' : 'table-row'); };
window.seleccionarTodo = (src) => { 
    document.querySelectorAll('.chk-item').forEach(c => c.checked = src.checked); 
    gestionarBtnMass(); 
};
window.eliminarUno = async (id, nombre) => {
    if(confirm(`¿Borrar ${nombre}?`)) { await window.supabase.from('inventario_insumos').delete().eq('id', id); cargarDatosInventario(); }
};
window.previewImg = (input) => {
    if (input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('prev-color').innerHTML = `<img src="${e.target.result}" style="width:60px; border-radius:8px;">`;
        reader.readAsDataURL(input.files[0]);
    }
};