type MemoryCache<T> = {
  get: (key: string) => T | null;
  set: (key: string, value: T) => void;
  clear: () => void;
};

const registeredCaches = new Set<MemoryCache<unknown>>();

/**
 * Cache in-memory satu entri (per tab browser) untuk pola stale-while-revalidate:
 * data terakhir langsung tampil saat pengguna kembali ke halaman list, lalu
 * diperbarui senyap di latar. Key wajib memuat identitas user supaya data
 * akun lain tidak pernah terbaca.
 */
export function createMemoryCache<T>(): MemoryCache<T> {
  let entry: { key: string; value: T } | null = null;

  const cache: MemoryCache<T> = {
    get: (key) => (entry && entry.key === key ? entry.value : null),
    set: (key, value) => {
      entry = { key, value };
    },
    clear: () => {
      entry = null;
    },
  };

  registeredCaches.add(cache as MemoryCache<unknown>);
  return cache;
}

/** Dipanggil saat logout / sesi berakhir agar data sensitif tidak tertinggal di memori. */
export function clearPortalCaches() {
  registeredCaches.forEach((cache) => cache.clear());
}
