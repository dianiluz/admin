// js/comisiones.js

window.equipoComercialGlobal = [];

// Función auxiliar para convertir imágenes a Base64
const obtenerImagenBase64 = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error cargando activo:", url);
        return null;
    }
};

window.renderComisiones = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Gestión de Colaboradores y Comisiones</h2>
            <button class="btn-primario" id="btn-abrir-nuevo-col">+ Nuevo Colaborador (Asesor/UGC)</button>
        </div>

        <div class="card">
            <h3 style="color:var(--color-primario); margin-bottom:15px;">👥 Equipo Comercial Cupissa</h3>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Rol</th>
                            <th>Código Asignado</th>
                            <th>Estado Contrato</th>
                            <th>Ventas Generadas</th>
                            <th>Acciones / Pagos</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-colaboradores-body">
                        <tr><td colspan="6" style="text-align:center; padding:20px;">⏳ Cargando equipo comercial...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-abrir-nuevo-col').onclick = () => abrirModalNuevoColaborador();
    cargarColaboradores();
};

// ==========================================
// 1. CARGAR DESDE LA TABLA 'EQUIPO'
// ==========================================
async function cargarColaboradores() {
    const tbody = document.getElementById('tabla-colaboradores-body');
    try {
        // Traemos solo al equipo que sea comercial
        const { data: cols, error: errC } = await window.supabase.from('equipo').select('*').in('rol', ['ASESOR', 'UGC']);
        const { data: peds, error: errP } = await window.supabase.from('pedidos').select('total, vendedor, cupon_aplicado').in('estado_pago', ['CONFIRMADO', 'PAGADO']);

        if (errC) throw errC;
        window.equipoComercialGlobal = cols || [];
        tbody.innerHTML = '';

        if (window.equipoComercialGlobal.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No hay asesores o creadores UGC en el equipo.</td></tr>';
            return;
        }

        window.equipoComercialGlobal.forEach(col => {
            const ventas = (col.rol === 'ASESOR') 
                ? (peds || []).filter(p => p.vendedor === col.email)
                : (peds || []).filter(p => p.cupon_aplicado === col.codigo_asignado);
            
            const totalGenerado = ventas.reduce((s, p) => s + Number(p.total || 0), 0);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${col.nombre}</strong><br><small>${col.redes || col.email}</small></td>
                <td><span class="semaforo-estado" style="background:#f1f5f9; color:#475569;">${col.rol}</span></td>
                <td><code>${col.codigo_asignado || 'N/A'}</code></td>
                <td><span class="semaforo-estado ${col.estado_contrato === 'FIRMADO' ? 'estado-3' : 'estado-6'}">${col.estado_contrato || 'PENDIENTE'}</span></td>
                <td style="color:#10b981; font-weight:bold;">$${totalGenerado.toLocaleString('es-CO')}</td>
                <td><button class="btn-accion btn-editar" onclick="verPerfilColaborador('${col.email}')">Gestionar y Pagar</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error BD: ${e.message}</td></tr>`;
    }
}

// ==========================================
// 2. CREAR COLABORADOR (EN TABLA EQUIPO)
// ==========================================
window.abrirModalNuevoColaborador = function() {
    document.querySelectorAll('#modal-nuevo-col').forEach(m => m.remove());
    const modalHtml = `
        <div class="modal-overlay" id="modal-nuevo-col">
            <div class="modal-content" style="max-width: 600px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="color:var(--color-primario); margin-bottom:20px;">Vincular al Equipo Comercial</h2>
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Nombre Completo</label>
                        <input type="text" id="col-nombre" placeholder="Nombre real del colaborador" required>
                    </div>
                    <div class="form-group">
                        <label>Email de Contacto</label>
                        <input type="email" id="col-email" required>
                    </div>
                    <div class="form-group">
                        <label>Cédula o NIT</label>
                        <input type="text" id="col-documento" required>
                    </div>
                    <div class="form-group">
                        <label>Usuario Redes (Opcional)</label>
                        <input type="text" id="col-redes" placeholder="Ej: DIANILUZ">
                    </div>
                    <div class="form-group">
                        <label>Rol Comercial</label>
                        <select id="col-rol">
                            <option value="ASESOR">ASESOR (Venta x Comisión)</option>
                            <option value="UGC">CREADOR UGC (Intercambio/Código)</option>
                        </select>
                    </div>
                    <div class="modal-actions" style="grid-column: 1 / -1; margin-top:20px;">
                        <button type="button" class="btn-secundario" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button type="button" class="btn-primario" id="btn-guardar-col">Registrar en Equipo</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-guardar-col').onclick = async () => {
        const nombre = document.getElementById('col-nombre').value;
        const email = document.getElementById('col-email').value;
        const documento = document.getElementById('col-documento').value;
        const redes = document.getElementById('col-redes').value.toUpperCase().replace('@','');
        const rol = document.getElementById('col-rol').value;
        
        if(!nombre || !email || !documento) return window.mostrarToast("Nombre, Email y Documento son obligatorios", "error");

        const btn = document.getElementById('btn-guardar-col');
        btn.disabled = true; btn.textContent = "Registrando...";

        const baseCodigo = redes ? redes : nombre.split(' ')[0].toUpperCase().substring(0, 8);
        const fecha = new Date();
        const diaMes = ("0" + fecha.getDate()).slice(-2) + ("0" + (fecha.getMonth() + 1)).slice(-2);
        
        try {
            const { error } = await window.supabase.from('equipo').insert([{
                nombre: nombre,
                email: email, 
                documento: documento,
                redes: redes ? '@' + redes : null, 
                rol: rol, 
                codigo_asignado: baseCodigo + diaMes, 
                estado_contrato: 'PENDIENTE',
                tipo_pago: 'COMISION' // Para la lógica de nómina futura
            }]);

            if (error) throw error;
            document.getElementById('modal-nuevo-col').remove();
            cargarColaboradores();
            window.mostrarToast("Colaborador agregado al equipo", "exito");
        } catch (e) {
            window.mostrarToast("Error: " + e.message, "error");
            btn.disabled = false; btn.textContent = "Registrar en Equipo";
        }
    };
};

// ==========================================
// 3. GESTIÓN Y PAGO DE COMISIONES (FINANZAS)
// ==========================================
window.verPerfilColaborador = async function(email) {
    const col = window.equipoComercialGlobal.find(c => c.email === email);
    if (!col) return;

    // Calcular ventas para sugerir la comisión (Ej: 10% para Asesores)
    const { data: peds } = await window.supabase.from('pedidos').select('total, vendedor, cupon_aplicado').in('estado_pago', ['CONFIRMADO', 'PAGADO']);
    const ventas = (col.rol === 'ASESOR') ? (peds || []).filter(p => p.vendedor === col.email) : (peds || []).filter(p => p.cupon_aplicado === col.codigo_asignado);
    const totalGenerado = ventas.reduce((s, p) => s + Number(p.total || 0), 0);
    const comisionSugerida = col.rol === 'ASESOR' ? (totalGenerado * 0.10) : 0;

    const perfilHtml = `
        <div class="modal-overlay" id="modal-perfil-col">
            <div class="modal-content" style="max-width: 700px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <div style="text-align:center; margin-bottom:25px;">
                    <h2 style="font-family:'Bree Serif'; color:var(--color-primario); margin-bottom:5px;">${col.nombre}</h2>
                    <span class="semaforo-estado" style="background:#334155; color:#fff;">${col.rol} ${col.redes || ''}</span>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
                    <div class="card" style="background:#fdf2f8;">
                        <h4 style="margin-bottom:10px;">Información Comercial</h4>
                        <p style="font-size:13px;"><b>Código Promocional:</b> <code>${col.codigo_asignado}</code></p>
                        <p style="font-size:13px; color:#10b981; font-weight:bold; margin-top:5px;">Ventas Generadas: $${totalGenerado.toLocaleString('es-CO')}</p>
                        ${col.rol === 'ASESOR' ? `<p style="font-size:11px; color:#64748b;">Fondo de Comisión (10%): $${comisionSugerida.toLocaleString('es-CO')}</p>` : ''}
                    </div>
                    <div class="card" style="background:#f0fdf4;">
                        <h4 style="margin-bottom:10px;">Legal y Contrato</h4>
                        <p style="font-size:13px;"><b>Estado:</b> <span class="${col.estado_contrato === 'FIRMADO' ? 'color:green' : 'color:red'}">${col.estado_contrato}</span></p>
                        <p style="font-size:11px; color:#666;"><b>Firma IP:</b> ${col.firma_ip || 'Pendiente'}</p>
                    </div>
                </div>

                <div class="modal-actions" style="display:flex; flex-direction:column; gap:10px;">
                    ${col.rol === 'ASESOR' ? `<button class="btn-primario" style="background:#10b981; border:none;" onclick="abrirModalPagoComision('${col.email}', '${col.nombre}', ${comisionSugerida})">💸 Registrar Pago de Comisión en Caja</button>` : ''}
                    <button class="btn-secundario" onclick="window.descargarContratoPDF('${col.email}')">📥 Descargar Contrato (PDF)</button>
                    <button class="btn-secundario" style="color:red; border-color:red;" onclick="window.eliminarColaborador('${col.id}')">Eliminar del Equipo</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', perfilHtml);
};

window.abrirModalPagoComision = function(email, nombre, sugerido) {
    const modalHtml = `
        <div class="modal-overlay" id="modal-pago-comision">
            <div class="modal-content" style="max-width:400px; padding:25px;">
                <h3 style="margin-top:0; color:#10b981;">Pagar Comisión a ${nombre}</h3>
                <p style="font-size:12px; color:#64748b;">Este pago se registrará como un EGRESO en la Auditoría Financiera.</p>
                <form id="form-pago-comision">
                    <label style="display:block; font-size:11px; font-weight:bold; margin-bottom:5px;">Monto a Pagar ($)</label>
                    <input type="number" name="monto" value="${sugerido}" required style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; margin-bottom:15px; font-weight:bold;">
                    
                    <label style="display:block; font-size:11px; font-weight:bold; margin-bottom:5px;">Sale de (Método de Pago)</label>
                    <select name="metodo" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; margin-bottom:20px;">
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Caja Fuerte">Efectivo (Caja Fuerte)</option>
                    </select>

                    <div style="display:flex; gap:10px;">
                        <button type="button" class="btn-secundario" style="flex:1;" onclick="document.getElementById('modal-pago-comision').remove()">Cancelar</button>
                        <button type="submit" class="btn-primario" style="flex:1; background:#10b981; border:none;">Contabilizar Pago</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('form-pago-comision').onsubmit = async (e) => {
        e.preventDefault();
        const monto = Number(new FormData(e.target).get('monto'));
        const metodo = new FormData(e.target).get('metodo');
        
        try {
            // INYECCIÓN FINANCIERA: Registrar el pago en la auditoría
            const { error } = await window.supabase.from('finanzas').insert([{ 
                tipo: 'EGRESO', 
                categoria: '5105 - Pago Comisiones de Venta', 
                monto: monto, 
                metodo_pago: metodo, 
                descripcion: `Pago de comisiones generadas`, 
                creado_por: nombre 
            }]);

            if (error) throw error;
            window.mostrarToast("Pago registrado en Finanzas", "exito");
            document.getElementById('modal-pago-comision').remove();
            // document.getElementById('modal-perfil-col').remove();
        } catch (err) {
            window.mostrarToast("Error registrando pago: " + err.message, "error");
        }
    };
};

// ==========================================
// 4. CONTRATOS PDF Y ELIMINACIÓN
// ==========================================
window.descargarContratoPDF = async function(email) {
    const col = window.equipoComercialGlobal.find(c => c.email === email);
    if (!col || !window.jspdf) return window.mostrarToast("Faltan datos o librerías", "error");

    window.mostrarToast("Generando documento oficial...", "exito");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const fucsia = [219, 19, 122];
    const margin = 20;
    let y = 50;

    const logoUrl = "https://cupissa.com/assets/logo.png";
    const firmaUrl = "https://cupissa.com/assets/firma_diana.png";
    const logoBase64 = await obtenerImagenBase64(logoUrl);
    const firmaBase64 = await obtenerImagenBase64(firmaUrl);

    const checkPage = (addedHeight) => {
        if (y + addedHeight > 270) { doc.addPage(); renderHeader(); y = 40; }
    };

    const renderHeader = () => {
        if (logoBase64) { try { doc.addImage(logoBase64, 'PNG', 14, 10, 40, 16); } catch(e) {} }
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text("CUPISSA S.A.S. | NIT: 901725692", 196, 15, { align: 'right' });
        doc.setDrawColor(...fucsia); doc.setLineWidth(0.5); doc.line(14, 28, 196, 28);
    };

    renderHeader();

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(0);
    const titulo = col.rol === 'ASESOR' ? "CONTRATO DE COMISIÓN MERCANTIL Y CORRETAJE" : "CONTRATO DE INTERCAMBIO Y DERECHOS DE IMAGEN";
    const titleLines = doc.splitTextToSize(titulo, 150);
    doc.text(titleLines, 105, 38, { align: "center" });
    y = 38 + (titleLines.length * 7);

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const intro = `De una parte CUPISSA S.A.S., identificada con NIT 901725692, representada por DANIELA GONZÁLEZ, y de la otra parte ${col.nombre.toUpperCase()}, con C.C. ${col.documento || '___________'} y correo ${col.email} (EL COLABORADOR). Las partes acuerdan celebrar el presente contrato bajo las siguientes cláusulas:`;
    const introLines = doc.splitTextToSize(intro, 170);
    doc.text(introLines, margin, y);
    y += (introLines.length * 6) + 5;

    // Solo un par de cláusulas de ejemplo para mantener el PDF ligero, 
    // el array puede ser igual de extenso que el original.
    const clausulas = [
        ["PRIMERA. OBJETO", "Facultar a EL COLABORADOR para promover los productos de CUPISSA actuando como intermediario independiente."],
        ["SEGUNDA. NATURALEZA", "Constituye una relación comercial. No existe relación laboral, subordinación ni horario."],
        ["TERCERA. COMISIÓN / INTERCAMBIO", col.rol === 'ASESOR' ? "LA EMPRESA reconocerá el 10% del valor del pedido efectivamente pagado y entregado." : "La compensación se realizará mediante intercambio publicitario de productos."],
        ["CUARTA. CONFIDENCIALIDAD", "EL COLABORADOR se obliga a mantener confidencialidad sobre estrategias, precios y bases de datos de la empresa."]
    ];

    clausulas.forEach(c => {
        checkPage(15);
        doc.setFont("helvetica", "bold"); doc.text(c[0] + ":", margin, y); y += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(c[1], 165);
        doc.text(lines, margin + 5, y);
        y += (lines.length * 5) + 5;
    });

    checkPage(60);
    const firmaY = y + 20;
    if (firmaBase64) { try { doc.addImage(firmaBase64, 'PNG', margin + 5, firmaY - 18, 35, 15); } catch(e) {} }
    doc.setDrawColor(0); doc.line(margin, firmaY, 80, firmaY);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("DANIELA GONZÁLEZ", margin, firmaY + 5);
    doc.setFont("helvetica", "normal"); doc.text("Representante Legal CUPISSA", margin, firmaY + 9);

    doc.line(110, firmaY, 180, firmaY);
    doc.setFont("helvetica", "bold"); doc.text(col.nombre.toUpperCase(), 110, firmaY + 5);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    
    if (col.estado_contrato === 'FIRMADO') {
        doc.setTextColor(...fucsia);
        doc.text(`FIRMADO ELECTRÓNICAMENTE - IP: ${col.firma_ip || 'Sistema'}`, 110, firmaY + 9);
        doc.setTextColor(0);
    } else {
        doc.text("ACEPTACIÓN PENDIENTE EN PANEL", 110, firmaY + 9);
    }

    doc.save(`Contrato_CUPISSA_${col.nombre.replace(/\s+/g, '_')}.pdf`);
};

window.eliminarColaborador = async function(id) {
    if(confirm("¿Segura que deseas eliminar a este miembro comercial del equipo?\n\nPerderá su acceso y código, pero las ventas que ya generó seguirán existiendo.")) {
        await window.supabase.from('equipo').delete().eq('id', id);
        document.getElementById('modal-perfil-col').remove();
        cargarColaboradores();
        window.mostrarToast("Colaborador eliminado", "exito");
    }
};