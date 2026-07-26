"use client";

import { IconFridge, IconReceipt2, IconShoppingCart } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", Icon: IconReceipt2 },
  { href: "/inventory", label: "Inventario", Icon: IconFridge },
  { href: "/shopping", label: "Compra", Icon: IconShoppingCart },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tabbar-item" data-active={pathname === href}>
          <Icon className="tabbar-icon" size={22} stroke={1.75} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
