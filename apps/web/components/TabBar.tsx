"use client";

import { IconApple, IconFridge, IconReceipt2, IconShoppingCart, IconToolsKitchen2 } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", Icon: IconReceipt2 },
  { href: "/inventory", label: "Inventario", Icon: IconFridge },
  { href: "/shopping", label: "Compra", Icon: IconShoppingCart },
  { href: "/dishes", label: "Platos", Icon: IconToolsKitchen2 },
  { href: "/ingredients", label: "Ingredientes", Icon: IconApple },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tabbar-item" data-active={pathname === href}>
          <Icon className="tabbar-icon" size={18} stroke={1.75} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
