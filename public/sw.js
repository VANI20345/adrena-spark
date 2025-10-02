// Enhanced Service Worker for PWA functionality
const CACHE_NAME = 'adrena-adventures-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/',
];

// API patterns to cache
const API_CACHE_PATTERNS = [
  'https://nzuppbjtxmfrgutyagev.supabase.co/rest/v1/events',
  'https://nzuppbjtxmfrgutyagev.supabase.co/rest/v1/services',
  'https://nzuppbjtxmfrgutyagev.supabase.co/rest/v1/categories',
];

// Background sync queue for failed requests
let failedRequests = [];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS.map(url => 
          new Request(url, { cache: 'reload' })
        ));
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Serve cached page or offline fallback
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests
  if (isAPIRequest(request.url)) {
    event.respondWith(
      handleAPIRequest(request)
    );
    return;
  }

  // Handle static assets
  if (request.destination === 'image' || request.destination === 'script' || 
      request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Message handling for cache updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.payload);
      })
    );
  }
});

// Helper functions
function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful GET requests
      if (request.method === 'GET') {
        const responseClone = response.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, responseClone);
      }
      return response;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST requests (bookings), queue for background sync
    if (request.method === 'POST') {
      queueFailedRequest(request);
      
      // Return a synthetic response
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Request queued for when online',
          queued: true 
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

function queueFailedRequest(request) {
  request.clone().json().then(body => {
    failedRequests.push({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body: body,
      timestamp: Date.now()
    });
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register('background-sync');
    }
  });
}

async function syncFailedRequests() {
  console.log('Syncing failed requests:', failedRequests.length);
  
  const requestsToRetry = [...failedRequests];
  failedRequests = [];
  
  for (const requestData of requestsToRetry) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: JSON.stringify(requestData.body)
      });
      
      if (response.ok) {
        console.log('Successfully synced request:', requestData.url);
        
        // Notify clients of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            data: requestData
          });
        });
      } else {
        // Re-queue if still failing
        failedRequests.push(requestData);
      }
    } catch (error) {
      console.error('Failed to sync request:', error);
      // Re-queue failed request
      failedRequests.push(requestData);
    }
  }
}