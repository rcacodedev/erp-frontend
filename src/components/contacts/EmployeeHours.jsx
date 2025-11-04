import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

export default function EmployeeHours({ contactId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = async () => {
    if (!org?.slug || !contactId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/${contactId}/hours/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
    try {
      const { data: s } = await http.get(
        tpath(org.slug, `/contacts/${contactId}/hours/summary/`)
      );
      setSummary(s);
    } catch {
      /* puede no estar implementado aún */
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, contactId]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Horas trabajadas</h3>
        {/* TODO: añadir registro horas; importar CSV: POST /hours/import/ */}
      </div>

      {summary ? (
        <div className="text-sm text-gray-700">
          <b>Resumen</b>: {JSON.stringify(summary)}
        </div>
      ) : null}

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="text-left px-3 py-2">Horas</th>
              <th className="text-left px-3 py-2">Entrada</th>
              <th className="text-left px-3 py-2">Salida</th>
              <th className="text-left px-3 py-2">Descanso</th>
              <th className="text-left px-3 py-2">Fuente</th>
              <th className="text-left px-3 py-2">Ref</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={7}>
                  Sin registros
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.fecha}</td>
                  <td className="px-3 py-2">{r.horas_totales}</td>
                  <td className="px-3 py-2">{r.entrada || "—"}</td>
                  <td className="px-3 py-2">{r.salida || "—"}</td>
                  <td className="px-3 py-2">{r.descanso_minutos} min</td>
                  <td className="px-3 py-2">{r.fuente || "—"}</td>
                  <td className="px-3 py-2">{r.referencia || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
