import { useState, useEffect } from "react";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import { useAuth } from "../../auth/AuthProvider";

export default function BillingPlans() {
  const { org } = useAuth();
  const [loading, setLoading] = useState(null);
  const [err, setErr] = useState("");

  // Si entras directo sin pasar por Dashboard, intenta leer de localStorage
  const orgSlug = org?.slug || localStorage.getItem("org_slug");

  useEffect(() => {
    if (!orgSlug) setErr("No se ha seleccionado organización.");
  }, [orgSlug]);

  const subscribe = async (plan) => {
    if (!orgSlug) return setErr("Selecciona una organización primero.");
    try {
      setErr("");
      setLoading(plan);
      const { data } = await http.post(
        tpath(orgSlug, "/billing/stripe/checkout/"),
        { plan }
      );
      window.location.href = data.checkout_url;
    } catch (e) {
      setErr(
        e.response?.data?.detail || e.message || "Error al crear checkout"
      );
    } finally {
      setLoading(null);
    }
  };

  const Tier = ({ name, price, code }) => (
    <div className="rounded-2xl shadow p-6 flex flex-col gap-4">
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="text-4xl font-extrabold">
        {price}
        <span className="text-base font-normal">/mes</span>
      </p>
      <button
        className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-60"
        onClick={() => subscribe(code)}
        disabled={!!loading || !orgSlug}
      >
        {loading === code ? "Redirigiendo..." : "Suscribirse"}
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
      {err && <div className="col-span-3 text-red-600">{err}</div>}
      <Tier name="Starter" price="5 €" code="starter" />
      <Tier name="Pro" price="15 €" code="pro" />
      <Tier name="Enterprise" price="49 €" code="enterprise" />
    </div>
  );
}
