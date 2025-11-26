// --- FILE: src/components/integrations/WebhookModal.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import Toast from "../Toast.jsx";
import { apiCreateWebhook, apiUpdateWebhook } from "../../api/integrations.js";

const EVENT_OPTIONS = [
  { value: "invoice.created", label: "Factura creada" },
  { value: "invoice.paid", label: "Factura cobrada" },
  { value: "client.created", label: "Cliente creado" },
];

export default function WebhookModal({
  open,
  mode = "create", // "create" | "edit"
  initial = null,
  onClose,
  onSaved,
}) {
  const { org } = useAuth();
  const [form, setForm] = useState({
    name: "",
    target_url: "",
    event: "invoice.created",
    secret: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ kind: "", msg: "" });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        name: initial.name || "",
        target_url: initial.target_url || "",
        event: initial.event || "invoice.created",
        secret: "",
        is_active: Boolean(initial.is_active),
      });
    } else {
      setForm({
        name: "",
        target_url: "",
        event: "invoice.created",
        secret: "",
        is_active: true,
      });
    }
    setToast({ kind: "", msg: "" });
  }, [open, mode, initial]);

  if (!open) return null;

  const setField = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug || submitting) return;

    if (!form.target_url.trim()) {
      setToast({
        kind: "error",
        msg: "La URL de destino es obligatoria.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setToast({ kind: "", msg: "" });

      const payload = {
        name: form.name || "",
        target_url: form.target_url,
        event: form.event,
        secret: form.secret || "",
        is_active: form.is_active,
      };

      if (mode === "create") {
        await apiCreateWebhook(org.slug, payload);
      } else if (initial?.id) {
        await apiUpdateWebhook(org.slug, initial.id, payload);
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al guardar el webhook.";
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
            {mode === "create" ? "Nuevo webhook" : "Editar webhook"}
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

        {toast.msg && (
          <Toast
            kind={toast.kind || "error"}
            msg={toast.msg}
            onClose={() => setToast({ kind: "", msg: "" })}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.name}
              onChange={setField("name")}
              placeholder="Ej: Webhook facturas hacia tu sistema"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              URL de destino
            </label>
            <input
              type="url"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.target_url}
              onChange={setField("target_url")}
              placeholder="https://tuapp.com/webhooks/preator"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Evento</label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.event}
              onChange={setField("event")}
            >
              {EVENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Secreto (opcional)
            </label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.secret}
              onChange={setField("secret")}
              placeholder="Se usará para firmar X-Preator-Signature"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={setField("is_active")}
              />
              Activo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-3 py-1 text-xs rounded border hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs rounded bg-black text-white disabled:opacity-60"
              disabled={submitting}
            >
              {submitting
                ? "Guardando..."
                : mode === "create"
                ? "Crear webhook"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
