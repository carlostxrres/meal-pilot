import { TabBar } from "@/components/TabBar";
import { UserMenu } from "@/components/UserMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-title">Meal Pilot</p>
        <UserMenu />
      </header>
      {children}
      <TabBar />
    </div>
  );
}
