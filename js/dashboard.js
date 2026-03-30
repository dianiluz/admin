// js/dashboard.js
window.renderDashboard = async function() {
    const dynamicContent = document.getElementById('dynamic-content');
    
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
                <h4>Ingresos Brutos en Caja</h4>
                <h2 id="dash-ingresos">$0</h2>
                <span class="sub-text">Suma de ventas pagadas y anticipos</span>
            </div>
            <div class="erp-card border-red">
                <h4>Egresos Operativos</h4>
                <h2 id="dash-egresos">$0</h2>
                <span class="sub-text">Insumos, nómina, comisiones, etc.</span>
            </div>
            <div class="erp-card border-orange">
                <h4>Cuentas por Cobrar (CxC)</h4>
                <h2 id="dash-cxc">$0</h2>
                <span class="sub-text">Saldos pendientes de clientes</span>
            </div>
            <div class="erp-card border-purple">
                <h4>Flujo Neto de Caja Actual</h4>
                <h2 id="dash-neto">$0</h2>
                <span class="sub-text">Ingresos menos Egresos (Dinero Real)</span>
            </div>
        </div>

        <h3 class="section-title">🛍️ Ecosistema Comercial</h3>
        <div class="erp-grid">
            <div class="erp-card border-pink">
                <h4>Total Pedidos Registrados</h4>
                <h2 id="dash-ventas-propias">0 Pedidos</h2>
                <span class="sub-text">Ventas por todos los canales</span>
            </div>
            <div class="erp-card border-blue" style="background: #f8fafc;">
                <h4>Valor Total Vendido (Bruto)</h4>
                <h2 id="dash-ventas-mkp">$0</h2>
                <span class="sub-text">Suma del valor total de los pedidos</span>
            </div>
            <div class="erp-card border-pink">
                <h4>Ticket Promedio por Pedido</h4>
                <h2 id="dash-ticket-promedio">$0</h2>
                <span class="sub-text">Gasto promedio por cliente</span>
            </div>
        </div>

        <h3 class="section-title">⚙️ Estado de Operaciones (Bodega y Logística)</h3>
        <div class="erp-grid">
            <div class="erp-card border-orange">
                <h4>En Producción (Taller)</h4>
                <h2 id="dash-op-taller">0</h2>
                <span class="sub-text">Pedidos en estado 1, 2, 2.1 y 2.2</span>
            </div>
            <div class="erp-card border-blue">
                <h4>Listos y En Camino</h4>
                <h2 id="dash-op-ruta">0</h2>
                <span class="sub-text">Pedidos en estado 3 y 4</span>
            </div>
            <div class="erp-card border-green">
                <h4>Pedidos Entregados</h4>
                <h2 id="dash-op-entregados">0</h2>
                <span class="sub-text">Pedidos finalizados (Estado 5)</span>
            </div>
            <div class="erp-card border-purple">
                <h4>Insumos en Bodega</h4>
                <h2 id="dash-insumos">0</h2>
                <span class="sub-text">Artículos registrados en inventario</span>
            </div>
        </div>

        <h3 class="section-title">👥 Fidelización y Equipo</h3>
        <div class="erp-grid">
            <div class="erp-card border-pink">
                <h4>CupiCoins Circulantes</h4>
                <h2 id="dash-cupicoins">0 CC</h2>
                <span class="sub-text">Pasivo virtual en billeteras de clientes</span>
            </div>
            <div class="erp-card border-purple">
                <h4>Equipo Comercial (UGC/Asesores)</h4>
                <h2 id="dash-ugc">0</h2>
                <span class="sub-text">Generando ventas por comisión</span>
            </div>
            <div class="erp-card border-blue">
                <h4>Directorio Total de Clientes</h4>
                <h2 id="dash-clientes">0</h2>
                <span class="sub-text">Base de datos de compradores</span>
            </div>
        </div>
    `;

    // --- MOTOR DE EXTRACCIÓN DE DATOS ---
    try {
        // 1. FINANZAS REALES (Tabla Finanzas + Anticipos de Pedidos)
        const [resFin, resPeds] = await Promise.all([
            window.supabase.from('finanzas').select('tipo, monto'),
            window.supabase.from('pedidos').select('total, valor_anticipo, saldo_pendiente, estado, estado_pago')
        ]);

        if (resFin.data && resPeds.data) {
            // Cálculos Financieros
            let ingresosCaja = 0;
            let egresosCaja = 0;
            let totalCxc = 0;
            let valorVendido = 0;

            // Extraer Egresos e Ingresos manuales
            resFin.data.forEach(f => {
                if (f.tipo === 'INGRESO') ingresosCaja += Number(f.monto || 0);
                if (f.tipo === 'EGRESO') egresosCaja += Number(f.monto || 0);
            });

            // Extraer finanzas de los pedidos
            let enTaller = 0;
            let enRuta = 0;
            let entregados = 0;

            resPeds.data.forEach(p => {
                valorVendido += Number(p.total || 0);
                totalCxc += Number(p.saldo_pendiente || 0);
                
                // Las ventas automatizadas ya insertan en finanzas, pero si hay pedidos viejos sin inyección:
                if(p.estado_pago === 'CONFIRMADO' || p.estado_pago === 'PAGADO') {
                    // Para no duplicar con la nueva inyección, sumamos solo lo que esté pendiente de cobrar
                }

                // Estados Logísticos
                const est = String(p.estado);
                if (['1', '2', '2.1', '2.2'].includes(est)) enTaller++;
                if (['3', '4'].includes(est)) enRuta++;
                if (est === '5') entregados++;
            });

            // Actualizar UI Financiera y Logística
            document.getElementById('dash-ingresos').textContent = `$${ingresosCaja.toLocaleString('es-CO')}`;
            document.getElementById('dash-egresos').textContent = `$${egresosCaja.toLocaleString('es-CO')}`;
            document.getElementById('dash-cxc').textContent = `$${totalCxc.toLocaleString('es-CO')}`;
            document.getElementById('dash-neto').textContent = `$${(ingresosCaja - egresosCaja).toLocaleString('es-CO')}`;
            
            document.getElementById('dash-ventas-propias').textContent = `${resPeds.data.length} Pedidos`;
            document.getElementById('dash-ventas-mkp').textContent = `$${valorVendido.toLocaleString('es-CO')}`;
            
            const ticket = resPeds.data.length > 0 ? Math.round(valorVendido / resPeds.data.length) : 0;
            document.getElementById('dash-ticket-promedio').textContent = `$${ticket.toLocaleString('es-CO')}`;

            document.getElementById('dash-op-taller').textContent = enTaller;
            document.getElementById('dash-op-ruta').textContent = enRuta;
            document.getElementById('dash-op-entregados').textContent = entregados;
        }

        // 2. CLIENTES Y CUPICOINS
        const { data: clientes } = await window.supabase.from('clientes').select('cupicoins_totales');
        if (clientes) {
            document.getElementById('dash-clientes').textContent = clientes.length;
            const totalCC = clientes.reduce((sum, c) => sum + Number(c.cupicoins_totales || 0), 0);
            document.getElementById('dash-cupicoins').textContent = `${totalCC.toLocaleString('es-CO')} CC`;
        }

        // 3. EQUIPO COMERCIAL (Asesores y UGC)
        const { data: equipo } = await window.supabase.from('equipo').select('rol');
        if (equipo) {
            const comerciales = equipo.filter(e => e.rol === 'ASESOR' || e.rol === 'UGC').length;
            document.getElementById('dash-ugc').textContent = comerciales;
        }

        // 4. INVENTARIO (Bodega)
        const { data: inventario } = await window.supabase.from('inventario_insumos').select('id');
        if (inventario) {
            document.getElementById('dash-insumos').textContent = inventario.length;
        }

    } catch (error) {
        console.error("Error global en Dashboard:", error);
    }
};