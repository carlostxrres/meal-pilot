import { describe, expect, it } from "vitest";
import { createSeededRandom, pickRandom } from "./random.js";

describe("createSeededRandom", () => {
  it("misma semilla produce siempre la misma secuencia", () => {
    const rand1 = createSeededRandom("2026-08-01");
    const rand2 = createSeededRandom("2026-08-01");
    const seq1 = Array.from({ length: 5 }, () => rand1());
    const seq2 = Array.from({ length: 5 }, () => rand2());
    expect(seq1).toEqual(seq2);
  });

  it("semillas distintas producen secuencias distintas", () => {
    const rand1 = createSeededRandom("2026-08-01");
    const rand2 = createSeededRandom("2026-08-02");
    expect(rand1()).not.toBe(rand2());
  });

  it("los valores caen siempre en [0, 1)", () => {
    const rand = createSeededRandom("test");
    for (let i = 0; i < 50; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pickRandom", () => {
  it("lanza si la lista está vacía", () => {
    expect(() => pickRandom([], () => 0)).toThrow();
  });

  it("elige un elemento de la lista", () => {
    const rand = createSeededRandom("seed");
    const item = pickRandom(["a", "b", "c"], rand);
    expect(["a", "b", "c"]).toContain(item);
  });
});
