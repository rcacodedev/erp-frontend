import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password, orgSlug || undefined);
      nav("/dashboard");
    } catch (e) {
      setErr(e.response?.data?.detail || "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-3 bg-white shadow p-6 rounded-2xl"
      >
        <h1 className="text-xl font-semibold">Entrar</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Org (slug, opcional)"
          value={orgSlug}
          onChange={(e) => setOrgSlug(e.target.value)}
        />
        <button className="w-full py-2 rounded bg-black text-white">
          Entrar
        </button>
      </form>
    </div>
  );
}
