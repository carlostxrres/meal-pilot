import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { UserMenu } from "@/components/UserMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <Logo />
          <p className="app-title">Meal Pilot</p>
        </div>
        <UserMenu />
      </header>
      {children}
      <TabBar />
    </div>
  );
}
