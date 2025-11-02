import { useEffect, useState } from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalCliente({
  open,
  title = "Nuevo cliente",
  initialData = null, // para reutilizar en “Editar” en el futuro
  onSubmit, // async (payload) => Promise<void>
  onClose,
  submitting = false, // control externo opcional (no imprescindible ahora)
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    vat_number: "",
  });
  const [formErr, setFormErr] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name ?? "",
        email: initialData?.email ?? "",
        phone: initialData?.phone ?? "",
        vat_number: initialData?.vat_number ?? "",
      });
      setFormErr({});
    }
  }, [open, initialData]);

  const onChange = (k) => (ev) => {
    setForm((f) => ({ ...f, [k]: ev.target.value }));
    setFormErr((fe) => ({ ...fe, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio.";
    if (form.email && !emailRegex.test(form.email))
      e.email = "Formato de email no válido.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setFormErr(e);
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      vat_number: form.vat_number.trim() || null,
    };
    await onSubmit?.(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg border">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <button
              className="text-sm px-2 py-1 rounded hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre *</label>
              <input
                className={`w-full border rounded px-3 py-2 ${
                  formErr.name ? "border-red-400" : ""
                }`}
                value={form.name}
                onChange={onChange("name")}
                placeholder="Acme S.A."
                required
              />
              {formErr.name && (
                <p className="text-xs text-red-600 mt-1">{formErr.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.email ? "border-red-400" : ""
                  }`}
                  value={form.email}
                  onChange={onChange("email")}
                  type="email"
                  placeholder="contacto@acme.com"
                />
                {formErr.email && (
                  <p className="text-xs text-red-600 mt-1">{formErr.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Teléfono</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.phone}
                  onChange={onChange("phone")}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">NIF/CIF</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.vat_number}
                onChange={onChange("vat_number")}
                placeholder="B12345678"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-2 text-sm rounded bg-black text-white disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
