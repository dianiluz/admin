window.renderDashboard = async function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="card" style="border-top: 4px solid var(--color-primario);">
                <h3>Ventas Mes Actual</h3>
                <h1 id="dash-ventas" style="color:var(--color-primario); margin-top:10px;">Calculando...</h1>
            </div>
            <div class="card" style="border-top: 4px solid #f59e0b;">
                <h3>Pedidos Pendientes / Producción</h3>
                <h1 id="dash-pedidos-pendientes" style="margin-top:10px;">...</h1>
            </div>
            <div class="card" style="border-top: 4px solid #3b82f6;">
                <h3>Nuevos Usuarios Registrados</h3>
                <h1 id="dash-usuarios-nuevos" style="margin-top:10px;">...</h1>
            </div>
        </div>

        <div class="card">
            <h3 style="color:var(--color-primario); margin-bottom:15px;">📊 Resumen Rápido</h3>
            <p style="color:#666;">Bienvenida al panel de control de CUPISSA. Aquí puedes gestionar todo el ecosistema de tu tienda. Los datos mostrados arriba corresponden a la actividad reciente en Supabase.</p>
        </div>
    `;

    try {
        // 1. Obtener Ventas Confirmadas
        const { data: pedidos, error: errPeds } = await window.supabase.from('pedidos').select('total, estado_pago, estado');
        if (!errPeds && pedidos) {
            const ventasTotales = pedidos
                .filter(p => p.estado_pago === 'CONFIRMADO')
                .reduce((sum, p) => sum + Number(p.total || 0), 0);
            
            const pendientes = pedidos.filter(p => p.estado < 5).length; // Menos de 5 es que no se ha entregado

            document.getElementById('dash-ventas').textContent = `$${ventasTotales.toLocaleString('es-CO')}`;
            document.getElementById('dash-pedidos-pendientes').textContent = pendientes;
        }

        // 2. Obtener Usuarios Totales
        const { count, error: errUsu } = await window.supabase.from('usuarios').select('*', { count: 'exact', head: true });
        if (!errUsu) {
            document.getElementById('dash-usuarios-nuevos').textContent = count;
        }

    } catch (e) {
        console.error("Error cargando Dashboard:", e);
        document.getElementById('dash-ventas').textContent = "Error";
    }
};