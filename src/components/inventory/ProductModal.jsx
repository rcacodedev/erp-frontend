// src/components/inventory/ProductModal.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

export default function ProductModal({
  open,
  mode = "create", // "create" | "edit"
  initial = null,
  categories = [],
  onClose,
  onSaved,
}) {
  const { org } = useAuth();
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    uom: "unidad",
    tax_rate: "21.00",
    price: "0.00",
    is_service: false,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (initial && mode === "edit") {
      setForm({
        sku: initial.sku ?? "",
        name: initial.name ?? "",
        category: initial.category ?? "",
        uom: initial.uom ?? "unidad",
        tax_rate: String(initial.tax_rate ?? "21.00"),
        price: String(initial.price ?? "0.00"),
        is_service: Boolean(initial.is_service),
        is_active: Boolean(initial.is_active),
      });
    } else if (open && mode === "create") {
      setForm({
        sku: "",
        name: "",
        category: categories[0]?.id ?? "",
        uom: "unidad",
        tax_rate: "21.00",
        price: "0.00",
        is_service: false,
        is_active: true,
      });
    }
  }, [open, mode, initial, categories]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;
    setSubmitting(true);
    setToast(null);

    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        category: form.category || null,
        uom: form.uom,
        tax_rate: form.tax_rate,
        price: form.price,
        is_service: form.is_service,
        is_active: form.is_active,
      };
      if (mode === "create") {
        await http.post(tpath(org.slug, "/inventory/products/"), payload);
      } else {
        await http.patch(
          tpath(org.slug, `/inventory/products/${initial.id}/`),
          payload
        );
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al guardar el producto.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-black"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </button>
        </div>

        {toast?.msg && (
          <Toast
            kind={toast.kind || "error"}
            msg={toast.msg}
            onClose={() => setToast(null)}
          />
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">SKU</label>
              <input
                type="text"
                className="border rounded px-2 py-1 w-full text-sm"
                value={form.sku}
                onChange={handleChange("sku")}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Unidad (uom)</label>
              <input
                type="text"
                className="border rounded px-2 py-1 w-full text-sm"
                value={form.uom}
                onChange={handleChange("uom")}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Nombre</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full text-sm"
              value={form.name}
              onChange={handleChange("name")}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Categoría</label>
              <select
                className="border rounded px-2 py-1 w-full text-sm"
                value={form.category || ""}
                onChange={handleChange("category")}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">IVA (%)</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1 w-full text-sm"
                value={form.tax_rate}
                onChange={handleChange("tax_rate")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Precio</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1 w-full text-sm"
                value={form.price}
                onChange={handleChange("price")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.is_service}
                onChange={handleChange("is_service")}
              />
              Es servicio (no stock)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange("is_active")}
              />
              Activo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs px-3 py-1 border rounded bg-black text-white hover:bg-gray-900 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting
                ? "Guardando..."
                : mode === "create"
                ? "Crear producto"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
