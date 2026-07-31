"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { DayProposal, DietaryRequirement, MealTip } from "@meal-pilot/core";
import { DayProposalView } from "./DayProposalView";

export interface DayTabData {
  date: string;
  label: string;
  proposal: DayProposal;
  confirmedMealIds: Set<string>;
  isToday: boolean;
}

export function DayTabs({
  days,
  tipsByMeal,
  mealRequirements,
}: {
  days: DayTabData[];
  tipsByMeal: ReadonlyMap<string, MealTip[]>;
  mealRequirements: DietaryRequirement[];
}) {
  if (days.length === 1) {
    const only = days[0]!;
    return (
      <DayProposalView
        proposal={only.proposal}
        confirmedMealIds={only.confirmedMealIds}
        tipsByMeal={tipsByMeal}
        mealRequirements={mealRequirements}
        isToday={only.isToday}
      />
    );
  }

  return (
    <Tabs.Root defaultValue={days[0]!.date} className="day-tabs">
      <Tabs.List className="day-tabs-list">
        {days.map((day) => (
          <Tabs.Trigger key={day.date} value={day.date} className="day-tabs-trigger">
            {day.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {days.map((day) => (
        <Tabs.Content key={day.date} value={day.date}>
          <DayProposalView
            proposal={day.proposal}
            confirmedMealIds={day.confirmedMealIds}
            tipsByMeal={tipsByMeal}
            mealRequirements={mealRequirements}
            isToday={day.isToday}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
