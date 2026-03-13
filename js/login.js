// js/login.js
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // USAMOS LA CONEXIÓN GLOBAL
    const supabaseClient = window.supabase.createClient(CUPISSA_CONFIG.supabase.url, CUPISSA_CONFIG.supabase.key);

    const btn = document.getElementById('btn-submit');
    const errorDiv = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.textContent = "Verificando...";
    btn.disabled = true;

    try {
        // AQUÍ USAMOS supabaseClient
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        // ... el resto de tu código de login sigue igual ...

        if (error) throw error;

        // --- 2. VALIDACIÓN DE ROL (Opcional) ---
        // Por ahora, si el login es exitoso en Supabase, asumimos que eres tú.
        // Más adelante podemos crear una tabla 'perfiles' si tienes empleados.
        
        const sesionData = {
            email: data.user.email,
            nombre: data.user.user_metadata?.nombre || "Administradora Cupissa",
            rol: "ADMIN",
            timestamp: new Date().getTime()
        };

        // --- 3. GUARDAR SESIÓN Y ENTRAR ---
        localStorage.setItem('cupissa_admin_session', JSON.stringify(sesionData));
        window.location.replace('index.html');

    } catch (err) {
        console.error("Error Login:", err);
        if (errorDiv) {
            errorDiv.textContent = "Acceso Denegado: " + (err.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : err.message);
            errorDiv.style.display = 'block';
        }
        btn.textContent = "Iniciar Sesión";
        btn.disabled = false;
    }
});