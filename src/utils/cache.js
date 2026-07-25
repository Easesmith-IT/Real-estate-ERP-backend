const cacheStore = new Map();

const now = () => Date.now();

const remember = (key, ttlMs, producer) => {
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  const value = producer();
  cacheStore.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });

  return value;
};

const clearByPrefix = (prefix) => {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

module.exports = {
  remember,
  clearByPrefix,
};
