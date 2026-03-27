window.renderDashboard = async function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    // CSS inyectado para las tarjetas del ERP
    const erpStyles = `
        <style>
            .erp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .erp-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #eee; position: relative; overflow: hidden; }
            .erp-card h4 { margin: 0 0 10px 0; font-size: 13px; color: var(--color-texto-suave); text-transform: uppercase; letter-spacing: 0.5px; }
            .erp-card h2 { margin: 0; font-size: 24px; color: var(--color-texto); font-family: var(--fuente-titulos); }
            .erp-card .sub-text { font-size: 11px; color: #888; margin-top: 5px; display: block; }
            
            .border-green { border-bottom: 4px solid #10b981; }
            .border-red { border-bottom: 4px solid #ef4444; }
            .border-blue { border-bottom: 4px solid #3b82f6; }
            .border-pink { border-bottom: 4px solid var(--color-primario); }
            .border-orange { border-bottom: 4px solid #f59e0b; }
            .border-purple { border-bottom: 4px solid #8b5cf6; }
            
            .section-title { font-family: var(--fuente-titulos); color: var(--color-primario); border-bottom: 2px solid #eee; padding-bottom: 10px; margin: 30px 0 15px 0; display:flex; align-items:center; gap:10px; }
        </style>
    `;

    dynamicContent.innerHTML = erpStyles + `
        <h3 class="section-title">💰 Centro Financiero y Flujo de Caja</h3>
        <div class="erp-grid">
            <div class="erp-card border-green">
                <h4>Ingresos Brutos (Confirmados)</h4>
                <h2 id="dash-ingresos">$0</h2>
                <span class="sub-text">Ventas pagadas al 100% o con anticipo</span>
            </div>
            <div class="erp-card border-red">
                <h4>Egresos Operativos</h4>
                <h2 id="dash-egresos">$0</h2>
                <span class="sub-text">Insumos, nómina, servicios y arriendos</span>
            </div>
            <div class="erp-card border-orange">
                <h4>Cuentas por Cobrar (CxC)</h4>
                <h2 id="dash-cxc">$0</h2>
                <span class="sub-text">Saldos pendientes de clientes</span>
            </div>
            <div class="erp-card border-purple">
                <h4>Pasivos (Comisiones / Destajos)</h4>
                <h2 id="dash-cxp">$0</h2>
                <span class="sub-text">Deuda con asesores y taller por pagar</span>
            </div>
        </div>

        <h3 class="section-title">🛍️ Ecosistema Comercial</h3>
        <div class="erp-grid">
            <div class="erp-card border-pink">
                <h4>Ventas Directas (ERP/POS)</h4>
                <h2 id="dash-ventas-propias">0 Pedidos</h2>
                <span class="sub-text">Canales oficiales de Cupissa</span>
            </div>
            <div class="erp-card border-blue" style="background: #f8fafc;">
                <h4>Ventas Marketplace (Externos)</h4>
                <h2 id="dash-ventas-mkp">0 Pedidos</h2>
                <span class="sub-text">Sellers asociados (Próximamente)</span>
            </div>
            <div class="erp-card border-pink">
                <h4>Ticket Promedio</h4>
                <h2 id="dash-ticket-promedio">$0</h2>
                <span class="sub-text">Gasto promedio por cliente</span>
            </div>
        </div>

        <h3 class="section-title">⚙️ Operaciones en Curso</h3>
        <div class="erp-grid">
            <div class="erp-card border-orange">
                <h4>En Diseño</h4>
                <h2 id="dash-op-diseno">0</h2>
                <span class="sub-text">Pedidos en patronaje/boceto</span>
            </div>
            <div class="erp-card border-orange">
                <h4>En Taller (Producción)</h4>
                <h2 id="dash-op-taller">0</h2>
                <span class="sub-text">Prendas en costura / armado</span>
            </div>
            <div class="erp-card border-blue">
                <h4>En Ruta / Logística</h4>
                <h2 id="dash-op-ruta">0</h2>
                <span class="sub-text">Con repartidores o transportadora</span>
            </div>
            <div class="erp-card border-green">
                <h4>Entregados (Mes)</h4>
                <h2 id="dash-op-entregados">0</h2>
                <span class="sub-text">Ciclo finalizado exitosamente</span>
            </div>
        </div>

        <h3 class="section-title">👥 Fidelización, Creadores y Equipo</h3>
        <div class="erp-grid">
            <div class="erp-card border-pink">
                <h4>CupiCoins Circulantes</h4>
                <h2 id="dash-cupicoins">0 CC</h2>
                <span class="sub-text">Pasivo virtual en billeteras de clientes</span>
            </div>
            <div class="erp-card border-purple">
                <h4>Creadores UGC Activos</h4>
                <h2 id="dash-ugc">0</h2>
                <span class="sub-text">Campañas de intercambio en curso</span>
            </div>
            <div class="erp-card border-blue">
                <h4>Staff y Asesores</h4>
                <h2 id="dash-equipo">0</h2>
                <span class="sub-text">Personal registrado en plataforma</span>
            </div>
            <div class="erp-card border-green">
                <h4>Directorio Clientes</h4>
                <h2 id="dash-clientes">0</h2>
                <span class="sub-text">Base de datos de compradores</span>
            </div>
        </div>
    `;

    // --- MOTOR DE EXTRACCIÓN DE DATOS (CON PROTECCIÓN DE ERRORES) ---
    try {
        // 1. MÓDULO PEDIDOS Y VENTAS (Tabla que ya existe)
        const { data: pedidos, error: errPeds } = await window.supabase.from('pedidos').select('*');
        if (!errPeds && pedidos) {
            let ingresosTotales = 0;
            let cuentasPorCobrar = 0;
            let pedidosPropios = 0;
            let entregados = 0;

            pedidos.forEach(p => {
                // Sumamos los anticipos o totales pagados a "Ingresos"
                if (p.estado_pago === 'CONFIRMADO') {
                    ingresosTotales += Number(p.total || 0);
                } else if (p.valor_anticipo > 0) {
                    ingresosTotales += Number(p.valor_anticipo);
                }

                // Sumamos la plata en la calle (CxC)
                cuentasPorCobrar += Number(p.saldo_pendiente || 0);

                // Conteo de pedidos
                if (p.tipo !== 'MARKETPLACE') pedidosPropios++;
                if (String(p.estado) === '5') entregados++;
            });

            document.getElementById('dash-ingresos').textContent = `$${ingresosTotales.toLocaleString('es-CO')}`;
            document.getElementById('dash-cxc').textContent = `$${cuentasPorCobrar.toLocaleString('es-CO')}`;
            document.getElementById('dash-ventas-propias').textContent = `${pedidosPropios} Pedidos`;
            document.getElementById('dash-op-entregados').textContent = entregados;

            const ticket = pedidosPropios > 0 ? Math.round((ingresosTotales + cuentasPorCobrar) / pedidosPropios) : 0;
            document.getElementById('dash-ticket-promedio').textContent = `$${ticket.toLocaleString('es-CO')}`;
        }

        // 2. MÓDULO CLIENTES Y CUPICOINS (Tabla que ya existe)
        const { data: clientes, error: errCli } = await window.supabase.from('clientes').select('cupicoins_totales');
        if (!errCli && clientes) {
            document.getElementById('dash-clientes').textContent = clientes.length;
            const totalCC = clientes.reduce((sum, c) => sum + Number(c.cupicoins_totales || 0), 0);
            document.getElementById('dash-cupicoins').textContent = `${totalCC.toLocaleString('es-CO')} CC`;
        }

        // 3. MÓDULO EQUIPO Y ASESORES (Tabla que ya existe)
        const { count: countEq, error: errEq } = await window.supabase.from('equipo').select('*', { count: 'exact', head: true });
        if (!errEq) document.getElementById('dash-equipo').textContent = countEq || 0;

        // 4. MÓDULO OPERACIONES (Producción y Logística - Protección Try/Catch)
        try {
            const { data: flujo } = await window.supabase.from('produccion_flujo').select('etapa');
            if (flujo) {
                document.getElementById('dash-op-diseno').textContent = flujo.filter(f => f.etapa === 'DISEÑO').length;
                document.getElementById('dash-op-taller').textContent = flujo.filter(f => f.etapa === 'TALLER').length;
            }
        } catch (e) { /* Falla silenciosa si la tabla no existe aún */ }

        try {
            const { data: logistica } = await window.supabase.from('logistica_envios').select('estado_envio');
            if (logistica) {
                document.getElementById('dash-op-ruta').textContent = logistica.filter(l => l.estado_envio === 'EN_RUTA').length;
            }
        } catch (e) { /* Falla silenciosa */ }

        // 5. MÓDULO FINANZAS (Egresos y CxP - Protección Try/Catch)
        try {
            const { data: finanzas } = await window.supabase.from('finanzas').select('tipo, monto, estado');
            if (finanzas) {
                const egresos = finanzas.filter(f => f.tipo === 'EGRESO' && f.estado === 'PAGADO').reduce((s, f) => s + Number(f.monto), 0);
                const pasivos = finanzas.filter(f => f.tipo === 'EGRESO' && f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.monto), 0);
                
                document.getElementById('dash-egresos').textContent = `$${egresos.toLocaleString('es-CO')}`;
                document.getElementById('dash-cxp').textContent = `$${pasivos.toLocaleString('es-CO')}`;
            }
        } catch (e) { /* Falla silenciosa */ }

        // 6. MÓDULO UGC MARKETPLACE (Protección Try/Catch)
        try {
            const { data: ugc } = await window.supabase.from('ugc_campanas').select('estado');
            if (ugc) document.getElementById('dash-ugc').textContent = ugc.filter(u => u.estado === true).length;
        } catch (e) { /* Falla silenciosa */ }

    } catch (error) {
        console.error("Error global en Dashboard:", error);
    }
};