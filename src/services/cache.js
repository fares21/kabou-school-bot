import NodeCache from 'node-cache';
import { logger } from './logger.js';
import { CACHE_TTL } from '../config/constants.js';

const cache = new NodeCache({ 
  stdTTL: CACHE_TTL,
  checkperiod: 120,
  useClones: false
});

export const AppCache = {
  get(key) {
    return cache.get(key);
  },
  
  set(key, value, ttl = CACHE_TTL) {
    return cache.set(key, value, ttl);
  },
  
  del(key) {
    return cache.del(key);
  },
  
  flush() {
    return cache.flushAll();
  },
  
  async refresh(key, producer) {
    try {
      const value = await producer();
      cache.set(key, value);
      logger.info({ key }, 'Cache refreshed successfully');
      return value;
    } catch (error) {
      logger.error({ key, error: error.message }, 'Cache refresh failed');
      throw error;
    }
  },
  
  stats() {
    return cache.getStats();
  }
};
