import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

export default function ContactConsents({ contactId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  const load = async () => {
    if (!org?.slug || !contactId) return;
    try {
      const { data } = await http.get(
        tpath(org.slug, `/contacts/${contactId}/consents/`)
      );
      setRows(Array.isArray(data?.results) ? data.results : data ?? []);
    } catch (e) {
      setToast({
        kind: "error",
        msg:
          e?.response?.data?.detail ||
          e.message ||
          "Error al cargar consentimientos",
      });
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, contactId]);

  return (
    <section className="space-y-2">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />
      <h3 className="font-medium">Consentimientos</h3>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Método</th>
              <th className="text-left px-3 py-2">Versión</th>
              <th className="text-left px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={5}>
                  Sin consentimientos
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.tipo}</td>
                  <td className="px-3 py-2">{r.estado}</td>
                  <td className="px-3 py-2">{r.metodo || "—"}</td>
                  <td className="px-3 py-2">{r.version_texto || "—"}</td>
                  <td className="px-3 py-2">{r.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* TODO: botón registrar opt-in/opt-out */}
    </section>
  );
}
