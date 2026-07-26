/**
 * PRNG determinista sembrado por fecha (mulberry32): misma fecha -> misma
 * secuencia de números, para que `npm run generate` sea reproducible el
 * mismo día y pueda variar de un día a otro. No es criptográfico ni falta
 * que lo sea, solo se usa para desempatar candidatos igual de válidos.
 */
export function createSeededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function next(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Elige un elemento al azar de una lista no vacía usando el PRNG dado. */
export function pickRandom<T>(items: readonly T[], rand: () => number): T {
  if (items.length === 0) {
    throw new Error("pickRandom: la lista de candidatos está vacía");
  }
  const index = Math.floor(rand() * items.length);
  return items[Math.min(index, items.length - 1)] as T;
}
