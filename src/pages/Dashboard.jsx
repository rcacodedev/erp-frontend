import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // 👈 nuevo
import { useAuth } from "../auth/AuthProvider";
import http from "../api/http";
import { tpath } from "../lib/tenantPath";

export default function Dashboard() {
  const { user, org, changeOrg, logout } = useAuth();
  const [pong, setPong] = useState(null);
  const [err, setErr] = useState("");

  // 👇 guarda el org_slug para que /pages/billing lo use sin depender de props
  useEffect(() => {
    if (org?.slug) localStorage.setItem("org_slug", org.slug);
  }, [org?.slug]);

  useEffect(() => {
    const go = async () => {
      try {
        const { data } = await http.get(tpath(org.slug, "/core/ping"));
        setPong(data);
      } catch (e) {
        setErr(e.response?.data?.detail || "Error al llamar /core/ping");
      }
    };
    if (org) go();
  }, [org]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">Hola {user?.email}</div>
        <button onClick={logout} className="px-3 py-1 rounded border">
          Salir
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span>Organización:</span>
        <select
          className="border p-1 rounded"
          value={org?.slug}
          onChange={(e) => changeOrg(e.target.value)}
        >
          {user?.organizations?.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name} ({o.slug}) {o.trial_active ? "• Trial" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 🔗 Enlaces de Billing */}
      <div className="border rounded p-3">
        <div className="font-medium mb-2">Billing</div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/billing/plans"
            className="px-3 py-1 rounded border hover:bg-gray-50"
          >
            Ver planes / Suscribirse
          </Link>
          <Link
            to="/billing/me"
            className="px-3 py-1 rounded border hover:bg-gray-50"
          >
            Mi suscripción
          </Link>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="font-medium mb-2">Ping multi-tenant</div>
        {err && <div className="text-red-600">{err}</div>}
        {pong && (
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(pong, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
