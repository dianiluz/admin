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
    .panel-resumen { background: #1e293b; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
    .p-valor { font-size: 18px; font-weight: bold; color: #db137a; }
    .search-box { display: flex; gap: 8px; width: 100%; max-width: 500px; }
    .inv-search { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 14px; }
    
    table { width: 100%; border-collapse: collapse; }
    .row-master { background: white; border-bottom: 2px solid #f1f5f9; cursor: pointer; }
    .row-color { background: #f9fafb; display: none; border-bottom: 1px solid #e2e8f0; }
    .badge-stock { padding: 4px 10px; border-radius: 20px; font-weight: bold; color: white; font-size: 11px; }
    
    .critico { border-left: 5px solid #ef4444 !important; }
    .alerta { border-left: 5px solid #f59e0b !important; }

    @media (max-width: 768px) {
        thead { display: none; }
        tr.row-master, tr.row-color { 
            display: flex; flex-direction: column; padding: 15px; margin-bottom: 12px;
            border: 1px solid #e2e8f0; border-radius: 12px; position: relative; background: white;
        }
        td { display: flex; justify-content: space-between; align-items: center; padding: 8px 0 !important; border: none !important; width: 100% !important; }
        td::before { content: attr(data-label); font-weight: 700; color: #94a3b8; font-size: 10px; text-transform: uppercase; min-width: 100px; }
        td:nth-child(2) { border-bottom: 1px solid #f1f5f9 !important; margin-bottom: 10px; padding-bottom: 12px !important; justify-content: flex-start !important; gap: 12px; }
        td:nth-child(2)::before { content: ""; }
        td:nth-child(1) { position: absolute; top: 15px; right: 15px; width: auto !important; }
        td:nth-child(1)::before { content: ""; }
        .row-color { margin-left: 10px; width: calc(100% - 10px); background: #fcfcfc; border-style: dashed; }
    }

    .img-preview-thumb { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; background: #f1f5f9; border: 1px solid #e2e8f0; cursor: zoom-in; }
    .full-img-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: none; align-items: center; justify-content: center; }
</style>

        <div id="full-img-viewer" class="full-img-overlay" onclick="this.style.display='none'">
            <img id="img-zoom" src="">
        </div>

        <div class="inv-header">
            <div>
                <h2 style="font-family:'Bree Serif'; color:var(--color-primario); margin:0;">📦 Bodega Maestro Cupissa</h2>
            </div>
            <div style="display:flex; gap:10px; width:100%;">
                <input type="text" id="inv-buscador" class="inv-search" placeholder="🔍 Buscar producto..." onkeyup="filtrarInventario()">
                <button class="btn-pdf" onclick="exportarPDF()" style="background:#e11d48; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer;">📄</button>
                <button class="btn-primario" onclick="abrirModalInsumo()">+ Nuevo</button>
            </div>
        </div>

        <div class="panel-resumen">
            <div><small>PRODUCTOS</small><div id="total-unicos" class="p-valor">0</div></div>
            <div><small>STOCK TOTAL</small><div id="total-stock" class="p-valor">0</div></div>
            <div><small>VALORIZACIÓN</small><div id="total-dinero" class="p-valor">$0</div></div>
            <div><small>ALERTAS</small><div id="total-alertas" style="color:#ef4444; font-weight:bold;">0</div></div>
        </div>

        <button id="btn-delete-mass" style="background:#ef4444; color:white; padding:12px; border:none; border-radius:10px; margin-bottom:15px; cursor:pointer; display:none; width:100%; font-weight:bold;" onclick="eliminarSeleccionados()">
            🗑️ Eliminar (<span id="count-sel">0</span>) seleccionados
        </button>

        <div class="card" style="padding:0; overflow:hidden; border-radius:12px; border:1px solid #e2e8f0;">
            <table id="tabla-maestra">
                <thead style="background:#f1f5f9;">
                    <tr>
                        <th style="padding:15px; width:30px;"><input type="checkbox" onclick="seleccionarTodo(this)"></th>
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
// 2. LÓGICA DE DATOS
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
        if (!grupos[nombre]) grupos[nombre] = { items: [], stock: 0, valor: 0, cat: item.categoria };
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
            <td data-label="Selección"><input type="checkbox" class="chk-item chk-group" data-ids='${JSON.stringify(g.items.map(i => i.id))}' onchange="gestionarBtnMass()"></td>
            <td onclick="toggleDetalle('${idG}')">
                <img src="${g.items[0].foto_url || ''}" class="img-preview-thumb" onerror="this.src='https://cdn-icons-png.flaticon.com/512/685/685655.png'" onclick="event.stopPropagation(); zoomImg(this.src)">
                <div><b style="font-size:14px;">${nombre}</b><br><small style="color:#db137a; font-weight:bold;">▼ ${g.items.length} VARIANTES</small></div>
            </td>
            <td data-label="Categoría">${g.cat}</td>
            <td data-label="Stock Total"><span class="badge-stock" style="background:${st <= 2 ? '#ef4444' : '#10b981'};">${st} Unidades</span></td>
            <td data-label="Inversión">$${g.valor.toLocaleString()}</td>
            <td data-label="Acciones" style="text-align:right;"><button class="btn-accion-sm" onclick="toggleDetalle('${idG}')">Detalles</button></td>
        `;
        tbody.appendChild(master);

        g.items.forEach(cItem => {
            const rowC = document.createElement('tr');
            rowC.className = `row-color row-det-${idG}`;
            rowC.innerHTML = `
                <td data-label="Selección"><input type="checkbox" class="chk-item chk-single" value="${cItem.id}" onchange="gestionarBtnMass()"></td>
                <td data-label="Color">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${cItem.foto_url || ''}" class="img-preview-thumb" style="width:35px; height:35px;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/685/685655.png'" onclick="event.stopPropagation(); zoomImg(this.src)">
                        <span>🎨 ${cItem.color} <br><small>(${cItem.referencia || 'S/R'})</small></span>
                    </div>
                </td>
                <td data-label="Unidad">${cItem.unidad_medida}</td>
                <td data-label="Stock">${cItem.cantidad_actual}</td>
                <td data-label="Inversión">$${(cItem.cantidad_actual * cItem.costo_promedio).toLocaleString()}</td>
                <td data-label="Acciones" style="text-align:right;">
                    <div style="display:flex; gap:8px; justify-content:flex-end;">
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
// 3. MODAL Y EDICIÓN DE IMAGEN
// ==========================================
window.abrirModalInsumo = function(item = null) {
    const esEdit = item !== null;
    const modalHtml = `
        <div class="modal-overlay" id="modal-insumo">
            <div class="modal-content" style="max-width:450px; border-radius:15px; padding:0; overflow:hidden;">
                <div style="background:var(--color-primario); color:white; padding:15px; display:flex; justify-content:space-between;">
                    <h3 style="margin:0;">${esEdit ? 'Editar Variante' : 'Nuevo Registro'}</h3>
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
                    <button type="button" class="inv-search" onclick="document.getElementById('f-cam-color').click()" style="margin-bottom:10px;">📷 Reemplazar/Tomar Foto</button>
                    <input type="file" id="f-cam-color" accept="image/*" capture="environment" style="display:none;" onchange="previewImg(this)">
                    <div id="prev-color" style="text-align:center; margin-bottom:10px;">
                        ${esEdit && item.foto_url ? `<img src="${item.foto_url}" style="width:60px; border-radius:8px;" onerror="this.style.display='none'">` : ''}
                    </div>
                    <button type="submit" class="btn-primario" style="width:100%; padding:15px; border-radius:10px;">GUARDAR CAMBIOS</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-insumo').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const nom = fd.get('nombre').trim().toUpperCase();
        const col = fd.get('color').trim().toUpperCase();
        
        // Actualizar ruta de imagen basándose en los nuevos datos
        const gitPath = `assets/inventario/${nom.replace(/\s+/g, '_')}/${col.replace(/\s+/g, '_')}.jpg`;

        let payload = {
            nombre: nom, color: col, categoria: fd.get('categoria'), unidad_medida: fd.get('unidad'),
            cantidad_actual: Number(fd.get('cantidad')), costo_promedio: Number(fd.get('costo')),
            stock_minimo: 2, ultima_actualizacion: new Date().toISOString(), foto_url: gitPath
        };

        if (esEdit) {
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
// 4. UTILIDADES
// ==========================================
window.gestionarBtnMass = () => {
    const n = document.querySelectorAll('.chk-item:checked').length;
    document.getElementById('btn-delete-mass').style.display = n > 0 ? 'block' : 'none';
    document.getElementById('count-sel').innerText = n;
};

window.eliminarSeleccionados = async () => {
    const checks = document.querySelectorAll('.chk-item:checked');
    let ids = [];
    checks.forEach(c => {
        if(c.classList.contains('chk-group')) ids = ids.concat(JSON.parse(c.dataset.ids));
        else ids.push(c.value);
    });
    if(confirm(`¿Borrar permanentemente ${[...new Set(ids)].length} registros?`)) { 
        await window.supabase.from('inventario_insumos').delete().in('id', ids); 
        cargarDatosInventario(); 
    }
};

window.zoomImg = (url) => { 
    if(!url || url.includes('flaticon')) return;
    document.getElementById('img-zoom').src = url;
    document.getElementById('full-img-viewer').style.display = 'flex'; 
};

window.toggleDetalle = (id) => { 
    const filas = document.querySelectorAll(`.row-det-${id}`);
    filas.forEach(r => {
        r.style.display = (r.style.display === 'flex' || r.style.display === 'table-row') ? 'none' : (window.innerWidth <= 768 ? 'flex' : 'table-row');
    });
};

window.filtrarInventario = () => {
    const q = document.getElementById('inv-buscador').value.toUpperCase();
    const f = window.inventarioGlobal.filter(i => i.nombre.includes(q) || i.color.includes(q) || i.referencia?.includes(q));
    actualizarInterfaz(f);
};

window.previewImg = (input) => {
    if (input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('prev-color').innerHTML = `<img src="${e.target.result}" style="width:60px; border-radius:8px;">`;
        reader.readAsDataURL(input.files[0]);
    }
};

window.seleccionarTodo = (src) => { document.querySelectorAll('.chk-item').forEach(c => c.checked = src.checked); gestionarBtnMass(); };
window.eliminarUno = async (id, nombre) => { if(confirm(`¿Borrar ${nombre}?`)) { await window.supabase.from('inventario_insumos').delete().eq('id', id); cargarDatosInventario(); } };

window.exportarPDF = function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const colorPrimario = [219, 19, 122];
        doc.setFontSize(20);
        doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
        doc.text("CUPISSA - REPORTE DE BODEGA", 40, 50);
        const filas = window.inventarioGlobal.map(i => [i.referencia || 'S/R', i.nombre.toUpperCase(), (i.color || 'ÚNICO').toUpperCase(), i.categoria, i.cantidad_actual, `$${Number(i.costo_promedio).toLocaleString()}`, `$${(i.cantidad_actual * i.costo_promedio).toLocaleString()}`]);
        doc.autoTable({ head: [['REF', 'PRODUCTO', 'COLOR', 'CAT', 'STOCK', 'COSTO', 'TOTAL']], body: filas, startY: 80, theme: 'grid', headStyles: { fillColor: colorPrimario } });
        doc.save(`Inventario_Cupissa_${Date.now()}.pdf`);
    } catch (e) { alert("Error al generar PDF."); }
};