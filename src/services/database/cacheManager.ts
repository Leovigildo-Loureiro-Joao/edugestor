// services/cache/CacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // 🔹 SET: Guardar dados no cache
   getLatest(baseKey: string): any {
    const keys = Object.keys(localStorage)
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
      this.clear();
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
    localStorage.removeItem(`cache_${key}`);
    console.log(`🗑️  Cache removido: ${key}`);
  }

  // 🔹 CLEAR: Limpar todo o cache
  clear() {
    this.cache.clear();
    
    // Limpar todos os itens de cache do localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
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
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') && regex.test(key.replace('cache_', ''))) {
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
    const keys = Object.keys(localStorage)
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
    
    const storageSize = Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .reduce((acc, key) => acc + (localStorage.getItem(key)?.length || 0), 0);
    
    return {
      memoryItems: this.cache.size,
      memorySize: `${(memorySize / 1024).toFixed(2)} KB`,
      storageItems: Object.keys(localStorage).filter(k => k.startsWith('cache_')).length,
      storageSize: `${(storageSize / 1024).toFixed(2)} KB`
    };
  }
}

// Exportar instância global
export const cacheManager = CacheManager.getInstance();