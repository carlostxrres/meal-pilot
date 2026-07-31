import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <h1 className="app-title">Meal Pilot</h1>
      <form action={signIn} className="login-form">
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Entrar</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
