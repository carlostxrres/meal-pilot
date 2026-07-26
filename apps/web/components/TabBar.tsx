"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", icon: "🗒" },
  { href: "/inventory", label: "Inventario", icon: "🥫" },
  { href: "/shopping", label: "Compra", icon: "✓" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="tabbar-item"
          data-active={pathname === tab.href}
        >
          <span className="tabbar-icon" aria-hidden="true">
            {tab.icon}
          </span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
