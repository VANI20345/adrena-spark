import { toast } from 'sonner';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  etag?: string;
}

interface CacheConfig {
  defaultExpiry: number; // milliseconds
  maxSize: number; // maximum number of entries
  storageType: 'memory' | 'localStorage' | 'indexedDB';
}

export class OfflineCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private dbName = 'adrena_cache';
  private dbVersion = 1;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultExpiry: 30 * 60 * 1000, // 30 minutes
      maxSize: 1000,
      storageType: 'indexedDB',
      ...config
    };
  }

  // Get cached data with automatic expiry check
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.getEntry<T>(key);
      if (!entry) return null;

      // Check if expired
      if (Date.now() > entry.expiry) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set data in cache with optional custom expiry
  async set<T>(key: string, data: T, customExpiry?: number): Promise<void> {
    try {
      const expiry = Date.now() + (customExpiry || this.config.defaultExpiry);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry,
        etag: this.generateETag(data)
      };

      await this.setEntry(key, entry);
      
      // Cleanup old entries if cache is full
      if (this.config.storageType === 'memory') {
        await this.cleanup();
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Check if data is cached and valid
  async has(key: string): Promise<boolean> {
    const entry = await this.getEntry(key);
    return entry !== null && Date.now() <= entry.expiry;
  }

  // Delete specific cache entry
  async delete(key: string): Promise<void> {
    try {
      switch (this.config.storageType) {
        case 'memory':
          this.memoryCache.delete(key);
          break;
        case 'localStorage':
          localStorage.removeItem(`cache_${key}`);
          break;
        case 'indexedDB':
          await this.deleteFromIndexedDB(key);
          break;
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      switch (this.config.storageType) {
        case 'memory':
          this.memoryCache.clear();
          break;
        case 'localStorage':
          const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
          keys.forEach(key => localStorage.removeItem(key));
          break;
        case 'indexedDB':
          await this.clearIndexedDB();
          break;
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    size: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: number;
  }> {
    try {
      const entries = await this.getAllEntries();
      const now = Date.now();
      
      return {
        size: entries.length,
        totalSize: this.calculateTotalSize(entries),
        hitRate: await this.getHitRate(),
        oldestEntry: Math.min(...entries.map(e => e.timestamp))
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { size: 0, totalSize: 0, hitRate: 0, oldestEntry: 0 };
    }
  }

  // Cache with network fallback for API calls
  async cacheFirst<T>(
    key: string,
    networkFetch: () => Promise<T>,
    customExpiry?: number
  ): Promise<T> {
    try {
      // Try cache first
      const cached = await this.get<T>(key);
      if (cached) {
        return cached;
      }

      // Fallback to network
      const fresh = await networkFetch();
      await this.set(key, fresh, customExpiry);
      return fresh;
    } catch (error) {
      // If network fails, try stale cache
      const stale = await this.getStale<T>(key);
      if (stale) {
        toast.warning('عرض البيانات المحفوظة - لا يوجد اتصال بالإنترنت');
        return stale;
      }
      throw error;
    }
  }

  // Network first with cache fallback
  async networkFirst<T>(
    key: string,
    networkFetch: () => Promise<T>,
    customExpiry?: number
  ): Promise<T> {
    try {
      // Try network first
      const fresh = await networkFetch();
      await this.set(key, fresh, customExpiry);
      return fresh;
    } catch (error) {
      // Fallback to cache
      const cached = await this.get<T>(key);
      if (cached) {
        toast.warning('عرض البيانات المحفوظة - فشل في تحديث البيانات');
        return cached;
      }
      throw error;
    }
  }

  // Private methods
  private async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    switch (this.config.storageType) {
      case 'memory':
        return this.memoryCache.get(key) || null;
      case 'localStorage':
        const item = localStorage.getItem(`cache_${key}`);
        return item ? JSON.parse(item) : null;
      case 'indexedDB':
        return await this.getFromIndexedDB<T>(key);
      default:
        return null;
    }
  }

  private async setEntry<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    switch (this.config.storageType) {
      case 'memory':
        this.memoryCache.set(key, entry);
        break;
      case 'localStorage':
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        break;
      case 'indexedDB':
        await this.setInIndexedDB(key, entry);
        break;
    }
  }

  private async getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private async setInIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const putRequest = store.put({ key, ...entry });
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const deleteRequest = store.delete(key);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };
    });
  }

  private generateETag(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private async getStale<T>(key: string): Promise<T | null> {
    const entry = await this.getEntry<T>(key);
    return entry ? entry.data : null;
  }

  private async getAllEntries(): Promise<CacheEntry<any>[]> {
    switch (this.config.storageType) {
      case 'memory':
        return Array.from(this.memoryCache.values());
      case 'localStorage':
        const entries: CacheEntry<any>[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_')) {
            const item = localStorage.getItem(key);
            if (item) entries.push(JSON.parse(item));
          }
        }
        return entries;
      case 'indexedDB':
        return await this.getAllFromIndexedDB();
      default:
        return [];
    }
  }

  private async getAllFromIndexedDB(): Promise<CacheEntry<any>[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  private calculateTotalSize(entries: CacheEntry<any>[]): number {
    return entries.reduce((total, entry) => {
      return total + JSON.stringify(entry.data).length;
    }, 0);
  }

  private async getHitRate(): Promise<number> {
    // This would require tracking hits/misses - simplified for now
    return 0.8; // 80% default
  }

  private async cleanup(): Promise<void> {
    if (this.memoryCache.size <= this.config.maxSize) return;
    
    // Remove expired entries first
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this.memoryCache.size > this.config.maxSize) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.memoryCache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }
}

// Export singleton instance
export const cacheService = new OfflineCacheService({
  defaultExpiry: 30 * 60 * 1000, // 30 minutes
  maxSize: 1000,
  storageType: 'indexedDB'
});

// Cache keys constants
export const CACHE_KEYS = {
  EVENTS: 'events',
  USER_PROFILE: 'user_profile',
  CATEGORIES: 'categories',
  SERVICES: 'services',
  NOTIFICATIONS: 'notifications',
  DASHBOARD_STATS: 'dashboard_stats',
  EVENT_DETAILS: (id: string) => `event_${id}`,
  SERVICE_DETAILS: (id: string) => `service_${id}`,
  USER_EVENTS: (userId: string) => `user_events_${userId}`,
  SEARCH_RESULTS: (query: string) => `search_${query}`,
} as const;