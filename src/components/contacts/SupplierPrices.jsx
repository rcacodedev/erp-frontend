import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http.js";
import { tpath } from "../../lib/tenantPath.js";

export default function SupplierPrices({ supplierId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!org?.slug || !supplierId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/suppliers/${supplierId}/prices/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, supplierId]);

  const importCSV = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await http.post(
      tpath(org.slug, `/contacts/suppliers/${supplierId}/prices/import/`),
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    await load();
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Precios</h3>
        <label className="text-sm">
          <span className="px-3 py-1.5 rounded border cursor-pointer">
            Importar CSV
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => importCSV(e.target.files?.[0])}
          />
        </label>
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">SKU proveedor</th>
              <th className="text-left px-3 py-2">Producto interno</th>
              <th className="text-left px-3 py-2">Precio</th>
              <th className="text-left px-3 py-2">Moneda</th>
              <th className="text-left px-3 py-2">Min qty</th>
              <th className="text-left px-3 py-2">Lead time</th>
              <th className="text-left px-3 py-2">Desde</th>
              <th className="text-left px-3 py-2">Hasta</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="px-3 py-2" colSpan={8}>
                  Sin precios
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.sku_proveedor}</td>
                  <td className="px-3 py-2">{r.producto_sku_interno || "—"}</td>
                  <td className="px-3 py-2">{r.precio}</td>
                  <td className="px-3 py-2">{r.moneda}</td>
                  <td className="px-3 py-2">{r.min_qty}</td>
                  <td className="px-3 py-2">{r.lead_time_dias} días</td>
                  <td className="px-3 py-2">{r.valido_desde}</td>
                  <td className="px-3 py-2">{r.valido_hasta || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
