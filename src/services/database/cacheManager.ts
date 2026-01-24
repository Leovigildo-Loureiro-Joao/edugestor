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
  set(key: string, data: any, ttl?: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Auto-expiração
    setTimeout(() => {
      this.delete(key);
    }, ttl || this.DEFAULT_TTL);

    // Também salvar no localStorage para persistência
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('LocalStorage cheio, cache apenas em memória');
    }

    console.log(`💾 Cache salvo: ${key}`);
  }

  // 🔹 GET: Buscar dados do cache
  get(key: string, maxAge?: number): any | null {
    // 1. Tentar memória RAM primeiro (mais rápido)
    const memoryCache = this.cache.get(key);
    if (memoryCache && this.isValid(memoryCache.timestamp, maxAge)) {
      console.log(`⚡ Cache HIT (RAM): ${key}`);
      return memoryCache.data;
    }

    // 2. Tentar localStorage (persistente)
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (this.isValid(timestamp, maxAge)) {
          // Atualizar cache RAM
          this.cache.set(key, { data, timestamp });
          console.log(`💿 Cache HIT (Storage): ${key}`);
          return data;
        }
      }
    } catch (e) {
      // Storage cheio ou problema
    }

    console.log(`❌ Cache MISS: ${key}`);
    return null;
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