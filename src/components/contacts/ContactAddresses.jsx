import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

export default function ContactAddresses({ contactId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  const load = async () => {
    if (!org?.slug || !contactId) return;
    setLoading(true);
    try {
      const { data } = await http.get(
        tpath(org.slug, `/contacts/${contactId}/addresses/`)
      );
      setRows(Array.isArray(data?.results) ? data.results : data ?? []);
    } catch (e) {
      setToast({
        kind: "error",
        msg:
          e?.response?.data?.detail ||
          e.message ||
          "Error al cargar direcciones",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, contactId]);

  return (
    <section className="space-y-3">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Direcciones</h3>
        {/* TODO: botón “Nueva dirección” (form modal) */}
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Línea 1</th>
              <th className="text-left px-3 py-2">CP</th>
              <th className="text-left px-3 py-2">Ciudad</th>
              <th className="text-left px-3 py-2">Provincia</th>
              <th className="text-left px-3 py-2">País</th>
              <th className="text-left px-3 py-2">Principal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2" colSpan={7}>
                  Cargando…
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={7}>
                  Sin direcciones
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.tipo}</td>
                  <td className="px-3 py-2">{r.linea1}</td>
                  <td className="px-3 py-2">{r.cp || "—"}</td>
                  <td className="px-3 py-2">{r.ciudad || "—"}</td>
                  <td className="px-3 py-2">{r.provincia || "—"}</td>
                  <td className="px-3 py-2">{r.pais || "—"}</td>
                  <td className="px-3 py-2">{r.es_principal ? "Sí" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
