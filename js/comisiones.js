// Función auxiliar para convertir imágenes a Base64
const obtenerImagenBase64 = async (url) => {
    try {
        // Llamamos las imágenes directo desde tu dominio público para evitar bloqueos de GitHub
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

// 1. REEMPLAZA LA FUNCIÓN DEL MODAL PARA AGREGAR EL CAMPO DE CÉDULA/NIT
window.abrirModalNuevoColaborador = function() {
    document.querySelectorAll('#modal-nuevo-col').forEach(m => m.remove());
    const modalHtml = `
        <div class="modal-overlay" id="modal-nuevo-col">
            <div class="modal-content" style="max-width: 600px;">
                <button type="button" class="btn-cerrar-x" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2 style="color:var(--color-primario); margin-bottom:20px;">Registrar Colaborador</h2>
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Email del Usuario</label>
                        <input type="email" id="col-email" placeholder="Debe estar registrado en usuarios" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Cédula o NIT</label>
                        <input type="text" id="col-documento" placeholder="Ej: 1048289..." required>
                    </div>

                    <div class="form-group">
                        <label>Usuario Redes (Opcional para Asesor)</label>
                        <input type="text" id="col-redes" placeholder="Ej: DIANILUZ">
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;">
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
        const documento = document.getElementById('col-documento').value;
        const redes = document.getElementById('col-redes').value.toUpperCase().replace('@','');
        const tipo = document.getElementById('col-tipo').value;
        
        // Validación inteligente
        if(!email || !documento) {
            window.mostrarToast("Email y Cédula/NIT son obligatorios", "error");
            return;
        }

        if(tipo === 'UGC' && !redes) {
            window.mostrarToast("Para Creadores UGC las redes son obligatorias", "error");
            return;
        }

        const btn = document.getElementById('btn-guardar-col');
        btn.disabled = true; btn.textContent = "Registrando...";

        // Si no puso redes, su código base será una parte de su email
        const baseCodigo = redes ? redes : email.split('@')[0].toUpperCase().substring(0, 8);
        const fecha = new Date();
        const diaMes = ("0" + fecha.getDate()).slice(-2) + ("0" + (fecha.getMonth() + 1)).slice(-2);
        
        try {
            const { error } = await window.supabase.from('colaboradores').insert([{
                email: email, 
                documento: documento,
                usuario_redes: redes ? '@' + redes : 'N/A', 
                tipo: tipo, 
                codigo_asignado: baseCodigo + diaMes, 
                estado_contrato: 'PENDIENTE'
            }]);

            if (error) throw error;

            document.getElementById('modal-nuevo-col').remove();
            cargarColaboradores();
            window.mostrarToast("Colaborador Creado con Éxito", "exito");
        } catch (e) {
            // Manejamos el error de caché amigablemente por si vuelve a pasar
            if (e.message && e.message.includes('schema cache')) {
                window.mostrarToast("Actualiza la página (F5). Supabase está guardando la nueva columna.", "error");
            } else {
                window.mostrarToast("Error: " + e.message, "error");
            }
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
    
    if (!col || !user) return window.mostrarToast("Faltan datos para el contrato", "error");

    window.mostrarToast("Generando documento oficial...", "exito");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const fucsia = [219, 19, 122];
    const margin = 20;
    const pageWidth = 170; 
    let y = 50;

    // Llamamos a las imágenes directo desde tu dominio público para evitar fallos
    const logoUrl = "https://cupissa.com/assets/logo.png";
    const firmaUrl = "https://cupissa.com/assets/firma_diana.png";

    const logoBase64 = await obtenerImagenBase64(logoUrl);
    const firmaBase64 = await obtenerImagenBase64(firmaUrl);

    const checkPage = (addedHeight) => {
        if (y + addedHeight > 270) {
            doc.addPage();
            renderHeader();
            y = 40;
        }
    };

    const renderHeader = () => {
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'PNG', 14, 10, 40, 16); } catch(e) {}
        }
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text("CUPISSA S.A.S. | NIT: 901725692", 196, 15, { align: 'right' });
        doc.setDrawColor(...fucsia); doc.setLineWidth(0.5);
        doc.line(14, 28, 196, 28);
    };

    renderHeader();

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(0);
    const titulo = col.tipo === 'ASESOR' ? "CONTRATO DE COMISIÓN MERCANTIL Y CORRETAJE COMERCIAL" : "CONTRATO DE INTERCAMBIO PUBLICITARIO Y CESIÓN DE DERECHOS DE IMAGEN Y CONTENIDO";
    const titleLines = doc.splitTextToSize(titulo.toUpperCase(), 150);
    doc.text(titleLines, 105, 38, { align: "center" });
    y = 38 + (titleLines.length * 7);

    const cedula = col.documento ? String(col.documento) : (user.cc ? String(user.cc) : '_________________');
    const ciudad = user.ciudad ? String(user.ciudad) : 'BARRANQUILLA';

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const intro = `De una parte CUPISSA S.A.S., sociedad comercial identificada con NIT 901725692, con domicilio en la ciudad de Barranquilla, Atlántico, Colombia, representada legalmente por DANIELA GONZÁLEZ, identificada con cédula de ciudadanía 1048289246, quien para efectos del presente contrato se denominará LA EMPRESA, y de la otra parte ${user.nombre.toUpperCase()}, con C.C. ${cedula}, domiciliado en ${ciudad} y correo ${user.email} (EL COLABORADOR) quien en adelante se denominará EL COLABORADOR. Las partes acuerdan celebrar el presente contrato, el cual se regirá por las siguientes cláusulas:`;
    const introLines = doc.splitTextToSize(intro, pageWidth);
    doc.text(introLines, margin, y);
    y += (introLines.length * 6) + 5;

    // CLAUSULADO ASESOR COMPLETO
    const clausulasAsesor = [
        ["PRIMERA. OBJETO DEL CONTRATO", "El presente contrato tiene por objeto facultar a EL COLABORADOR para promover, recomendar y facilitar la comercialización de los productos ofrecidos por CUPISSA S.A.S., actuando como intermediario comercial independiente mediante la generación de ventas a través de enlaces, códigos, recomendaciones o cualquier otro mecanismo autorizado por la empresa. El colaborador actuará de manera autónoma, sin subordinación ni dependencia laboral, limitándose su función a la promoción comercial de los productos."],
        ["SEGUNDA. NATURALEZA JURÍDICA", "Las partes manifiestan expresamente que el presente contrato constituye una relación comercial de comisión mercantil, conforme a lo establecido en el Código de Comercio colombiano. En consecuencia: no existe relación laboral, no existe subordinación, no se generan prestaciones sociales, no existe horario ni obligación de permanencia. EL COLABORADOR actúa con plena independencia económica y administrativa."],
        ["TERCERA. COMISIÓN", "LA EMPRESA reconocerá a favor de EL COLABORADOR una comisión equivalente al: DIEZ POR CIENTO (10%) del valor del pedido vendido. Para efectos del cálculo de la comisión: la comisión se calculará únicamente sobre el valor del pedido, excluyendo: costos de envío, comisiones de pasarelas de pago, impuestos, cargos financieros y descuentos promocionales. La comisión será reconocida únicamente cuando el pedido haya sido efectivamente pagado y entregado al cliente final."],
        ["CUARTA. LIQUIDACIÓN Y PAGO", "Las comisiones generadas serán liquidadas por LA EMPRESA con base en los registros del sistema interno de ventas. El pago de las comisiones se realizará con una periodicidad semanal, siempre que se cumplan las siguientes condiciones: (1) Que el pedido haya sido pagado completamente; (2) Que el pedido haya sido entregado al cliente; (3) Que no exista devolución, cancelación o fraude asociado a la venta. En caso de devolución del producto o reversión del pago, la comisión correspondiente no será reconocida."],
        ["QUINTA. TERRITORIO", "El presente contrato tendrá aplicación en el territorio de la República de Colombia, sin perjuicio de que el colaborador pueda promover productos en medios digitales accesibles desde otros territorios."],
        ["SEXTA. NO EXCLUSIVIDAD", "El presente contrato no establece exclusividad. EL COLABORADOR podrá promover o comercializar productos de otras marcas o empresas, siempre que dicha actividad: no afecte la reputación de CUPISSA, no utilice información confidencial de la empresa y no implique competencia desleal."],
        ["SÉPTIMA. OBLIGACIONES", "EL COLABORADOR se compromete a: (1) Promocionar los productos de CUPISSA de manera ética y transparente; (2) No realizar afirmaciones falsas o engañosas sobre los productos; (3) Utilizar únicamente material publicitario autorizado por la empresa; (4) No alterar los precios oficiales de los productos; (5) Mantener confidencialidad sobre estrategias comerciales de la empresa y (6) No utilizar la marca CUPISSA para fines distintos a la promoción autorizada."],
        ["OCTAVA. PROTECCIÓN DE MARCA", "La marca CUPISSA, su identidad visual, logotipos, diseños, campañas y materiales publicitarios son propiedad exclusiva de CUPISSA S.A.S. EL COLABORADOR reconoce que: no adquiere derechos de propiedad intelectual, no puede registrar marcas similares, no puede usar la marca sin autorización. El uso indebido de la marca podrá generar terminación inmediata del contrato y acciones legales."],
        ["NOVENA. CONFIDENCIALIDAD", "EL COLABORADOR se obliga a no divulgar información relacionada con: estrategias comerciales, bases de datos, precios internos, proveedores, información financiera. Esta obligación permanecerá vigente incluso después de terminado el contrato."],
        ["DÉCIMA. TERMINACIÓN", "El presente contrato tendrá duración indefinida. Podrá darse por terminado por cualquiera de las partes en los siguientes casos: (1) Incumplimiento de las obligaciones contractuales; (2) Uso indebido de la marca; (3) Fraude comercial; y/o (4) Conductas que afecten la reputación de la empresa. La empresa podrá terminar el contrato de forma inmediata en caso de incumplimiento grave."],
        ["DÉCIMA PRIMERA. PENALIZACIÓN", "En caso de que EL COLABORADOR incurra en conductas que generen perjuicio económico o reputacional a la empresa, CUPISSA S.A.S. podrá: suspender el pago de comisiones pendientes, cancelar el contrato e iniciar las acciones legales correspondientes."],
        ["DÉCIMA SEGUNDA. PROTECCIÓN DE DATOS", "Las partes declaran que el tratamiento de datos personales se realizará conforme a lo dispuesto en: Ley 1581 de 2012 y Decreto 1377 de 2013. EL COLABORADOR autoriza expresamente a CUPISSA S.A.S. para: almacenar sus datos, procesarlos, utilizarlos para fines administrativos y comerciales relacionados con la relación contractual."],
        ["DÉCIMA TERCERA. JURISDICCIÓN", "Para todos los efectos legales derivados del presente contrato, las partes acuerdan someterse a la jurisdicción de los jueces de Barranquilla, Atlántico, Colombia."]
    ];  

    // CLAUSULADO UGC COMPLETO 
    const clausulasUGC = [
        ["PRIMERA. OBJETO", "El presente contrato tiene por objeto la creación de contenido audiovisual y digital relacionado con los productos de la marca CUPISSA. El colaborador se compromete a producir contenido que podrá incluir, sin limitarse a ellos: videos, reels, fotografías, historias y publicaciones en redes sociales. Este contenido podrá ser publicado tanto en las redes del colaborador como en las plataformas oficiales de la empresa."],
        ["SEGUNDA. MODALIDAD DE INTERCAMBIO", "La compensación por el contenido generado se realizará mediante intercambio publicitario, consistente en la entrega de productos de la marca. El valor del intercambio será variable, dependiendo de cada campaña o acuerdo específico. No existirá pago en dinero salvo que las partes acuerden lo contrario por escrito."],
        ["TERCERA. PLAZO DE ENTREGA", "EL COLABORADOR deberá entregar o publicar el contenido dentro de un plazo máximo de quince (15) días calendario contados desde la recepción del producto o desde la fecha acordada para la campaña."],
        ["CUARTA. CESIÓN DE DERECHOS", "EL COLABORADOR cede a favor de CUPISSA S.A.S. de manera: perpetua, global e irrevocable los derechos de uso, reproducción, modificación, distribución y comunicación pública del contenido generado. Esto incluye su utilización en: redes sociales, publicidad digital, campañas comerciales, páginas web y material promocional."],
        ["QUINTA. USO DE IMAGEN", "EL COLABORADOR autoriza a CUPISSA S.A.S. a utilizar su imagen personal, voz y nombre artístico en relación con el contenido producido para fines promocionales y publicitarios. Esta autorización se concede sin límite territorial ni temporal."],
        ["SEXTA. NO EXCLUSIVIDAD", "El presente contrato no establece exclusividad, por lo que el colaborador podrá trabajar con otras marcas."],
        ["SÉPTIMA. CALIDAD", "El contenido deberá cumplir con estándares mínimos de calidad, incluyendo: buena iluminación, buena resolución y coherencia con la imagen de marca. La empresa podrá solicitar ajustes razonables en el material entregado."],
        ["OCTAVA. PROTECCIÓN DE MARCA", "EL COLABORADOR se compromete a respetar la identidad visual y reputación de la marca CUPISSA. Se prohíbe el uso de la marca para: contenidos ofensivos, contextos políticos, contenidos ilegales o inapropiados."],
        ["NOVENA. TERMINACIÓN", "El contrato podrá darse por terminado en caso de: incumplimiento de entregables, uso indebido de la marca y/o conductas que afecten la reputación de la empresa."],
        ["DÉCIMA. PENALIZACIONES", "En caso de incumplimiento del colaborador, la empresa podrá: exigir la devolución del producto entregado, cancelar futuras colaboraciones e iniciar acciones legales si corresponde."],
        ["DÉCIMA PRIMERA. DATOS PERSONALES", "Las partes acuerdan cumplir con la legislación colombiana de protección de datos personales."],
        ["DÉCIMA SEGUNDA. JURISDICCION", "Cualquier controversia será resuelta ante los jueces de Barranquilla, Atlántico, Colombia."]
    ];

    const clausulas = col.tipo === 'ASESOR' ? clausulasAsesor : clausulasUGC;

    clausulas.forEach(c => {
        checkPage(15);
        doc.setFont("helvetica", "bold"); doc.text(c[0] + ":", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(c[1], pageWidth - 5);
        doc.text(lines, margin + 5, y);
        y += (lines.length * 5) + 5;
    });

    // CLÁUSULA FIRMA ELECTRÓNICA
    checkPage(45);
    doc.setDrawColor(230); doc.setFillColor(248, 248, 248); doc.rect(margin, y, 170, 35, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("CLÁUSULA DE FIRMA ELECTRÓNICA Y ACEPTACIÓN DIGITAL", margin + 5, y + 7);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const ley = "Las partes acuerdan que el presente contrato podrá ser celebrado y aceptado mediante firma electrónica, conforme a lo establecido en la Ley 527 de 1999, el Decreto 2364 de 2012 y demás normas concordantes de la República de Colombia que regulan el comercio electrónico y la validez jurídica de los mensajes de datos. En consecuencia, el registro digital de aceptación realizado por EL COLABORADOR dentro de la plataforma de CUPISSA S.A.S. tendrá plena validez jurídica y probatoria, produciendo los mismos efectos que una firma manuscrita. La aceptación electrónica del contrato quedará registrada mediante los siguientes elementos de verificación digital: Dirección IP, fecha y hora exacta, correo electrónico y código de validación.";
    doc.text(doc.splitTextToSize(ley, 160), margin + 5, y + 13);
    y += 45;

    // FIRMAS Y SELLOS
    checkPage(50);
    const firmaY = y + 15;
    
    // Inserción de firma tuya si logró cargarla
    if (firmaBase64) {
        try { doc.addImage(firmaBase64, 'PNG', margin + 5, firmaY - 18, 35, 15); } catch(e) {}
    }
    
    doc.setDrawColor(0); doc.line(margin, firmaY, 80, firmaY);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("DANIELA GONZÁLEZ", margin, firmaY + 5);
    doc.setFont("helvetica", "normal"); doc.text("Representante Legal CUPISSA S.A.S.", margin, firmaY + 9);

    doc.line(120, firmaY, 190, firmaY);
    doc.setFont("helvetica", "bold"); doc.text(user.nombre.toUpperCase(), 120, firmaY + 5);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    
    if (col.estado_contrato === 'FIRMADO') {
        doc.setTextColor(...fucsia);
        doc.text(`FIRMADO ELECTRÓNICAMENTE - IP: ${col.firma_ip}`, 120, firmaY + 9);
        doc.text(`FECHA: ${new Date(col.fecha_firma).toLocaleString()}`, 120, firmaY + 13);
        doc.setTextColor(0);
    } else {
        doc.text("ACEPTACIÓN PENDIENTE EN PANEL", 120, firmaY + 9);
    }

    // QR DE VERIFICACIÓN
    const qrData = `VERIFICACIÓN CUPISSA\nContrato: ${col.codigo_asignado}\nColaborador: ${user.email}\nNIT: 901725692\nValidez: Ley 527 de 1999`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    try {
        doc.addImage(qrUrl, 'PNG', 160, firmaY + 15, 30, 30);
        doc.setFontSize(6); doc.text("VALIDAR AUTENTICIDAD", 160, firmaY + 47);
    } catch(e) {}

    doc.save(`CONTRATO_CUPISSA_${user.nombre.replace(/\s+/g, '_')}.pdf`);
};

window.enviarContratoEmail = async function(email) {
    window.mostrarToast("Enviando contrato a " + email + "...", "exito");
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