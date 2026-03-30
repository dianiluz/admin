// js/inventario.js

window.inventarioGlobal = [];
window.parametrosInv = { categorias: [], unidades: [] };

window.renderInventario = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    const estilosInventario = `
        <style>
            .inv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
            .inv-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .inv-kpi-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #db137a; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .inv-kpi-titulo { font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .inv-kpi-valor { font-size: 24px; font-weight: bold; color: #334155; }
            .inv-search { padding: 10px 15px; border: 1px solid #cbd5e1; border-radius: 6px; width: 100%; max-width: 300px; outline: none; }
            .inv-search:focus { border-color: #db137a; }
            .btn-accion-sm { padding: 4px 8px; font-size: 11px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
            .btn-edit { background: #f1f5f9; color: #334155; }
            .btn-edit:hover { background: #e2e8f0; }
            .btn-ajuste { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
            .btn-ajuste:hover { background: #dcfce7; }
            .btn-del { background: #fef2f2; color: #b91c1c; }
            .btn-del:hover { background: #fee2e2; }
            .badge-cat { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            
            .input-group { display: flex; gap: 5px; }
            .btn-add-param { background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; cursor: pointer; font-weight: bold; color: #334155; transition: 0.2s; }
            .btn-add-param:hover { background: #db137a; color: white; border-color: #db137a; }
        </style>
    `;

    dynamicContent.innerHTML = estilosInventario + `
        <div class="inv-header">
            <div>
                <h2 style="margin:0; font-family:'Bree Serif'; color:var(--color-primario);">📦 Bodega e Inventario Maestro</h2>
                <p style="margin:5px 0 0 0; color:#64748b; font-size:13px;">Auditoría y control de insumos, telas y productos base.</p>
            </div>
            <div style="display:flex; gap:10px;">
                <input type="text" id="inv-buscador" class="inv-search" placeholder="🔍 Buscar insumo o categoría..." oninput="filtrarInventario()">
                <button class="btn-primario" onclick="abrirModalInsumo()">+ Nuevo Insumo</button>
            </div>
        </div>

        <div class="inv-kpi-grid">
            <div class="inv-kpi-card" style="border-left-color: #0ea5e9;">
                <div class="inv-kpi-titulo">Total Items Registrados</div>
                <div class="inv-kpi-valor" id="kpi-items">0</div>
            </div>
            <div class="inv-kpi-card" style="border-left-color: #10b981;">
                <div class="inv-kpi-titulo">Valorización de Bodega</div>
                <div class="inv-kpi-valor" id="kpi-valor">$0</div>
            </div>
            <div class="inv-kpi-card" style="border-left-color: #f59e0b;">
                <div class="inv-kpi-titulo">Items en Stock Cero</div>
                <div class="inv-kpi-valor" id="kpi-alertas">0</div>
            </div>
        </div>

        <div class="card" style="overflow-x:auto; padding:0;">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:800px;">
                <thead style="background:#f8fafc;">
                    <tr>
                        <th style="padding:15px;">Nombre del Artículo</th>
                        <th style="padding:15px;">Categoría</th>
                        <th style="padding:15px;">Stock Actual</th>
                        <th style="padding:15px;">Costo Promedio</th>
                        <th style="padding:15px;">Valor Total</th>
                        <th style="padding:15px; text-align:right;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tabla-inventario">
                    <tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">⏳ Cargando bodega...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    cargarDatosInventario();
};

// ==========================================
// LECTURA DE SUPABASE CORREGIDA
// ==========================================
async function cargarDatosInventario() {
    try {
        // Se quitó el .catch() que generaba el error
        const [resInv, resParam] = await Promise.all([
            window.supabase.from('inventario_insumos').select('*').order('categoria', { ascending: true }).order('nombre', { ascending: true }),
            window.supabase.from('parametros_inventario').select('*')
        ]);

        if (resInv.error) throw resInv.error;
        
        window.inventarioGlobal = resInv.data || [];
        
        window.parametrosInv = { categorias: [], unidades: [] };
        if(resParam && resParam.data) {
            resParam.data.forEach(p => {
                if(p.tipo === 'CATEGORIA') window.parametrosInv.categorias.push(p.valor);
                if(p.tipo === 'UNIDAD') window.parametrosInv.unidades.push(p.valor);
            });
        }

        renderizarTablaInventario(window.inventarioGlobal);
        actualizarKPIsInventario(window.inventarioGlobal);
        
    } catch (err) {
        document.getElementById('tabla-inventario').innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar datos: ${err.message}</td></tr>`;
    }
}

function renderizarTablaInventario(datos) {
    const tbody = document.getElementById('tabla-inventario');
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No hay insumos registrados en la bodega.</td></tr>';
        return;
    }

    let filas = '';
    datos.forEach(item => {
        const valorTotal = Number(item.cantidad_actual || 0) * Number(item.costo_promedio || 0);
        const alertaCero = Number(item.cantidad_actual) <= 0 ? 'color:#ef4444; font-weight:bold;' : 'color:#1e293b; font-weight:bold;';
        
        filas += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding:15px;"><b>${item.nombre}</b><br><small style="color:#94a3b8;">Últ. Act: ${new Date(item.ultima_actualizacion).toLocaleDateString()}</small></td>
                <td style="padding:15px;"><span class="badge-cat">${item.categoria || 'INSUMO'}</span></td>
                <td style="padding:15px; ${alertaCero}">${item.cantidad_actual} ${item.unidad_medida}</td>
                <td style="padding:15px;">$${Number(item.costo_promedio).toLocaleString('es-CO')}</td>
                <td style="padding:15px; color:#0ea5e9; font-weight:bold;">$${valorTotal.toLocaleString('es-CO')}</td>
                <td style="padding:15px; text-align:right;">
                    <button class="btn-accion-sm btn-ajuste" onclick="abrirModalAjusteStock('${item.id}', '${item.nombre}', ${item.cantidad_actual}, '${item.unidad_medida}')">± Ajuste Rápido</button>
                    <button class="btn-accion-sm btn-edit" onclick='abrirModalInsumo(${JSON.stringify(item).replace(/'/g, "&#39;")})'>✏️ Editar</button>
                    <button class="btn-accion-sm btn-del" onclick="eliminarInsumo('${item.id}', '${item.nombre}')">🗑️</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = filas;
}

function actualizarKPIsInventario(datos) {
    let valorizacion = 0;
    let alertas = 0;
    datos.forEach(item => {
        valorizacion += (Number(item.cantidad_actual || 0) * Number(item.costo_promedio || 0));
        if (Number(item.cantidad_actual || 0) <= 0) alertas++;
    });

    document.getElementById('kpi-items').innerText = datos.length;
    document.getElementById('kpi-valor').innerText = `$${valorizacion.toLocaleString('es-CO')}`;
    document.getElementById('kpi-alertas').innerText = alertas;
    if(alertas > 0) document.getElementById('kpi-alertas').style.color = '#ef4444';
}

window.filtrarInventario = function() {
    const texto = document.getElementById('inv-buscador').value.toLowerCase();
    const filtrados = window.inventarioGlobal.filter(item => 
        item.nombre.toLowerCase().includes(texto) || 
        (item.categoria && item.categoria.toLowerCase().includes(texto))
    );
    renderizarTablaInventario(filtrados);
};

// ==========================================
// PARÁMETROS DINÁMICOS
// ==========================================
window.agregarParametroDinamico = async function(tipo, selectId) {
    const nombreVisual = tipo === 'CATEGORIA' ? 'Categoría' : 'Unidad de Medida';
    const nuevoValor = prompt(`Ingresa el nombre de la nueva ${nombreVisual}:`);
    
    if(!nuevoValor || nuevoValor.trim() === '') return;
    const valorLimpio = nuevoValor.trim().toUpperCase();
    
    try {
        const { error } = await window.supabase.from('parametros_inventario').insert([{ tipo: tipo, valor: valorLimpio }]);
        if(error) throw error;
        
        if(tipo === 'CATEGORIA') window.parametrosInv.categorias.push(valorLimpio);
        else window.parametrosInv.unidades.push(valorLimpio);

        const select = document.getElementById(selectId);
        const option = document.createElement('option');
        option.value = valorLimpio;
        option.text = valorLimpio;
        option.selected = true; 
        select.add(option);

        if(typeof window.mostrarToast === 'function') window.mostrarToast(`${nombreVisual} guardada`, "exito");
    } catch(err) {
        alert("Error al crear parámetro: " + err.message);
    }
};

// ==========================================
// MODAL: CREAR / EDITAR INSUMO
// ==========================================
window.abrirModalInsumo = function(item = null) {
    const esEdit = item !== null;
    
    const optionsCat = window.parametrosInv.categorias.map(c => `<option value="${c}" ${esEdit && item.categoria === c ? 'selected' : ''}>${c}</option>`).join('');
    const optionsUnd = window.parametrosInv.unidades.map(u => `<option value="${u}" ${esEdit && item.unidad_medida === u ? 'selected' : ''}>${u}</option>`).join('');

    const modalHtml = `
        <div class="modal-overlay" id="modal-insumo">
            <div class="modal-content" style="max-width:500px; padding:0; border-radius:8px; overflow:hidden;">
                <div style="background:var(--color-primario); color:white; padding:15px 25px; display:flex; justify-content:space-between;">
                    <h3 style="margin:0; font-size:16px;">${esEdit ? '✏️ Editar Artículo de Bodega' : '📦 Registrar Nuevo Artículo'}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; color:white; cursor:pointer; font-size:20px;">&times;</button>
                </div>
                <form id="form-insumo" style="padding:25px; background:white;">
                    <input type="hidden" name="id" value="${esEdit ? item.id : ''}">
                    
                    <label style="display:block; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Nombre del Insumo / Producto</label>
                    <input type="text" name="nombre" value="${esEdit ? item.nombre : ''}" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:15px; box-sizing:border-box;">
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Categoría</label>
                            <div class="input-group">
                                <select id="sel-categoria" name="categoria" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                                    ${optionsCat}
                                </select>
                                <button type="button" class="btn-add-param" onclick="agregarParametroDinamico('CATEGORIA', 'sel-categoria')" title="Agregar nueva categoría">+</button>
                            </div>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Unidad de Medida</label>
                            <div class="input-group">
                                <select id="sel-unidad" name="unidad_medida" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                                    ${optionsUnd}
                                </select>
                                <button type="button" class="btn-add-param" onclick="agregarParametroDinamico('UNIDAD', 'sel-unidad')" title="Agregar nueva unidad">+</button>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:6px; border:1px solid #e2e8f0;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Stock Inicial / Actual</label>
                            <input type="number" step="0.01" name="cantidad_actual" value="${esEdit ? item.cantidad_actual : '0'}" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box; font-weight:bold;">
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Costo Promedio (Por Und/Metro)</label>
                            <input type="number" step="0.01" name="costo_promedio" value="${esEdit ? item.costo_promedio : '0'}" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box; font-weight:bold;">
                        </div>
                    </div>

                    <button type="submit" class="btn-primario" id="btn-save-inv" style="width:100%; padding:15px;">${esEdit ? 'Guardar Cambios' : 'Registrar en Bodega'}</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-insumo').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-inv'); btn.innerText = "Guardando..."; btn.disabled = true;
        const fd = new FormData(e.target);
        
        const payload = {
            nombre: fd.get('nombre'),
            categoria: fd.get('categoria'),
            cantidad_actual: Number(fd.get('cantidad_actual')),
            unidad_medida: fd.get('unidad_medida'),
            costo_promedio: Number(fd.get('costo_promedio')),
            ultima_actualizacion: new Date().toISOString()
        };

        try {
            if (esEdit) {
                const { error } = await window.supabase.from('inventario_insumos').update(payload).eq('id', fd.get('id'));
                if (error) throw error;
                if(typeof window.mostrarToast === 'function') window.mostrarToast("Insumo actualizado", "exito");
            } else {
                const { error } = await window.supabase.from('inventario_insumos').insert([payload]);
                if (error) throw error;
                if(typeof window.mostrarToast === 'function') window.mostrarToast("Insumo creado", "exito");
            }
            
            document.getElementById('modal-insumo').remove();
            cargarDatosInventario(); 
        } catch (err) {
            alert("Error al guardar: " + err.message);
            btn.innerText = "Guardar"; btn.disabled = false;
        }
    };
};

// ==========================================
// MODAL: AJUSTE RÁPIDO DE STOCK
// ==========================================
window.abrirModalAjusteStock = function(id, nombre, stockActual, unidad) {
    const modalHtml = `
        <div class="modal-overlay" id="modal-ajuste">
            <div class="modal-content" style="max-width:350px; padding:25px; text-align:center;">
                <h3 style="margin-top:0; color:#166534;">Ajuste de Stock</h3>
                <p style="color:#64748b; font-size:13px;">Insumo: <b>${nombre}</b></p>
                <p style="margin-bottom:20px;">Stock en sistema: <b style="font-size:18px;">${stockActual} ${unidad}</b></p>
                
                <form id="form-ajuste">
                    <label style="display:block; text-align:left; font-size:11px; font-weight:bold; color:#64748b; margin-bottom:5px;">Nuevo Stock Real (Conteo Físico)</label>
                    <input type="number" step="0.01" name="nuevo_stock" required placeholder="Ej: ${stockActual}" style="width:100%; padding:12px; border:2px solid #bbf7d0; border-radius:6px; margin-bottom:20px; font-size:18px; text-align:center; font-weight:bold; outline:none; box-sizing:border-box;">
                    
                    <div style="display:flex; gap:10px;">
                        <button type="button" class="btn-secundario" style="flex:1;" onclick="document.getElementById('modal-ajuste').remove()">Cancelar</button>
                        <button type="submit" class="btn-primario" style="flex:1; background:#166534; border:none;" id="btn-save-ajuste">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-ajuste').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-ajuste'); btn.innerText = "..."; btn.disabled = true;
        const nuevoStock = Number(new FormData(e.target).get('nuevo_stock'));

        try {
            const { error } = await window.supabase.from('inventario_insumos').update({ 
                cantidad_actual: nuevoStock,
                ultima_actualizacion: new Date().toISOString()
            }).eq('id', id);
            
            if (error) throw error;
            if(typeof window.mostrarToast === 'function') window.mostrarToast("Stock ajustado correctamente", "exito");
            
            document.getElementById('modal-ajuste').remove();
            cargarDatosInventario();
        } catch (err) {
            alert("Error al ajustar: " + err.message);
            btn.innerText = "Confirmar"; btn.disabled = false;
        }
    };
};

// ==========================================
// ELIMINAR INSUMO
// ==========================================
window.eliminarInsumo = async function(id, nombre) {
    if(confirm(`⚠️ ATENCIÓN MODO DIOS ⚠️\n\n¿Estás seguro que deseas ELIMINAR el insumo "${nombre}" de la base de datos de forma permanente?\n\nEsta acción no se puede deshacer.`)) {
        try {
            const { error } = await window.supabase.from('inventario_insumos').delete().eq('id', id);
            if (error) throw error;
            if(typeof window.mostrarToast === 'function') window.mostrarToast("Insumo eliminado de la bodega", "exito");
            cargarDatosInventario();
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    }
};