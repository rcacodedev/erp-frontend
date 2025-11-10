// src/components/inventory/WarehouseModal.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

export default function WarehouseModal({
  open,
  mode = "create", // "create" | "edit"
  initial = null,
  onClose,
  onSaved,
}) {
  const { org } = useAuth();
  const [form, setForm] = useState({
    code: "",
    name: "",
    is_primary: false,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (initial && mode === "edit") {
      setForm({
        code: initial.code ?? "",
        name: initial.name ?? "",
        is_primary: Boolean(initial.is_primary),
        is_active: Boolean(initial.is_active),
      });
    } else if (open && mode === "create") {
      setForm({
        code: "",
        name: "",
        is_primary: false,
        is_active: true,
      });
    }
  }, [open, mode, initial]);

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
        code: form.code,
        name: form.name,
        is_primary: form.is_primary,
        is_active: form.is_active,
      };
      if (mode === "create") {
        await http.post(tpath(org.slug, "/inventory/warehouses/"), payload);
      } else {
        await http.patch(
          tpath(org.slug, `/inventory/warehouses/${initial.id}/`),
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
        "Error al guardar el almacén.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {mode === "create" ? "Nuevo almacén" : "Editar almacén"}
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
          <div className="space-y-1">
            <label className="text-xs font-medium">Código</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full text-sm"
              value={form.code}
              onChange={handleChange("code")}
              required
            />
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

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={handleChange("is_primary")}
              />
              Almacén principal
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
                ? "Crear almacén"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
