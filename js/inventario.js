// js/inventario.js
window.inventarioGlobal = [];
window.parametrosInv = { categorias: [], unidades: [] };
let imgBase64Procesada = ""; 

// ==========================================
// 1. INTERFAZ Y ESTILOS (DISEÑO BLINDADO)
// ==========================================
window.renderInventario = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
<style>
    .inv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
    .panel-resumen { background: #1e293b; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
    .p-valor { font-size: 18px; font-weight: bold; color: #db137a; }
    .inv-search { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 14px; }
    
    .card-inv { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 15px; overflow: hidden; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    
    /* CUADRÍCULA DE COLORES */
    .color-grid-box { display: none; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 15px; width: 100%; box-sizing: border-box; }
    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 10px; }
    .color-item { background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px; text-align: center; cursor: pointer; position: relative; }
    .color-item img { width: 100%; height: 60px; object-fit: cover; border-radius: 6px; }
    .mini-qty { position: absolute; top: -5px; right: -5px; background: #db137a; color: white; font-size: 10px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; font-weight: bold; }

    /* ESTILOS DE TARJETA MÓVIL */
    .master-info { padding: 15px; cursor: pointer; }
    .master-header { display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
    .master-body { display: grid; gap: 8px; }
    .data-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .data-label { font-weight: 700; color: #94a3b8; font-size: 10px; text-transform: uppercase; }

    .img-thumb { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; background: #f1f5f9; border: 1px solid #ddd; }
    .full-img-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: none; align-items: center; justify-content: center; }
    
    .btn-mass-delete { background:#ef4444; color:white; padding:12px; border:none; border-radius:10px; margin-bottom:15px; cursor:pointer; display:none; width:100%; font-weight:bold; }
</style>

    <div id="full-img-viewer" class="full-img-overlay" onclick="this.style.display='none'"><img id="img-zoom" src="" style="max-width:90%; border-radius:10px;"></div>

    <div class="inv-header">
        <h2 style="font-family:'Bree Serif'; color:var(--color-primario); margin:0;">📦 Bodega Cupissa Maestro</h2>
        <div style="display:flex; gap:10px; width:100%;">
            <input type="text" id="inv-buscador" class="inv-search" placeholder="🔍 Buscar producto..." onkeyup="filtrarInventario()">
            <button class="btn-pdf" onclick="exportarPDF()" style="background:#e11d48; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer; font-weight:bold;">📄 PDF</button>
            <button class="btn-primario" onclick="abrirModalInsumo()">+ Nuevo</button>
        </div>
    </div>

    <div class="panel-resumen" id="resumen-container"></div>

    <button id="btn-delete-mass" class="btn-mass-delete" onclick="eliminarSeleccionados()">
        🗑️ Eliminar seleccionados (<span id="count-sel">0</span>)
    </button>

    <div id="lista-inventario"></div>
    `;
    cargarDatosInventario();
};

// ==========================================
// 2. LÓGICA DE DATOS
// ==========================================
async function cargarDatosInventario() {
    const { data, error } = await window.supabase.from('inventario_insumos').select('*').order('nombre');
    if (error) return;
    window.inventarioGlobal = data || [];
    actualizarInterfaz(window.inventarioGlobal);
}

function actualizarInterfaz(datos) {
    const container = document.getElementById('lista-inventario');
    const resumen = document.getElementById('resumen-container');
    container.innerHTML = '';
    const grupos = {};
    let tStock = 0, tDinero = 0, tAlertas = 0;

    datos.forEach(item => {
        const n = item.nombre.toUpperCase();
        if (!grupos[n]) grupos[n] = { items: [], stock: 0, valor: 0, cat: item.categoria };
        grupos[n].items.push(item);
        const qty = Number(item.cantidad_actual || 0);
        grupos[n].stock += qty;
        grupos[n].valor += (qty * Number(item.costo_promedio || 0));
        tStock += qty; tDinero += (qty * Number(item.costo_promedio || 0));
        if(qty <= 2) tAlertas++;
    });

    if(resumen) resumen.innerHTML = `
        <div><small>PRODUCTOS</small><div class="p-valor">${Object.keys(grupos).length}</div></div>
        <div><small>STOCK TOTAL</small><div class="p-valor">${tStock}</div></div>
        <div><small>VALORIZACIÓN</small><div class="p-valor">$${tDinero.toLocaleString()}</div></div>
        <div><small>ALERTAS</small><div style="color:#ef4444; font-weight:bold; font-size:18px;">${tAlertas}</div></div>
    `;

    Object.keys(grupos).forEach(nombre => {
        const g = grupos[nombre];
        const idG = nombre.replace(/\s+/g, '_');
        const card = document.createElement('div');
        card.className = 'card-inv';
        card.innerHTML = `
            <div class="master-info" onclick="toggleGrid('${idG}')">
                <input type="checkbox" class="chk-item chk-group" onclick="event.stopPropagation()" onchange="gestionarBtnMass()" style="position:absolute; top:15px; right:15px; width:20px; height:20px;" data-ids='${JSON.stringify(g.items.map(i => i.id))}'>
                <div class="master-header">
                    <img src="${g.items[0].foto_url || ''}" class="img-thumb" onerror="this.src='https://cdn-icons-png.flaticon.com/512/685/685655.png'" onclick="event.stopPropagation(); zoomImg(this.src)">
                    <div><b>${nombre}</b><br><small style="color:#db137a; font-weight:bold;">▼ ${g.items.length} COLORES</small></div>
                </div>
                <div class="master-body">
                    <div class="data-row"><span class="data-label">Categoría</span><span>${g.cat}</span></div>
                    <div class="data-row"><span class="data-label">Stock Total</span><b style="color:${g.stock <= 2 ? '#ef4444' : '#10b981'}">${g.stock} Units</b></div>
                    <div class="data-row"><span class="data-label">Inversión</span><b>$${g.valor.toLocaleString()}</b></div>
                </div>
            </div>
            <div class="color-grid-box" id="grid-${idG}">
                <div class="color-grid">
                    ${g.items.map(c => `
                        <div class="color-item" onclick='abrirQuickEdit(${JSON.stringify(c)})'>
                            <div class="mini-qty">${c.cantidad_actual}</div>
                            <img src="${c.foto_url}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/685/685655.png'">
                            <span>${c.color}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 3. MINI MODAL DE CONTROL (STOCK + IMAGEN)
// ==========================================
window.abrirQuickEdit = (item) => {
    imgBase64Procesada = item.foto_url;
    const modalHtml = `
        <div class="modal-overlay" id="modal-quick">
            <div class="modal-content" style="max-width:320px; text-align:center; padding:20px; border-radius:25px;">
                <input type="file" id="f-quick-cam" accept="image/*" capture="environment" style="display:none;" onchange="procesarFotoQuick(this)">
                <div style="position:relative; display:inline-block;">
                    <img id="quick-img-prev" src="${item.foto_url}" style="width:120px; height:120px; border-radius:15px; object-fit:cover; border:1px solid #eee;">
                    <button onclick="document.getElementById('f-quick-cam').click()" style="position:absolute; bottom:0; right:0; background:#1e293b; color:white; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer;">📷</button>
                </div>
                <h3 style="margin:10px 0 0 0;">${item.nombre}</h3>
                <p style="color:#64748b; margin-bottom:15px;">Color: <b>${item.color}</b></p>
                <div style="background:#f1f5f9; padding:10px; border-radius:15px; margin-bottom:15px;">
                    <small>STOCK ACTUAL</small>
                    <div style="font-size:28px; font-weight:bold; color:#db137a;" id="quick-qty">${item.cantidad_actual}</div>
                </div>
                <div style="display:flex; justify-content:center; gap:15px; margin-bottom:15px;">
                    <button onclick="updateQty('${item.id}', -1)" style="width:50px; height:50px; font-size:20px; border-radius:12px; border:none; background:#e2e8f0;">-</button>
                    <button onclick="updateQty('${item.id}', 1)" style="width:50px; height:50px; font-size:20px; border-radius:12px; border:none; background:#1e293b; color:white;">+</button>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <button onclick="guardarCambiosQuick('${item.id}')" style="padding:12px; border-radius:10px; border:none; background:#10b981; color:white; font-weight:bold;">Guardar</button>
                    <button onclick="document.getElementById('modal-quick').remove()" style="padding:12px; border-radius:10px; border:none; background:#64748b; color:white;">Cerrar</button>
                </div>
                <button onclick="eliminarUno('${item.id}', '${item.color}'); document.getElementById('modal-quick').remove();" style="color:#ef4444; background:none; border:none; font-size:11px; font-weight:bold; margin-top:15px;">🗑️ ELIMINAR COLOR</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.procesarFotoQuick = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_W = 600;
                const scale = MAX_W / img.width;
                canvas.width = MAX_W; canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                imgBase64Procesada = canvas.toDataURL('image/jpeg', 0.6);
                document.getElementById('quick-img-prev').src = imgBase64Procesada;
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.guardarCambiosQuick = async (id) => {
    const qty = document.getElementById('quick-qty').innerText;
    await window.supabase.from('inventario_insumos').update({ 
        cantidad_actual: Number(qty),
        foto_url: imgBase64Procesada 
    }).eq('id', id);
    document.getElementById('modal-quick').remove();
    cargarDatosInventario();
};

window.updateQty = (id, change) => {
    const el = document.getElementById('quick-qty');
    el.innerText = Math.max(0, Number(el.innerText) + change);
};

// ==========================================
// 4. UTILIDADES (CHECKBOXES, PDF, FILTRO)
// ==========================================
window.gestionarBtnMass = () => {
    const n = document.querySelectorAll('.chk-item:checked').length;
    document.getElementById('btn-delete-mass').style.display = n > 0 ? 'block' : 'none';
    document.getElementById('count-sel').innerText = n;
};

window.eliminarSeleccionados = async () => {
    let ids = [];
    document.querySelectorAll('.chk-item:checked').forEach(c => {
        if(c.classList.contains('chk-group')) ids = ids.concat(JSON.parse(c.dataset.ids));
        else ids.push(c.value);
    });
    if(confirm(`¿Borrar permanentemente ${[...new Set(ids)].length} registros?`)) { 
        await window.supabase.from('inventario_insumos').delete().in('id', ids); 
        cargarDatosInventario(); 
    }
};

window.exportarPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFontSize(18);
    doc.text("REPORTE BODEGA CUPISSA", 40, 50);
    const rows = window.inventarioGlobal.map(i => [i.referencia, i.nombre, i.color, i.cantidad_actual, i.costo_promedio]);
    doc.autoTable({ head: [['REF', 'PRODUCTO', 'COLOR', 'STOCK', 'COSTO']], body: rows, startY: 70 });
    doc.save("inventario_cupissa.pdf");
};

window.filtrarInventario = () => {
    const q = document.getElementById('inv-buscador').value.toUpperCase();
    const f = window.inventarioGlobal.filter(i => i.nombre.includes(q) || i.color.includes(q));
    actualizarInterfaz(f);
};

window.toggleGrid = (id) => {
    const el = document.getElementById(`grid-${id}`);
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
};

window.zoomImg = (url) => { if(url.length > 50) { document.getElementById('img-zoom').src = url; document.getElementById('full-img-viewer').style.display = 'flex'; } };
window.eliminarUno = async (id, nombre) => { if(confirm(`¿Borrar ${nombre}?`)) { await window.supabase.from('inventario_insumos').delete().eq('id', id); cargarDatosInventario(); } };

window.abrirModalInsumo = function(item = null) {
    const esEdit = item !== null;
    imgBase64Procesada = esEdit ? item.foto_url : "";
    const modalHtml = `
        <div class="modal-overlay" id="modal-insumo">
            <div class="modal-content" style="max-width:400px; padding:20px; border-radius:15px;">
                <h3 style="margin-top:0;">${esEdit ? 'Editar' : 'Nuevo'} Item</h3>
                <form id="form-insumo">
                    <input type="hidden" name="id" value="${esEdit ? item.id : ''}">
                    <input type="text" name="nombre" placeholder="Producto" required class="inv-search" value="${esEdit ? item.nombre : ''}" style="margin-bottom:10px;">
                    <input type="text" name="color" placeholder="Color" required class="inv-search" value="${esEdit ? item.color : ''}" style="margin-bottom:10px;">
                    <input type="number" name="cantidad" placeholder="Stock" required class="inv-search" value="${esEdit ? item.cantidad_actual : ''}" style="margin-bottom:10px;">
                    <input type="number" name="costo" placeholder="Costo" required class="inv-search" value="${esEdit ? item.costo_promedio : ''}" style="margin-bottom:10px;">
                    <button type="button" class="inv-search" onclick="document.getElementById('f-cam').click()" style="margin-bottom:10px;">📷 Foto</button>
                    <input type="file" id="f-cam" accept="image/*" capture="environment" style="display:none;" onchange="procesarFotoQuick(this)">
                    <div style="text-align:center;"><img id="img-render-prev" src="${imgBase64Procesada}" style="width:80px; height:80px; object-fit:cover; display:${imgBase64Procesada ? 'block' : 'none'}; border-radius:8px; margin-bottom:10px;"></div>
                    <button type="submit" class="btn-primario" style="width:100%; padding:15px;">GUARDAR</button>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('form-insumo').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            nombre: fd.get('nombre').toUpperCase(), color: fd.get('color').toUpperCase(),
            cantidad_actual: Number(fd.get('cantidad')), costo_promedio: Number(fd.get('costo')),
            foto_url: imgBase64Procesada, ultima_actualizacion: new Date().toISOString(), categoria: 'GENERAL'
        };
        if (esEdit) await window.supabase.from('inventario_insumos').update(payload).eq('id', fd.get('id'));
        else await window.supabase.from('inventario_insumos').insert([payload]);
        document.getElementById('modal-insumo').remove();
        cargarDatosInventario();
    };
};