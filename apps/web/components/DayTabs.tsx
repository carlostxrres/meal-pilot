"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { DayProposal } from "@meal-pilot/core";
import { DayProposalView } from "./DayProposalView";

export interface DayTabData {
  date: string;
  label: string;
  proposal: DayProposal;
  confirmedMealIds: Set<string>;
  isToday: boolean;
}

export function DayTabs({ days }: { days: DayTabData[] }) {
  if (days.length === 1) {
    const only = days[0]!;
    return (
      <DayProposalView
        proposal={only.proposal}
        label={only.label}
        confirmedMealIds={only.confirmedMealIds}
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
            label={day.label}
            confirmedMealIds={day.confirmedMealIds}
            isToday={day.isToday}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
