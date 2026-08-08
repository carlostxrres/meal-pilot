import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatLocalDate, upcomingDates } from "./multiDay.js";

// Europe/Madrid es donde corre la app en producción (ver ADR-0019). Fijamos
// el TZ del proceso para que el test sea determinista sin depender del huso
// horario de quien lo ejecute, y lo restauramos para no filtrar el cambio a
// otros ficheros de test que compartan el mismo worker de vitest.
describe("formatLocalDate / upcomingDates (huso horario)", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "Europe/Madrid";
  });

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("formatLocalDate usa el día de calendario local, no el de toISOString() en UTC", () => {
    // 15 ene 2026, 23:30 UTC = 16 ene 2026, 00:30 en Europe/Madrid (CET, UTC+1).
    const instant = new Date(Date.UTC(2026, 0, 15, 23, 30));
    expect(instant.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(formatLocalDate(instant)).toBe("2026-01-16");
  });

  it("upcomingDates no retrocede un día cuando 'ahora' cae justo tras medianoche local", () => {
    // 31 dic 2025, 23:30 UTC = 1 ene 2026, 00:30 en Europe/Madrid.
    const justAfterMidnightLocal = new Date(Date.UTC(2025, 11, 31, 23, 30));
    expect(upcomingDates(3, justAfterMidnightLocal)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("upcomingDates devuelve días consecutivos en el caso normal (lejos de medianoche)", () => {
    const midday = new Date(Date.UTC(2026, 5, 10, 12, 0));
    expect(upcomingDates(3, midday)).toEqual(["2026-06-10", "2026-06-11", "2026-06-12"]);
  });
});
