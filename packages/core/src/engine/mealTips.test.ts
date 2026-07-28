import { describe, expect, it } from "vitest";
import { pickDailyTip } from "./mealTips.js";
import type { MealTip } from "./types.js";

function makeTip(overrides: Partial<MealTip>): MealTip {
  return { id: "tip-1", owner_id: "owner-1", meal_id: "meal-1", text: "Consejo", ...overrides };
}

describe("pickDailyTip", () => {
  it("devuelve null si el meal no tiene consejos", () => {
    expect(pickDailyTip(new Map(), "meal-1", "2026-08-01")).toBeNull();
  });

  it("es estable para la misma fecha y meal", () => {
    const tips = [makeTip({ id: "a", text: "A" }), makeTip({ id: "b", text: "B" }), makeTip({ id: "c", text: "C" })];
    const byMeal = new Map([["meal-1", tips]]);
    const first = pickDailyTip(byMeal, "meal-1", "2026-08-01");
    const second = pickDailyTip(byMeal, "meal-1", "2026-08-01");
    expect(first?.id).toBe(second?.id);
  });

  it("puede variar entre fechas distintas", () => {
    const tips = [makeTip({ id: "a" }), makeTip({ id: "b" }), makeTip({ id: "c" }), makeTip({ id: "d" })];
    const byMeal = new Map([["meal-1", tips]]);
    const ids = new Set(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"].map(
        (date) => pickDailyTip(byMeal, "meal-1", date)?.id,
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });
});
