import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import ContactSelect from "./ContactSelect.jsx";
import ColorPicker from "./ColorPicker.jsx";

function toIsoOrNull(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function EventModal({
  open,
  onClose,
  onSaved,
  mode = "create",
  kind = "event",
  initialDate = null,
  data = null,
}) {
  const { org } = useAuth();
  const [tab, setTab] = useState(kind);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    start: initialDate ? new Date(initialDate).toISOString().slice(0, 16) : "",
    end: "",
    all_day: false,
    due_date: initialDate
      ? new Date(initialDate).toISOString().slice(0, 10)
      : "",
    contact: null,
    color: "",
    is_important: false,
    status: "scheduled",
  });

  // dentro de EventModal, justo después del useState(form)
  useEffect(() => {
    // Si venimos de doble clic en semanal, ponemos end = start +1h (fue guardado en window)
    if (initialDate && window.__agenda_default_end && !data) {
      setForm((f) => ({
        ...f,
        start: new Date(initialDate).toISOString().slice(0, 16),
        end: window.__agenda_default_end, // ya viene en formato YYYY-MM-DDTHH:mm
      }));
      // limpiamos el flag
      window.__agenda_default_end = null;
    }
  }, [initialDate, data]);

  useEffect(() => {
    if (data) {
      setTab("event");
      setForm((f) => ({
        ...f,
        title: data.title || "",
        description: data.notes || "",
        start: data.start ? data.start.slice(0, 16) : "",
        end: data.end ? data.end.slice(0, 16) : "",
        all_day: !!data.all_day,
        contact: data.contact ?? null,
        color: data.color || "",
        is_important: !!data.is_important,
        status: data.status || "scheduled",
      }));
    }
  }, [data]);

  const validate = () => {
    setErr("");
    if (tab === "event") {
      if (!form.title.trim()) return "El título es obligatorio.";
      if (!form.start) return "Inicio es obligatorio.";
    } else {
      if (!form.title.trim()) return "El título de la nota es obligatorio.";
    }
    return "";
  };

  const save = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSaving(true);
    try {
      if (tab === "event") {
        const payload = {
          title: form.title,
          start: toIsoOrNull(form.start),
          end: toIsoOrNull(form.end),
          all_day: form.all_day,
          notes: form.description || "",
          contact: form.contact ?? null,
          color: form.color || null,
          is_important: form.is_important,
          status: form.status,
        };
        if (mode === "edit" && data?.id) {
          await http.patch(
            tpath(org.slug, `/agenda/events/${data.id}/`),
            payload
          );
        } else {
          await http.post(tpath(org.slug, `/agenda/events/`), payload);
        }
      } else {
        const payload = {
          title: form.title,
          body: form.description || "",
          due_date: form.due_date || null,
          is_task: true,
          is_important: form.is_important,
          contact: form.contact ?? null,
          color: form.color || null,
        };
        if (mode === "edit" && data?.id) {
          await http.patch(
            tpath(org.slug, `/agenda/notes/${data.id}/`),
            payload
          );
        } else {
          await http.post(tpath(org.slug, `/agenda/notes/`), payload);
        }
      }
      onSaved?.();
    } catch (e) {
      const apiMsg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : e?.message || "Error desconocido";
      setErr(apiMsg);
      console.error("save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async () => {
    if (!(mode === "edit" && data?.id)) return;
    if (!confirm("¿Eliminar definitivamente?")) return;
    setSaving(true);
    try {
      if (tab === "event") {
        await http.delete(tpath(org.slug, `/agenda/events/${data.id}/`));
      } else {
        await http.delete(tpath(org.slug, `/agenda/notes/${data.id}/`));
      }
      onSaved?.();
    } catch (e) {
      const apiMsg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : e?.message || "Error desconocido";
      setErr(apiMsg);
      console.error("delete error:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Enlaces rápidos si hay contacto/factura
  const contactId = data?.contact ?? form.contact ?? null;
  const invoiceId = data?.invoice ?? null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-2xl shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className={`tab ${tab === "event" ? "tab-active" : ""}`}
              onClick={() => setTab("event")}
            >
              Cita
            </button>
            <button
              className={`tab ${tab === "note" ? "tab-active" : ""}`}
              onClick={() => setTab("note")}
            >
              Nota
            </button>
          </div>
          <div className="flex items-center gap-2">
            {contactId ? (
              <a
                className="btn btn-sm"
                href={`/contacts/clients/${contactId}`}
                title="Ver contacto"
              >
                Contacto ↗
              </a>
            ) : null}
            {invoiceId ? (
              <a
                className="btn btn-sm"
                href={`/finanzas/facturas/${invoiceId}/print`}
                title="Ver factura"
              >
                Factura ↗
              </a>
            ) : null}
            <button className="icon-btn" onClick={onClose} disabled={saving}>
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {err ? (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label">Título</span>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="form-control">
              <span className="label">Contacto</span>
              <ContactSelect
                value={form.contact}
                onChange={(v) => setForm({ ...form, contact: v })}
              />
            </label>
          </div>

          {tab === "event" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label">Inicio</span>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </label>
              <label className="form-control">
                <span className="label">Fin</span>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </label>
              <label className="form-control">
                <span className="label">Todo el día</span>
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) =>
                    setForm({ ...form, all_day: e.target.checked })
                  }
                />
              </label>
              <label className="form-control md:col-span-2">
                <span className="label">Notas</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label">Fecha objetivo</span>
                <input
                  type="date"
                  className="input"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                />
              </label>
              <label className="form-control md:col-span-2">
                <span className="label">Contenido</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label">Importante</span>
              <input
                type="checkbox"
                checked={form.is_important}
                onChange={(e) =>
                  setForm({ ...form, is_important: e.target.checked })
                }
              />
            </label>
            <label className="form-control">
              <span className="label">Color</span>
              <ColorPicker
                value={form.color}
                onChange={(v) => setForm({ ...form, color: v })}
              />
            </label>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          {mode === "edit" && data?.id ? (
            <button
              className="btn"
              onClick={removeItem}
              disabled={saving}
              title="Eliminar"
            >
              🗑️ Borrar
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
