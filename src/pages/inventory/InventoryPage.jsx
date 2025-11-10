// src/pages/inventory/InventoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";

import WarehouseModal from "../../components/inventory/WarehouseModal.jsx";
import CategoryModal from "../../components/inventory/CategoryModal.jsx";
import ProductModal from "../../components/inventory/ProductModal.jsx";
import StockMoveModal from "../../components/inventory/StockMoveModal.jsx";

/**
 * Pestaña de existencias.
 * Aquí vive el buscador local (no depende del padre),
 * y recibe por props los datos y callbacks.
 */
function StockTab({
  warehouses,
  loadingWarehouses,
  selectedWarehouseId,
  onChangeWarehouse,
  stockRows,
  loadingStock,
  products,
  onOpenMove,
}) {
  const [search, setSearch] = useState("");

  const filteredStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stockRows;
    return stockRows.filter((r) => {
      const name = (r.product_name || "").toLowerCase();
      const sku = (r.product_sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [search, stockRows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium">Almacén (filtro)</label>
            {loadingWarehouses ? (
              <p className="text-xs text-gray-500">Cargando…</p>
            ) : warehouses.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay almacenes. Crea uno en la pestaña “Almacenes”.
              </p>
            ) : (
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedWarehouseId}
                onChange={(e) => onChangeWarehouse(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">
              Buscar producto (nombre o SKU)
            </label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder="Ej. tornillo, ABC-001…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => onOpenMove("receive")}
            disabled={warehouses.length === 0 || products.length === 0}
          >
            Entrada
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => onOpenMove("transfer")}
            disabled={warehouses.length < 2 || products.length === 0}
          >
            Transferencia
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => onOpenMove("adjust")}
            disabled={warehouses.length === 0 || products.length === 0}
          >
            Ajuste
          </button>
        </div>
      </div>

      {loadingStock ? (
        <p className="text-sm text-gray-600">Cargando existencias…</p>
      ) : filteredStock.length === 0 ? (
        <p className="text-sm text-gray-600">
          No hay existencias para los filtros seleccionados.
        </p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">SKU</th>
                <th className="text-left px-3 py-2 font-medium">Producto</th>
                <th className="text-left px-3 py-2 font-medium">Almacén</th>
                <th className="text-right px-3 py-2 font-medium">En stock</th>
                <th className="text-right px-3 py-2 font-medium">Reservado</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.product_sku}</td>
                  <td className="px-3 py-2">{r.product_name}</td>
                  <td className="px-3 py-2">{r.warehouse_code}</td>
                  <td className="px-3 py-2 text-right">{r.qty_on_hand}</td>
                  <td className="px-3 py-2 text-right">{r.qty_reserved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryPage() {
  const { org } = useAuth();

  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockRows, setStockRows] = useState([]);

  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  const [toast, setToast] = useState(null);

  // Filtro de stock
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Modales CRUD
  const [openNewWarehouse, setOpenNewWarehouse] = useState(false);
  const [openEditWarehouse, setOpenEditWarehouse] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState(null);

  const [openNewCategory, setOpenNewCategory] = useState(false);
  const [openEditCategory, setOpenEditCategory] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);

  const [openNewProduct, setOpenNewProduct] = useState(false);
  const [openEditProduct, setOpenEditProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  // Modales de movimientos
  const [moveMode, setMoveMode] = useState(null); // "receive" | "adjust" | "transfer"

  // ---- Loaders ----------------------------------------------------

  const loadWarehouses = async () => {
    if (!org?.slug) return;
    setLoadingWarehouses(true);
    try {
      const res = await http.get(tpath(org.slug, "/inventory/warehouses/"));

      const data = res.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];

      setWarehouses(items);

      if (!selectedWarehouseId && items.length > 0) {
        setSelectedWarehouseId(String(items[0].id));
      }
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando almacenes.",
      });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadCategories = async () => {
    if (!org?.slug) return;
    setLoadingCategories(true);
    try {
      const res = await http.get(tpath(org.slug, "/inventory/categories/"));

      const data = res.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];

      setCategories(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando categorías.",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    if (!org?.slug) return;
    setLoadingProducts(true);
    try {
      const res = await http.get(tpath(org.slug, "/inventory/products/"));

      const data = res.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];

      setProducts(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando productos.",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadStock = async () => {
    if (!org?.slug) return;
    setLoadingStock(true);
    try {
      const params = {};
      if (selectedWarehouseId) params.warehouse = selectedWarehouseId;
      const res = await http.get(tpath(org.slug, "/inventory/stock/"), {
        params,
      });

      const data = res.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];

      setStockRows(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando existencias.",
      });
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    if (!org?.slug) return;
    loadWarehouses();
    loadCategories();
    loadProducts();
  }, [org?.slug]);

  useEffect(() => {
    if (!org?.slug) return;
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.slug, selectedWarehouseId]);

  // ---- Helpers CRUD ----------------------------------------------

  const handleDeleteWarehouse = async (row) => {
    if (!org?.slug) return;
    if (
      !window.confirm(
        `¿Eliminar el almacén "${row.code} · ${row.name}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await http.delete(tpath(org.slug, `/inventory/warehouses/${row.id}/`));
      await loadWarehouses();
      await loadStock();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo eliminar el almacén.",
      });
    }
  };

  const handleDeleteCategory = async (row) => {
    if (!org?.slug) return;
    if (
      !window.confirm(
        `¿Eliminar la categoría "${row.name}"? No se recomienda si hay productos asociados.`
      )
    ) {
      return;
    }
    try {
      await http.delete(tpath(org.slug, `/inventory/categories/${row.id}/`));
      await loadCategories();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo eliminar la categoría.",
      });
    }
  };

  const handleDeleteProduct = async (row) => {
    if (!org?.slug) return;
    if (!window.confirm(`¿Eliminar el producto "${row.sku} · ${row.name}"?`)) {
      return;
    }
    try {
      await http.delete(tpath(org.slug, `/inventory/products/${row.id}/`));
      await loadProducts();
      await loadStock();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo eliminar el producto.",
      });
    }
  };

  // ---- Resto de tabs (siguen como funciones internas) ------------

  function ProductsTab() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Productos</h2>
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => setOpenNewProduct(true)}
            disabled={loadingProducts}
          >
            Nuevo producto
          </button>
        </div>

        {loadingProducts ? (
          <p className="text-sm text-gray-600">Cargando productos…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay productos todavía. Crea el primero.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">Nombre</th>
                  <th className="text-left px-3 py-2 font-medium">Categoría</th>
                  <th className="text-right px-3 py-2 font-medium">Precio</th>
                  <th className="text-center px-3 py-2 font-medium">
                    Servicio
                  </th>
                  <th className="text-center px-3 py-2 font-medium">Activo</th>
                  <th className="text-right px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.sku}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.category_name || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {p.price ?? "0.00"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.is_service ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.is_active ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          setProductToEdit(p);
                          setOpenEditProduct(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 underline"
                        onClick={() => handleDeleteProduct(p)}
                      >
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
    );
  }

  function WarehousesTab() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Almacenes</h2>
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => setOpenNewWarehouse(true)}
            disabled={loadingWarehouses}
          >
            Nuevo almacén
          </button>
        </div>

        {loadingWarehouses ? (
          <p className="text-sm text-gray-600">Cargando almacenes…</p>
        ) : warehouses.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay almacenes todavía. Crea el primero.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Código</th>
                  <th className="text-left px-3 py-2 font-medium">Nombre</th>
                  <th className="text-center px-3 py-2 font-medium">
                    Principal
                  </th>
                  <th className="text-center px-3 py-2 font-medium">Activo</th>
                  <th className="text-right px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id} className="border-t">
                    <td className="px-3 py-2">{w.code}</td>
                    <td className="px-3 py-2">{w.name}</td>
                    <td className="px-3 py-2 text-center">
                      {w.is_primary ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {w.is_active ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          setWarehouseToEdit(w);
                          setOpenEditWarehouse(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 underline"
                        onClick={() => handleDeleteWarehouse(w)}
                      >
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
    );
  }

  function CategoriesTab() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Categorías</h2>
          <button
            type="button"
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
            onClick={() => setOpenNewCategory(true)}
            disabled={loadingCategories}
          >
            Nueva categoría
          </button>
        </div>

        {loadingCategories ? (
          <p className="text-sm text-gray-600">Cargando categorías…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay categorías todavía. Crea la primera.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nombre</th>
                  <th className="text-center px-3 py-2 font-medium">Activa</th>
                  <th className="text-right px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 text-center">
                      {c.is_active ? "Sí" : "No"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          setCategoryToEdit(c);
                          setOpenEditCategory(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 underline"
                        onClick={() => handleDeleteCategory(c)}
                      >
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
    );
  }

  // Tabs: para la de stock usamos el componente externo con props,
  // y así su estado interno (search) no depende del padre.
  const tabs = useMemo(
    () => [
      {
        key: "stock",
        label: "Existencias",
        content: () => (
          <StockTab
            warehouses={warehouses}
            loadingWarehouses={loadingWarehouses}
            selectedWarehouseId={selectedWarehouseId}
            onChangeWarehouse={setSelectedWarehouseId}
            stockRows={stockRows}
            loadingStock={loadingStock}
            products={products}
            onOpenMove={setMoveMode}
          />
        ),
      },
      { key: "products", label: "Productos", content: ProductsTab },
      { key: "warehouses", label: "Almacenes", content: WarehousesTab },
      { key: "categories", label: "Categorías", content: CategoriesTab },
    ],
    [
      warehouses,
      loadingWarehouses,
      selectedWarehouseId,
      stockRows,
      loadingStock,
      products,
      categories,
      loadingCategories,
      loadingProducts,
    ]
  );

  return (
    <section className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Inventario</h1>
          <p className="text-xs text-gray-600">
            Control de productos, almacenes y existencias.
          </p>
        </div>
      </header>

      {toast?.msg && (
        <Toast
          kind={toast.kind || "error"}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <Tabs tabs={tabs} initial={0} />

      {/* Modales CRUD */}
      <WarehouseModal
        open={openNewWarehouse}
        mode="create"
        initial={null}
        onClose={() => setOpenNewWarehouse(false)}
        onSaved={async () => {
          await loadWarehouses();
          await loadStock();
        }}
      />
      <WarehouseModal
        open={openEditWarehouse}
        mode="edit"
        initial={warehouseToEdit}
        onClose={() => {
          setOpenEditWarehouse(false);
          setWarehouseToEdit(null);
        }}
        onSaved={async () => {
          await loadWarehouses();
          await loadStock();
        }}
      />

      <CategoryModal
        open={openNewCategory}
        mode="create"
        initial={null}
        onClose={() => setOpenNewCategory(false)}
        onSaved={loadCategories}
      />
      <CategoryModal
        open={openEditCategory}
        mode="edit"
        initial={categoryToEdit}
        onClose={() => {
          setOpenEditCategory(false);
          setCategoryToEdit(null);
        }}
        onSaved={loadCategories}
      />

      <ProductModal
        open={openNewProduct}
        mode="create"
        initial={null}
        categories={categories}
        onClose={() => setOpenNewProduct(false)}
        onSaved={async () => {
          await loadProducts();
          await loadStock();
        }}
      />
      <ProductModal
        open={openEditProduct}
        mode="edit"
        initial={productToEdit}
        categories={categories}
        onClose={() => {
          setOpenEditProduct(false);
          setProductToEdit(null);
        }}
        onSaved={async () => {
          await loadProducts();
          await loadStock();
        }}
      />

      {/* Modal movimientos */}
      <StockMoveModal
        open={Boolean(moveMode)}
        mode={moveMode || "receive"}
        warehouses={warehouses}
        products={products}
        onClose={() => setMoveMode(null)}
        onDone={async () => {
          await loadStock();
        }}
      />
    </section>
  );
}

export default InventoryPage;
