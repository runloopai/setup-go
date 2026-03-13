export enum State {
  CachePrimaryKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_RESULT',
  BuildCachePrimaryKey = 'BUILD_CACHE_KEY',
  BuildCacheMatchedKey = 'BUILD_CACHE_RESULT'
}

export enum Outputs {
  CacheHit = 'cache-hit',
  BuildCacheHit = 'build-cache-hit'
}
