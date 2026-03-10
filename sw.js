// Cambiar la versión obliga a las apps instaladas a actualizarse
const CACHE_NAME = 'cupissa-admin-v2'; 

// INSTALACIÓN: Obliga a la app a tomar el nuevo código inmediatamente
self.addEventListener('install', (e) => {
    self.skipWaiting(); 
});

// ACTIVACIÓN: Borra la memoria caché vieja y corrupta
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// INTERCEPTOR (ESTRATEGIA: NETWORK FIRST)
self.addEventListener('fetch', (e) => {
    // 1. IGNORAR POR COMPLETO EL BACKEND (Dejar pasar libremente)
    if (e.request.url.includes('script.google.com') || 
        e.request.url.includes('script.googleusercontent.com') || 
        e.request.method === 'POST') {
        return; // La app no se mete aquí, deja que internet haga su trabajo
    }

    // 2. ESTRATEGIA "RED PRIMERO" PARA TUS ARCHIVOS JS, CSS y HTML
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Si hay conexión, trae el archivo fresco y actualiza la memoria de la App
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // SOLO si el usuario está sin internet (offline), muestra la copia guardada
                return caches.match(e.request);
            })
    );
});