// services/cache/CacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
      CacheManager.instance.compactStorage();
    }
    return CacheManager.instance;
  }

  // 🔹 SET: Guardar dados no cache
   getLatest(baseKey: string): any {
    const keys = this.getCacheKeys()
      .filter(key => key.startsWith(`${baseKey}_`))
      .sort((a, b) => {
        // Ordenar por timestamp ou versão mais recente
        return b.localeCompare(a);
      });
    
    if (keys.length > 0) {
      return this.get(keys[0]);
    }
    return null;
  }
  
  // Adicionar TTL (Time To Live)
  set(key: string, value: any, options?: { ttl?: number, version?: string }) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl: options?.ttl,
      version: options?.version
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      // Em caso de quota, remove caches antigos e tenta novamente.
      this.pruneOldestCacheEntries(20);
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch {
        console.warn(`⚠️ Falha ao persistir cache para a chave ${key}`);
      }
    }
  }
  
  get(key: string): any {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
      const item = JSON.parse(itemStr);
      
      // Verificar se o cache expirou
      if (item.ttl && (Date.now() - item.timestamp > item.ttl)) {
        this.delete(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      return null;
    }
  }

  // 🔹 DELETE: Remover do cache
  delete(key: string) {
    this.cache.delete(key);
    localStorage.removeItem(key);
    console.log(`🗑️  Cache removido: ${key}`);
  }

  // 🔹 CLEAR: Limpar todo o cache
  clear() {
    this.cache.clear();
    
    // Limpar todos os itens de cache do localStorage
    this.getCacheKeys().forEach((key) => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 Cache completamente limpo');
  }

  // 🔹 INVALIDATE: Invalidar cache baseado em padrão
  invalidate(pattern: string) {
    const regex = new RegExp(pattern);
    
    // Limpar da memória
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    
    // Limpar do localStorage
    this.getCacheKeys().forEach((key) => {
      if (regex.test(key)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log(`🔄 Cache invalidado para padrão: ${pattern}`);
  }

  // 🔹 Verificar validade
  private isValid(timestamp: number, maxAge?: number): boolean {
    const age = Date.now() - timestamp;
    return age < (maxAge || this.DEFAULT_TTL);
  }

  getStrictMode(): boolean {
    return localStorage.getItem('cache_strict_mode') === 'true';
  }
  
  setStrictMode(enabled: boolean): void {
    localStorage.setItem('cache_strict_mode', enabled.toString());
  }
  
  getCurrentVersion(keyPattern: string): string | null {
    const keys = this.getCacheKeys()
      .filter(key => key.startsWith(keyPattern))
      .sort((a, b) => b.localeCompare(a)); // Mais recente primeiro
    
    if (keys.length > 0) {
      const item = this.getWithMetadata(keys[0]);
      return item?.metadata?.version || null;
    }
    return null;
  }
  
  getWithMetadata(key: string): any {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
      return JSON.parse(itemStr);
    } catch {
      return null;
    }
  }
  
  // Método para emitir eventos (se necessário)
  emitCacheInvalidated(type: string): void {
    const event = new CustomEvent('cache-invalidated', {
      detail: { type, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  // 🔹 Status do cache
  getStats() {
    const memorySize = Array.from(this.cache.values())
      .reduce((acc, item) => acc + JSON.stringify(item.data).length, 0);
    
    const cacheKeys = this.getCacheKeys();

    const storageSize = cacheKeys
      .reduce((acc, key) => acc + (localStorage.getItem(key)?.length || 0), 0);
    
    return {
      memoryItems: this.cache.size,
      memorySize: `${(memorySize / 1024).toFixed(2)} KB`,
      storageItems: cacheKeys.length,
      storageSize: `${(storageSize / 1024).toFixed(2)} KB`
    };
  }

  private getCacheKeys(): string[] {
    const keys = Object.keys(localStorage);
    const cacheKeys: string[] = [];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const isCacheEntry = parsed && typeof parsed === 'object' &&
          'value' in parsed &&
          typeof parsed.timestamp === 'number';

        if (isCacheEntry) {
          cacheKeys.push(key);
        }
      } catch {
        // Ignorar chaves que não são JSON de cache.
      }
    }

    return cacheKeys;
  }

  private pruneOldestCacheEntries(limit = 20): void {
    const ordered = this.getCacheKeys()
      .map((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return { key, timestamp: 0 };
        try {
          const parsed = JSON.parse(raw);
          return { key, timestamp: Number(parsed?.timestamp) || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    ordered.slice(0, limit).forEach(({ key }) => localStorage.removeItem(key));
  }

  private compactStorage(): void {
    const now = Date.now();
    const cacheKeys = this.getCacheKeys();

    cacheKeys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        const ttl = Number(parsed?.ttl);
        const timestamp = Number(parsed?.timestamp) || 0;

        if (ttl > 0 && timestamp > 0 && now - timestamp > ttl) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });

    // Mantém no máximo 120 entradas de cache para reduzir risco de quota.
    const remainingKeys = this.getCacheKeys();
    if (remainingKeys.length > 120) {
      this.pruneOldestCacheEntries(remainingKeys.length - 120);
    }
  }
}

// Exportar instância global
export const cacheManager = CacheManager.getInstance();
