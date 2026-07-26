import { IconLogout } from "@tabler/icons-react";
import { signOut } from "../login/actions";
import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-title">Meal Pilot</p>
        <form action={signOut}>
          <button type="submit" className="icon-btn" aria-label="Salir">
            <IconLogout size={18} stroke={1.75} />
          </button>
        </form>
      </header>
      {children}
      <TabBar />
    </div>
  );
}
