// public/sw.js
/* eslint-disable no-restricted-globals */

// Esta linha diz ao VS Code para usar as definições de Service Worker
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

sw.addEventListener('push', (event) => {
    if (!event.data) {
        console.warn('[SW] Evento de push recebido sem dados.');
        return;
    }

    try {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/logo192.png',
            badge: '/badge.png', // Ícone pequeno que aparece na barra de status
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/' // Guarda o URL para abrir ao clicar
            }
        };

        event.waitUntil(
            sw.registration.showNotification(data.title, options)
        );
    } catch (err) {
        console.error('[SW] Erro ao processar notificação push:', err);
    }
});

sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Lógica para abrir o browser no site correto ao clicar na notificação
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow(event.notification.data.url);
        })
    );
});