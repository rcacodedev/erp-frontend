import { createContext, useContext, useEffect, useState } from "react";
import http, { setAccessToken } from "../api/http";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {email, organizations:[{slug, role, ...}]}
  const [org, setOrg] = useState(null); // {slug, ...}
  const [loading, setLoading] = useState(true);

  const login = async (email, password, org_slug) => {
    const { data } = await http.post("/auth/login", {
      email,
      password,
      org_slug,
    });
    setAccessToken(data.access);
    const me = await http.get("/auth/me");
    setUser(me.data);
    // si no pasó org_slug, coge la primera
    const firstOrg = me.data.organizations?.[0] || null;
    setOrg(
      org_slug
        ? me.data.organizations.find((o) => o.slug === org_slug)
        : firstOrg
    );
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } catch {}
    setAccessToken(null);
    setUser(null);
    setOrg(null);
  };

  const refreshMe = async () => {
    const me = await http.get("/auth/me");
    setUser(me.data);
    if (!org && me.data.organizations?.length) setOrg(me.data.organizations[0]);
  };

  const changeOrg = async (slug) => {
    // pedimos nuevo access asociado a esa org (login “ligero”: solo cambia org_slug)
    const email = user?.email;
    if (!email) return;
    // El backend espera email+password para login normal; para simplificar en F1,
    // usamos el endpoint de refresh para el token y cambiamos org en ruta al llamar APIs.
    // Estrategia simple: solo cambiamos `org` en front y los paths incluyen /t/{org}.
    const newOrg = user.organizations.find((o) => o.slug === slug);
    setOrg(newOrg || null);
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <AuthCtx.Provider
      value={{ user, org, loading, login, logout, refreshMe, changeOrg }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
