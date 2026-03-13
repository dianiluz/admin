window.renderComisiones = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card header-productos">
            <h2>Gestión de Colaboradores y Comisiones</h2>
            <button class="btn-primario" id="btn-abrir-nuevo-col">+ Nuevo Colaborador (Asesor/UGC)</button>
        </div>

        <div class="card">
            <h3 style="color:var(--color-primario); margin-bottom:15px;">👥 Miembros del Equipo Cupissa</h3>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Tipo</th>
                            <th>Código Asignado</th>
                            <th>Contrato</th>
                            <th>Ventas / Usos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-colaboradores-body">
                        <tr><td colspan="6" style="text-align:center; padding:20px;">Cargando equipo...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-abrir-nuevo-col').onclick = () => abrirModalNuevoColaborador();
    cargarColaboradores();
};

async function cargarColaboradores() {
    const tbody = document.getElementById('tabla-colaboradores-body');
    try {
        const { data: cols, error: errC } = await window.supabase.from('colaboradores').select('*');
        const { data: peds, error: errP } = await window.supabase.from('pedidos').select('total, vendedor, cupon_aplicado').eq('estado_pago', 'CONFIRMADO');

        if (errC) throw errC;
        tbody.innerHTML = '';

        if (!cols || cols.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay colaboradores registrados.</td></tr>';
            return;
        }

        cols.forEach(col => {
            const ventas = (col.tipo === 'ASESOR') 
                ? (peds || []).filter(p => p.vendedor === col.email)
                : (peds || []).filter(p => p.cupon_aplicado === col.codigo_asignado);
            
            const totalGenerado = ventas.reduce((s, p) => s + Number(p.total || 0), 0);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${col.usuario_redes}</strong><br><small>${col.email}</small></td>
                <td><span class="semaforo-estado" style="background:#eee;">${col.tipo}</span></td>
                <td><code>${col.codigo_asignado}</code></td>
                <td><span class="semaforo-estado ${col.estado_contrato === 'FIRMADO' ? 'estado-3' : 'estado-6'}">${col.estado_contrato}</span></td>
                <td>$${totalGenerado.toLocaleString('es-CO')}</td>
                <td><button class="btn-accion btn-editar" onclick="verPerfilColaborador('${col.email}')">Gestionar</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error cargando base de datos.</td></tr>';
    }
}

window.abrirModalNuevoColaborador = function() {
    document.querySelectorAll('#modal-nuevo-col').forEach(m => m.remove());

    const modalHtml = `
        <div class="modal-overlay" id="modal-nuevo-col">
            <div class="modal-content" style="max-width: 600px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="color:var(--color-primario); margin-bottom:20px;">Registrar Colaborador</h2>
                
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;"><label>Email del Usuario</label><input type="email" id="col-email" placeholder="Debe estar registrado en usuarios" required></div>
                    <div class="form-group"><label>Usuario Redes (sin @)</label><input type="text" id="col-redes" placeholder="Ej: DIANILUZ" required></div>
                    <div class="form-group">
                        <label>Tipo de Alianza</label>
                        <select id="col-tipo">
                            <option value="ASESOR">ASESOR (Venta x Comisión 10%)</option>
                            <option value="UGC">CREADOR UGC (Intercambio)</option>
                        </select>
                    </div>
                    <div class="modal-actions" style="grid-column: 1 / -1; margin-top:20px;">
                        <button type="button" class="btn-secundario" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button type="button" class="btn-primario" id="btn-guardar-col">GENERAR Y REGISTRAR</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-guardar-col').onclick = async () => {
        const email = document.getElementById('col-email').value;
        const redes = document.getElementById('col-redes').value.toUpperCase().replace('@','');
        const tipo = document.getElementById('col-tipo').value;
        
        if(!email || !redes) { window.mostrarToast("Faltan datos", "error"); return; }

        const btn = document.getElementById('btn-guardar-col');
        btn.disabled = true; btn.textContent = "Registrando...";

        const fecha = new Date();
        const diaMes = ("0" + fecha.getDate()).slice(-2) + ("0" + (fecha.getMonth() + 1)).slice(-2);
        const codigoAuto = redes + diaMes;

        try {
            const { error } = await window.supabase.from('colaboradores').insert([{
                email: email,
                usuario_redes: '@' + redes,
                tipo: tipo,
                codigo_asignado: codigoAuto,
                estado_contrato: 'PENDIENTE'
            }]);

            if (error) throw error;

            window.mostrarToast("¡Colaborador creado exitosamente!", "exito");
            document.getElementById('modal-nuevo-col').remove();
            cargarColaboradores();
        } catch (e) {
            window.mostrarToast("Error: " + e.message, "error");
            btn.disabled = false; btn.textContent = "GENERAR Y REGISTRAR";
        }
    };
};

window.verPerfilColaborador = async function(email) {
    const { data: col } = await window.supabase.from('colaboradores').select('*').eq('email', email).single();
    if (!col) return;

    const perfilHtml = `
        <div class="modal-overlay" id="modal-perfil-col">
            <div class="modal-content" style="max-width: 700px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <div style="text-align:center; margin-bottom:25px;">
                    <h2 style="font-family:'Bree Serif'; color:var(--color-primario);">${col.usuario_redes}</h2>
                    <span class="semaforo-estado" style="background:#000; color:#fff;">${col.tipo}</span>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div class="card" style="background:#fdf2f8;">
                        <h4 style="margin-bottom:10px;">Información</h4>
                        <p style="font-size:13px;"><b>Email:</b> ${col.email}</p>
                        <p style="font-size:13px;"><b>Código:</b> ${col.codigo_asignado}</p>
                    </div>
                    <div class="card" style="background:#f0fdf4;">
                        <h4 style="margin-bottom:10px;">Contrato Legal</h4>
                        <p style="font-size:13px;"><b>Estado:</b> ${col.estado_contrato}</p>
                        <p style="font-size:11px; color:#666;"><b>Firma IP:</b> ${col.firma_ip || 'Pendiente'}</p>
                    </div>
                </div>

                <div class="modal-actions" style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-primario" onclick="window.descargarContratoPDF('${col.email}')">📥 Descargar Contrato (PDF)</button>
                    <button class="btn-secundario" onclick="window.enviarContratoEmail('${col.email}')">📧 Enviar Contrato a Email</button>
                    <button class="btn-secundario" style="color:red; border-color:red;" onclick="window.eliminarColaborador('${col.email}')">Eliminar del Equipo</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', perfilHtml);
};

window.descargarContratoPDF = async function(email) {
    const { data: col } = await window.supabase.from('colaboradores').select('*').eq('email', email).single();
    const { data: user } = await window.supabase.from('usuarios').select('*').eq('email', email).single();
    
    if (!col || !user) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "assets/logo.png"; // Asegúrate de que la ruta sea correcta

    // --- ENCABEZADO LEGAL ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22); doc.setTextColor(219, 19, 122); 
    doc.text("CUPISSA", 14, 20);
    
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text("CUPISSA S.A.S. | NIT: [TU-NIT-AQUÍ]", 14, 25);
    doc.text("Barranquilla, Colombia | contacto@cupissa.com", 14, 29);
    
    doc.setDrawColor(219, 19, 122); doc.line(14, 32, 196, 32);

    // --- TÍTULO DEL CONTRATO ---
    doc.setFontSize(14); doc.setTextColor(0, 0, 0);
    const titulo = col.tipo === 'ASESOR' ? "CONTRATO DE COMISIÓN MERCANTIL Y CORRETAJE" : "CONTRATO DE INTERCAMBIO PUBLICITARIO Y DERECHOS DE IMAGEN";
    doc.text(titulo, 105, 42, { align: "center" });

    // --- IDENTIFICACIÓN DE LAS PARTES ---
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    let introduccion = `Entre los suscritos, CUPISSA S.A.S., representada legalmente por DIANA GONZÁLEZ (en adelante LA EMPRESA) y por la otra parte ${user.nombre.toUpperCase()}, identificado con C.C. ${user.cc || '________'}, (en adelante EL COLABORADOR), acuerdan celebrar el presente contrato bajo las siguientes cláusulas:`;
    
    let lineasIntro = doc.splitTextToSize(introduccion, 180);
    doc.text(lineasIntro, 14, 52);

    // --- CLAUSULADO LEGAL ---
    let clausulas = [];
    if (col.tipo === 'ASESOR') {
        clausulas = [
            "PRIMERA. OBJETO: El presente contrato faculta al COLABORADOR para realizar la promoción y corretaje de los productos de LA EMPRESA.",
            "SEGUNDA. COMISIONES: LA EMPRESA reconocerá un DIEZ POR CIENTO (10%) sobre el valor neto de cada venta efectivamente pagada y confirmada a través del código de asesor asignado.",
            "TERCERA. NATURALEZA: Las partes declaran que este es un contrato comercial y no existe vínculo laboral, subordinación ni prestación de servicios personales.",
            "CUARTA. PAGOS: Las comisiones se liquidarán conforme al sistema ERP de la empresa y se pagarán en los términos acordados tras la entrega final al cliente.",
            "QUINTA. CONFIDENCIALIDAD: EL COLABORADOR se obliga a no revelar información comercial, bases de datos o precios especiales de LA EMPRESA."
        ];
    } else {
        clausulas = [
            "PRIMERA. OBJETO: EL COLABORADOR realizará contenido audiovisual (UGC) consistente en videos, fotografías y reseñas de los productos entregados por LA EMPRESA.",
            "SEGUNDA. INTERCAMBIO: El pago por dicho contenido se realizará en especie mediante la entrega de productos de la marca, sin que medie transacción monetaria.",
            "TERCERA. DERECHOS DE AUTOR E IMAGEN: EL COLABORADOR cede de manera perpetua, global y exclusiva los derechos de uso de su imagen y del contenido creado para que LA EMPRESA los utilice en redes sociales, pauta y web.",
            "CUARTA. ENTREGABLES: El contenido debe cumplir con los estándares de calidad de la marca y ser publicado en las fechas estipuladas en el cronograma de marketing.",
            "QUINTA. EXCLUSIVIDAD: EL COLABORADOR se abstendrá de realizar contenido para marcas de competencia directa durante la vigencia de la campaña."
        ];
    }

    let yPos = 70;
    clausulas.forEach(c => {
        let lines = doc.splitTextToSize(c, 180);
        doc.setFont("helvetica", "bold"); doc.text(lines[0].split(':')[0] + ":", 14, yPos);
        doc.setFont("helvetica", "normal"); 
        let textoSinTitulo = lines.join(' ').split(': ')[1];
        let linesFinal = doc.splitTextToSize(textoSinTitulo, 170);
        doc.text(linesFinal, 20, yPos + 5);
        yPos += (linesFinal.length * 5) + 8;
    });

    // --- FIRMAS ---
    const yFirma = 230;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yFirma, 80, yFirma);
    doc.text("REPRESENTANTE LEGAL", 14, yFirma + 5);
    doc.text("CUPISSA S.A.S.", 14, yFirma + 9);

    doc.line(120, yFirma, 190, yFirma);
    doc.text("EL COLABORADOR", 120, yFirma + 5);
    doc.text(user.nombre.toUpperCase(), 120, yFirma + 9);

    // --- SELLO DE SEGURIDAD IP ---
    if (col.estado_contrato === 'FIRMADO') {
        doc.setFillColor(240, 253, 244);
        doc.rect(120, yFirma - 25, 75, 20, 'F');
        doc.setFontSize(7); doc.setTextColor(22, 101, 52);
        doc.text("FIRMADO DIGITALMENTE", 125, yFirma - 20);
        doc.text(`IP DE ORIGEN: ${col.firma_ip}`, 125, yFirma - 16);
        doc.text(`FECHA/HORA: ${new Date(col.fecha_firma).toLocaleString()}`, 125, yFirma - 12);
        doc.text(`CÓDIGO DE VALIDACIÓN: ${btoa(col.email).slice(0,10).toUpperCase()}`, 125, yFirma - 8);
    } else {
        doc.setTextColor(219, 19, 122);
        doc.text("PENDIENTE DE FIRMA DIGITAL", 120, yFirma - 5);
    }

    doc.save(`CONTRATO_CUPISSA_${col.usuario_redes.replace('@','')}.pdf`);
    window.mostrarToast("Contrato Legal Generado", "exito");
};

window.enviarContratoEmail = async function(email) {
    window.mostrarToast("Enviando contrato a " + email + "...", "exito");
    // Aquí llamaríamos a la función de Apps Script que hicimos antes
    const res = await fetch(CUPISSA_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'enviarCorreoMarketing',
            destinatarios: [email, 'finanzas@cupissa.com'],
            asunto: "📜 Tu Contrato de Colaboración con CUPISSA",
            cuerpo_html: "Adjuntamos los términos de tu colaboración. Recuerda que puedes firmarlo en tu panel.",
            btn_texto: "Ir a Mi Panel",
            btn_url: "https://cupissa.com/panel-colaborador"
        })
    });
    if(res.ok) window.mostrarToast("Correo enviado con copia a finanzas", "exito");
};

window.eliminarColaborador = async function(email) {
    if(confirm("¿Segura que deseas eliminar a este miembro del equipo?")) {
        await window.supabase.from('colaboradores').delete().eq('email', email);
        document.getElementById('modal-perfil-col').remove();
        cargarColaboradores();
        window.mostrarToast("Colaborador eliminado", "exito");
    }
};