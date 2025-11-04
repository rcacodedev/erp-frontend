import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http.js";
import { tpath } from "../../lib/tenantPath.js";

export default function EmployeeCompensations({ contactId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!org?.slug || !contactId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/${contactId}/compensations/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, contactId]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Compensaciones</h3>
        {/* TODO: nueva compensación */}
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Inicio</th>
              <th className="text-left px-3 py-2">Fin</th>
              <th className="text-left px-3 py-2">Salario bruto anual</th>
              <th className="text-left px-3 py-2">Coste empresa %</th>
              <th className="text-left px-3 py-2">Plus mensual</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={5}>
                  Sin datos
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.inicio}</td>
                  <td className="px-3 py-2">{r.fin || "—"}</td>
                  <td className="px-3 py-2">{r.salario_bruto_anual}</td>
                  <td className="px-3 py-2">{r.coste_empresa_pct}%</td>
                  <td className="px-3 py-2">{r.plus_mensual}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
