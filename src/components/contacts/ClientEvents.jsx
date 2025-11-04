import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

export default function ClientEvents({ clientId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const load = async () => {
    if (!org?.slug || !clientId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/clients/${clientId}/events/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, clientId]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Eventos</h3>
        {/* TODO: crear evento */}
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Título</th>
              <th className="text-left px-3 py-2">Inicio</th>
              <th className="text-left px-3 py-2">Fin</th>
              <th className="text-left px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={5}>
                  Sin eventos
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.tipo}</td>
                  <td className="px-3 py-2">{r.titulo}</td>
                  <td className="px-3 py-2">{r.inicio}</td>
                  <td className="px-3 py-2">{r.fin}</td>
                  <td className="px-3 py-2">{r.estado}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
