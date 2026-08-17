"use client";

import { MorphIcon } from "morphicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CATEGORY_DETAILED,
  CATEGORY_SIMPLE,
  RECEIPT_DETAILED,
  RECEIPT_SIMPLE,
  TOOLS_KITCHEN_DETAILED,
  TOOLS_KITCHEN_SIMPLE,
} from "./tabbar-morph-paths";

// Each tab morphs between a simple (resting) and detailed (active) Tabler
// outline glyph on selection, instead of only changing color.
const TABS = [
  { href: "/", label: "Hoy", simple: RECEIPT_SIMPLE, detailed: RECEIPT_DETAILED },
  { href: "/dishes", label: "Platos", simple: TOOLS_KITCHEN_SIMPLE, detailed: TOOLS_KITCHEN_DETAILED },
  { href: "/ingredients", label: "Ingredientes", simple: CATEGORY_SIMPLE, detailed: CATEGORY_DETAILED },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, simple, detailed }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className="tabbar-item" data-active={active}>
            <MorphIcon
              icon={active ? detailed : simple}
              spring="snappy"
              reducedMotion="user"
              className="tabbar-icon"
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
