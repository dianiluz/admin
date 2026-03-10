window.renderDashboard = function() {
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
        <div class="grid-dashboard">
            <div class="card">
                <h3>Ventas Hoy</h3>
                <p style="font-size: 28px; font-weight: 600; color: var(--color-primario); margin-top: 10px;">$0</p>
            </div>
            <div class="card">
                <h3>Pedidos Producción</h3>
                <p style="font-size: 28px; font-weight: 600; margin-top: 10px;">0</p>
            </div>
            <div class="card">
                <h3>CupiCoins Emitidas</h3>
                <p style="font-size: 28px; font-weight: 600; margin-top: 10px;">0</p>
            </div>
        </div>
    `;
};