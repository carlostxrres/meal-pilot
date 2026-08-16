"use client";

import { IconApple } from "@tabler/icons-react";
import { MorphIcon } from "morphicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RECEIPT_DETAILED,
  RECEIPT_SIMPLE,
  TOOLS_KITCHEN_DETAILED,
  TOOLS_KITCHEN_SIMPLE,
} from "./tabbar-morph-paths";

// Two of the three tabs morph between a simple (resting) and detailed
// (active) Tabler outline glyph. "Ingredientes" stays a static icon:
// Tabler has no comparable detailed variant of IconApple to morph into.
const MORPH_TABS = [
  { href: "/", label: "Hoy", simple: RECEIPT_SIMPLE, detailed: RECEIPT_DETAILED },
  { href: "/dishes", label: "Platos", simple: TOOLS_KITCHEN_SIMPLE, detailed: TOOLS_KITCHEN_DETAILED },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {MORPH_TABS.map(({ href, label, simple, detailed }) => {
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
      <Link href="/ingredients" className="tabbar-item" data-active={pathname === "/ingredients"}>
        <IconApple className="tabbar-icon" size={18} stroke={1.75} aria-hidden="true" />
        Ingredientes
      </Link>
    </nav>
  );
}
