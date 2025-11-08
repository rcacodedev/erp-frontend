// src/pages/sales/FinancePage.jsx
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";

function displayContactName(c) {
  if (!c) return "";
  return (
    c.razon_social?.trim() ||
    [c.nombre, c.apellidos].filter(Boolean).join(" ").trim() ||
    c.nombre_comercial ||
    ""
  );
}

// --- Presupuestos ---
// --- Presupuestos ---
function QuotesTab() {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadQuotes = async (signal) => {
    if (!org?.slug) return;
    try {
      setLoading(true);
      const { data } = await http.get(tpath(org.slug, "/sales/quotes/"), {
        signal,
      });
      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setRows(results);
    } catch (err) {
      if (signal?.aborted) return;
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando presupuestos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!org?.slug) return;
    const controller = new AbortController();
    loadQuotes(controller.signal);
    return () => controller.abort();
  }, [org?.slug]);

  const handleCreated = () => {
    setShowNewModal(false);
    loadQuotes(); // recarga lista
    setToast({
      kind: "success",
      msg: "Presupuesto creado correctamente.",
    });
  };

  return (
    <div className="space-y-3">
      {toast?.msg && (
        <Toast
          kind={toast.kind}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Presupuestos</h2>
        <button
          type="button"
          className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
          onClick={() => setShowNewModal(true)}
        >
          Nuevo presupuesto
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600">No hay presupuestos.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Número</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-t">
                  <td className="px-3 py-2">{q.number}</td>
                  <td className="px-3 py-2">{q.date}</td>
                  <td className="px-3 py-2">
                    {displayContactName(q.customer_detail || q.customer)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {q.total ?? q.totals_total ?? "-"}
                  </td>
                  <td className="px-3 py-2">{q.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewModal && (
        <NewQuoteModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// --- Albaranes ---
function DeliveryNotesTab() {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org?.slug) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const { data } = await http.get(
          tpath(org.slug, "/sales/delivery-notes/")
        );
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        if (!cancelled) setRows(results);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setToast({
            kind: "error",
            msg: "Error cargando albaranes.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [org?.slug]);

  return (
    <div className="space-y-3">
      {toast?.msg && (
        <Toast
          kind={toast.kind}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Albaranes</h2>
        <button
          type="button"
          className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
        >
          Nuevo albarán (WIP)
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600">No hay albaranes.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Número</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((dn) => (
                <tr key={dn.id} className="border-t">
                  <td className="px-3 py-2">{dn.number}</td>
                  <td className="px-3 py-2">{dn.date}</td>
                  <td className="px-3 py-2">
                    {displayContactName(dn.customer_detail || dn.customer)}
                  </td>
                  <td className="px-3 py-2">{dn.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Facturas ---
function InvoicesTab() {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org?.slug) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const { data } = await http.get(tpath(org.slug, "/sales/invoices/"));
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        if (!cancelled) setRows(results);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setToast({
            kind: "error",
            msg: "Error cargando facturas.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [org?.slug]);

  return (
    <div className="space-y-3">
      {toast?.msg && (
        <Toast
          kind={toast.kind}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Facturas</h2>
        <button
          type="button"
          className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
        >
          Nueva factura (WIP)
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600">No hay facturas.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Serie/Número</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Pago</th>
                <th className="px-3 py-2 text-left">Verifactu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-3 py-2">
                    {inv.series}-{inv.number}
                  </td>
                  <td className="px-3 py-2">{inv.date_issue}</td>
                  <td className="px-3 py-2">
                    {displayContactName(inv.customer_detail || inv.customer)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {inv.total ?? inv.totals_total ?? "-"}
                  </td>
                  <td className="px-3 py-2">{inv.status}</td>
                  <td className="px-3 py-2">{inv.payment_status}</td>
                  <td className="px-3 py-2">{inv.verifactu_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  const tabs = useMemo(
    () => [
      { key: "quotes", label: "Presupuestos", content: QuotesTab },
      { key: "delivery", label: "Albaranes", content: DeliveryNotesTab },
      { key: "invoices", label: "Facturas", content: InvoicesTab },
    ],
    []
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Finanzas</h1>
      <Tabs tabs={tabs} initial={0} />
    </section>
  );
}
