/**
 * Service Worker Registration
 * Registers the service worker for PWA offline capability
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    console.log('[SW] Registering service worker...');

    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('[SW] Service worker registered successfully:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        console.log('[SW] New service worker available');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker installed, show update notification
            console.log('[SW] New version available, reload to update');

            // Optional: Auto-reload or show notification to user
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] Message from service worker:', event.data);

      if (event.data.type === 'CACHE_UPDATED') {
        console.log('[SW] Cache updated');
      }

      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('[SW] Background sync complete:', event.data.payload);

        // Trigger UI update
        window.dispatchEvent(new CustomEvent('sync-complete', {
          detail: event.data.payload
        }));
      }
    });

    // Request notification permission for push notifications
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    return registration;

  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker (for development/testing)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();

  if (registration) {
    const success = await registration.unregister();
    console.log('[SW] Service worker unregistered:', success);
    return success;
  }

  return false;
}

/**
 * Check if running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if app can be installed
 */
export function canInstall(): boolean {
  return typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window;
}

/**
 * Trigger manual sync
 */
export async function triggerSync(tag: string) {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    console.warn('[SW] Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log('[SW] Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[SW] Background sync registration failed:', error);
    return false;
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus() {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, tags: [] };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in ServiceWorkerRegistration.prototype) {
      const tags = await (registration as any).sync.getTags();
      return { supported: true, tags };
    }

    return { supported: false, tags: [] };
  } catch (error) {
    return { supported: false, tags: [] };
  }
}
