import { signOut } from "../login/actions";
import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-title">comida-diaria</p>
        <form action={signOut}>
          <button type="submit" className="icon-btn">
            Salir
          </button>
        </form>
      </header>
      {children}
      <TabBar />
    </div>
  );
}
