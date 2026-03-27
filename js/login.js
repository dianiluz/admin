// js/login.js
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const supabaseClient = window.supabase.createClient(CUPISSA_CONFIG.supabase.url, CUPISSA_CONFIG.supabase.key);

    const btn = document.getElementById('btn-submit');
    const errorDiv = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.textContent = "Verificando credenciales...";
    btn.disabled = true;
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        // 1. VALIDACIÓN DE CONTRASEÑA EN SUPABASE AUTH
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (authError) throw authError;

        btn.textContent = "Obteniendo permisos...";

        // 2. BÚSQUEDA DEL ROL EXACTO Y ESTADO EN LAS TABLAS REALES
        let rolFinal = "CLIENTE";
        let nombreFinal = authData.user.user_metadata?.nombre || "Usuario";
        let accesoPermitido = false;

        // Primero buscamos en la tabla de STAFF (Equipo)
        const { data: equipoData, error: errEq } = await supabaseClient.from('equipo').select('*').eq('email', email).maybeSingle();
        
        if (equipoData) {
            if (equipoData.estado === false) throw new Error("Tu cuenta de colaborador está suspendida. Contacta a RRHH.");
            rolFinal = equipoData.rol || "EMPLEADO";
            nombreFinal = equipoData.nombre;
            accesoPermitido = true;
        } else {
            // Si no es del Staff, buscamos en el directorio de CLIENTES
            const { data: clienteData, error: errCli } = await supabaseClient.from('clientes').select('*').eq('email', email).maybeSingle();
            
            if (clienteData) {
                if (clienteData.acepta_politicas === false) throw new Error("Tu cuenta está inactiva o pendiente de verificación.");
                rolFinal = clienteData.nivel_cuenta || "CLIENTE";
                nombreFinal = clienteData.nombre;
                accesoPermitido = true; 
            } else {
                // Fallback de seguridad por si es la cuenta maestra fundadora y aún no está en las tablas
                if (email === "contacto@cupissa.com" || email === "admin@cupissa.com" || email === "dianiluz@cupissa.com") {
                     rolFinal = "ADMIN";
                     accesoPermitido = true;
                } else {
                     throw new Error("Tu correo no tiene un perfil asignado en el directorio de Cupissa.");
                }
            }
        }

        if (!accesoPermitido) throw new Error("No tienes autorización para acceder a este portal.");

        // 3. GUARDAR SESIÓN CON EL ROL REAL (Para que el panel-admin.js oculte los botones que no le tocan)
        const sesionData = {
            email: authData.user.email,
            nombre: nombreFinal,
            rol: rolFinal,
            timestamp: new Date().getTime()
        };

        localStorage.setItem('cupissa_admin_session', JSON.stringify(sesionData));
        
        window.mostrarToast ? window.mostrarToast("Acceso concedido", "exito") : null;
        
        // Redirigir al ERP
        window.location.replace('index.html');

    } catch (err) {
        console.error("Error Login:", err);
        if (errorDiv) {
            let mensajeError = err.message;
            if (mensajeError === "Invalid login credentials") mensajeError = "Correo o contraseña incorrectos.";
            
            errorDiv.textContent = "Acceso Denegado: " + mensajeError;
            errorDiv.style.display = 'block';
        }
        btn.textContent = "Iniciar Sesión";
        btn.disabled = false;
    }
});