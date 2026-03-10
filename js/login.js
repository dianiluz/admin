document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-submit');
    const errorDiv = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.textContent = "Verificando credenciales...";
    btn.disabled = true;
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(CUPISSA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', email: email, password: password })
        });

        const data = await response.json();

        if (data.success) {
            // Verificamos que el usuario tenga un rol permitido para el Panel Admin
            const rolesPermitidos = ['ADMIN', 'EMPLEADO', 'ASESOR'];
            
            if (rolesPermitidos.includes(data.tipo_usuario)) {
                // Guardamos la sesión en el navegador
                localStorage.setItem('cupissa_admin_session', JSON.stringify({
                    email: data.email,
                    nombre: data.nombre,
                    rol: data.tipo_usuario,
                    timestamp: new Date().getTime()
                }));
                
                // Redirigimos al panel
                window.location.href = 'index.html';
            } else {
                errorDiv.textContent = "Acceso denegado. Tu cuenta de CLIENTE no tiene permisos para ingresar a este panel.";
                errorDiv.style.display = 'block';
                btn.textContent = "Iniciar Sesión";
                btn.disabled = false;
            }
        } else {
            errorDiv.textContent = data.error || "Correo o contraseña incorrectos.";
            errorDiv.style.display = 'block';
            btn.textContent = "Iniciar Sesión";
            btn.disabled = false;
        }
    } catch (err) {
        errorDiv.textContent = "Error de conexión con el servidor de Cupissa.";
        errorDiv.style.display = 'block';
        btn.textContent = "Iniciar Sesión";
        btn.disabled = false;
    }
});