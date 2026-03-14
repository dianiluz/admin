// Cambiar esta versión obliga a todas las apps instaladas a actualizarse
const CACHE_NAME = 'cupissa-admin-v3'; 

self.addEventListener('install', (e) => {
    // Ya NO forzamos el skipWaiting aquí para que no interrumpa al usuario mientras trabaja.
    // Esperaremos a que el usuario le dé "Sí" al botón de actualizar.
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    // Borra toda la basura vieja
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // 1. IGNORAR BACKEND Y BASE DE DATOS (Supabase y Apps Script)
    if (e.request.url.includes('supabase.co') || 
        e.request.url.includes('script.google.com') || 
        e.request.method !== 'GET') {
        return; 
    }

    // 2. ESTRATEGIA "RED PRIMERO" (Network First)
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Si hay internet, guardamos la copia nueva silenciosamente
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // Si no hay internet, mostramos lo que tengamos guardado
                return caches.match(e.request);
            })
    );
});

// 3. RECIBE LA ORDEN DE ACTUALIZAR
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting(); // Ahora sí, instala la nueva versión de golpe
    }
});