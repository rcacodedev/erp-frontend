import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http.js";
import { tpath } from "../../lib/tenantPath.js";

export default function SupplierCertifications({ supplierId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!org?.slug || !supplierId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/suppliers/${supplierId}/certifications/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, supplierId]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Certificaciones</h3>
        {/* TODO: nueva certificación */}
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Código</th>
              <th className="text-left px-3 py-2">Emisión</th>
              <th className="text-left px-3 py-2">Caducidad</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  Sin certificaciones
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.tipo}</td>
                  <td className="px-3 py-2">{r.codigo || "—"}</td>
                  <td className="px-3 py-2">{r.fecha_emision || "—"}</td>
                  <td className="px-3 py-2">{r.fecha_caducidad || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
