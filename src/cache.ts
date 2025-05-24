/**
 * Simple caching strategies for screenshot results
 */

import type { ScreenshotResult, ScreenshotOptions } from './types.js';

export interface CacheEntry {
  /** Cached screenshot result */
  result: ScreenshotResult;
  /** Timestamp when cached */
  timestamp: number;
  /** Expiration time (if set) */
  expiresAt?: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: number;
}

export interface CacheOptions {
  /** Maximum number of entries to store */
  maxSize?: number;
  /** Default TTL in milliseconds */
  ttl?: number;
  /** Enable LRU eviction */
  enableLRU?: boolean;
}

export class ScreenshotCache {
  private cache = new Map<string, CacheEntry>();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      enableLRU: options.enableLRU ?? true
    };
  }

  /**
   * Generate a cache key from screenshot options
   */
  private generateKey(options: ScreenshotOptions): string {
    const keyParts = [
      options.url,
      options.width?.toString() ?? 'default',
      options.height?.toString() ?? 'default',
      options.format ?? 'default',
      options.quality?.toString() ?? 'default',
      options.waitForNetworkIdle?.toString() ?? 'default',
      options.selector ?? 'no-selector'
    ];
    return keyParts.join('|');
  }

  /**
   * Get cached screenshot result
   */
  get(options: ScreenshotOptions): ScreenshotResult | null {
    const key = this.generateKey(options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.result;
  }

  /**
   * Store screenshot result in cache
   */
  set(options: ScreenshotOptions, result: ScreenshotResult): void {
    const key = this.generateKey(options);
    const now = Date.now();

    const entry: CacheEntry = {
      result,
      timestamp: now,
      expiresAt: now + this.options.ttl,
      accessCount: 0,
      lastAccessed: now
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize) {
      this.evictEntry();
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if a screenshot is cached
   */
  has(options: ScreenshotOptions): boolean {
    const key = this.generateKey(options);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove specific entry from cache
   */
  delete(options: ScreenshotOptions): boolean {
    const key = this.generateKey(options);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const expired = entries.filter(e => e.expiresAt && now > e.expiresAt).length;

    return {
      totalEntries: this.cache.size,
      maxSize: this.options.maxSize,
      expiredEntries: expired,
      averageAge: entries.length > 0 ?
        entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length : 0,
      totalAccesses: entries.reduce((sum, e) => sum + e.accessCount, 0),
      hitRatio: this.calculateHitRatio()
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictEntry(): void {
    if (this.cache.size === 0) return;

    if (this.options.enableLRU) {
      // Find least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    } else {
      // Simply remove the first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Calculate cache hit ratio (simplified - would need request tracking for accurate measurement)
   */
  private calculateHitRatio(): number {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const totalEntries = entries.length;

    if (totalEntries === 0) return 0;
    return totalAccesses / (totalAccesses + totalEntries); // Simplified calculation
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }
}

/**
 * Create a screenshot cache instance
 */
export function createScreenshotCache(options?: CacheOptions): ScreenshotCache {
  return new ScreenshotCache(options);
}
