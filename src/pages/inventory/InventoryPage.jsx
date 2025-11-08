// src/pages/inventory/InventoryPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";

function InventoryPage() {
  const { org } = useAuth();

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [inStock, setInStock] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Cargar almacenes y categorías al entrar
  useEffect(() => {
    if (!org?.slug) return;

    let cancelled = false;
    async function loadBasics() {
      try {
        const [whRes, catRes] = await Promise.all([
          http.get(tpath(org.slug, "/inventory/warehouses/")),
          http.get(tpath(org.slug, "/inventory/categories/")),
        ]);
        const wh = Array.isArray(whRes?.data?.results)
          ? whRes.data.results
          : whRes.data ?? whRes;
        const cats = Array.isArray(catRes?.data?.results)
          ? catRes.data.results
          : catRes.data ?? catRes;
        if (!cancelled) {
          setWarehouses(wh);
          setCategories(cats);
          if (wh.length > 0) {
            setSelectedWarehouseId(wh[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setToast({
            kind: "error",
            msg: "Error cargando almacenes/categorías.",
          });
        }
      }
    }
    loadBasics();
    return () => {
      cancelled = true;
    };
  }, [org?.slug]);

  // Cargar productos cuando cambian filtros o almacén
  useEffect(() => {
    if (!org?.slug || !selectedWarehouseId) return;

    let cancelled = false;
    async function loadProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("warehouse", selectedWarehouseId);
        if (q.trim()) params.set("q", q.trim());
        if (categoryFilter) params.set("category", categoryFilter);
        if (inStock) params.set("in_stock", "1");

        const { data } = await http.get(
          tpath(org.slug, `/inventory/products/?${params.toString()}`)
        );
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        if (!cancelled) {
          setProducts(results);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setToast({
            kind: "error",
            msg: "Error cargando productos.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [org?.slug, selectedWarehouseId, q, categoryFilter, inStock]);

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Inventario</h1>

      {toast?.msg && (
        <Toast
          kind={toast.kind}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      {/* Almacenes */}
      <div className="border rounded p-3 space-y-2">
        <h2 className="font-medium">Almacenes</h2>
        {warehouses.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay almacenes todavía. Crea uno desde el backend o añade aquí en
            una siguiente iteración.
          </p>
        ) : (
          <select
            className="border rounded px-3 py-2 text-sm"
            value={selectedWarehouseId ?? ""}
            onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filtros */}
      <div className="border rounded p-3 space-y-3">
        <h2 className="font-medium">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Buscar producto
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Nombre o SKU"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Categoría</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="inStock"
              type="checkbox"
              className="h-4 w-4"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            <label htmlFor="inStock" className="text-sm">
              Solo productos con stock
            </label>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            Productos{" "}
            {currentWarehouse ? (
              <span className="text-xs text-gray-600">
                ({currentWarehouse.code} - {currentWarehouse.name})
              </span>
            ) : null}
          </h2>
          {/* Aquí más adelante: botón “Nuevo producto” → modal */}
          <button
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            type="button"
          >
            Nuevo producto (WIP)
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay productos que coincidan con el filtro.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Categoría</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2 text-center">Servicio</th>
                  <th className="px-3 py-2 text-center">Activo</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.sku}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">
                      {p.category_name || p.category?.name || p.category || "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.price ?? p.unit_price ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.is_service ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.is_active ?? true ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="text-xs underline">Editar</button>
                      <button className="text-xs text-red-600 underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default InventoryPage;
