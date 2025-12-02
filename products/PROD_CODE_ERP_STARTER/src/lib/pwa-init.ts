/**
 * PWA Initialization
 * Registers service worker and handles install prompt
 */

export function initPWA() {
  if (typeof window === 'undefined') return;

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        console.log('[PWA] Service Worker registered:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available! Please refresh.');
                
                // Optionally show a notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Weathercraft Update', {
                    body: 'A new version is available. Refresh to update.',
                    icon: '/icon-192.png',
                  });
                }
              }
            });
          }
        });

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    });
  }

  // Handle install prompt
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    console.log('[PWA] Install prompt available');

    // Show custom install button (you can implement this in your UI)
    const installButton = document.getElementById('install-pwa-button');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] Install outcome:', outcome);
          
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });
    }
  });

  // Track install success
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
  });

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('[PWA] Notification permission:', permission);
    });
  }

  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return (registration as any).sync.register('sync-inspections');
    }).then(() => {
      console.log('[PWA] Background sync registered');
    }).catch((error) => {
      console.error('[PWA] Background sync registration failed:', error);
    });
  }
}

// Show install prompt
export function showInstallPrompt() {
  const event = new Event('beforeinstallprompt');
  window.dispatchEvent(event);
}

// Check if app is installed
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Send test notification
export function sendTestNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
    } as NotificationOptions);
  }
}
