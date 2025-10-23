import { useEffect, useState } from "react";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import { useAuth } from "../../auth/AuthProvider";

export default function MySubscription() {
  const { org } = useAuth();
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const orgSlug = org?.slug || localStorage.getItem("org_slug");

  useEffect(() => {
    const go = async () => {
      try {
        setErr("");
        const { data } = await http.get(
          tpath(orgSlug, "/billing/subscription/")
        );
        setSub(data);
      } catch (e) {
        setErr(
          e.response?.data?.detail || e.message || "Error al cargar suscripción"
        );
      }
    };
    if (orgSlug) go();
    else setErr("No se ha seleccionado organización.");
  }, [orgSlug]);

  const openPortal = async () => {
    try {
      setBusy(true);
      const { data } = await http.post(
        tpath(orgSlug, "/billing/stripe/portal/")
      );
      window.location.href = data.portal_url;
    } catch (e) {
      alert(e.response?.data?.detail || e.message || "Error al abrir portal");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!sub) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Mi suscripción</h1>
      <div className="rounded-2xl shadow p-4">
        <p>
          <b>Plan:</b> {sub.current_plan}
        </p>
        <p>
          <b>Estado:</b> {sub.status}
        </p>
        {sub.current_period_end && (
          <p>
            <b>Renovación:</b>{" "}
            {new Date(sub.current_period_end).toLocaleString()}
          </p>
        )}
        {sub.cancel_at_period_end && <p>Cancelada al final del periodo.</p>}
        <div className="mt-4">
          <button
            className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-60"
            onClick={openPortal}
            disabled={busy}
          >
            {busy ? "Abriendo portal..." : "Gestionar en Stripe"}
          </button>
        </div>
      </div>
    </div>
  );
}
