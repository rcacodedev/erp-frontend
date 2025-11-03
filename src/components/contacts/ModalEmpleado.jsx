import { useEffect, useMemo, useState } from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalEmpleado({
  open,
  title = "Nuevo empleado",
  initialData = null, // para edición
  onSubmit, // async (payload) => Promise<void>
  onClose,
  submitting = false,
}) {
  const [form, setForm] = useState({
    es_persona: true,
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    documento_id: "",
    activo: true,
    // perfil empleado (opcionales)
    ubicacion: "", // id numérico o vacío
    objetivo_horas_mes: 160, // número
  });
  const [formErr, setFormErr] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        es_persona: initialData?.es_persona ?? true,
        nombre: initialData?.nombre ?? "",
        apellidos: initialData?.apellidos ?? "",
        email: initialData?.email ?? "",
        telefono: initialData?.telefono ?? "",
        documento_id: initialData?.documento_id ?? "",
        activo: initialData?.activo ?? true,
      });
      setFormErr({});
    }
  }, [open, initialData]);

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio.";
    if (form.email && !emailRegex.test(form.email))
      e.email = "Formato de email no válido.";
    return e;
  };

  const payload = useMemo(() => {
    const base = {
      tipo: "employee",
      es_persona: !!form.es_persona,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim() || "",
      email: form.email.trim() || "",
      telefono: form.telefono.trim() || "",
      documento_id: form.documento_id.trim() || "",
      activo: !!form.activo,
    };
    // Perfil anidado (solo si hay algo)
    const empleado = {};
    if (String(form.ubicacion).trim())
      empleado.ubicacion = Number(form.ubicacion);
    if (form.objetivo_horas_mes != null)
      empleado.objetivo_horas_mes = Number(form.objetivo_horas_mes);
    if (Object.keys(empleado).length) base.empleado = empleado;
    return base;
  }, [form]);

  const handleChange = (k) => (ev) => {
    const v =
      k === "es_persona" || k === "activo"
        ? ev.target.checked
        : ev.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setFormErr((fe) => ({ ...fe, [k]: "" }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setFormErr(e);
      return;
    }
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

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.es_persona}
                onChange={handleChange("es_persona")}
              />
              ¿Es persona física?
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre *</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.nombre ? "border-red-400" : ""
                  }`}
                  value={form.nombre}
                  onChange={handleChange("nombre")}
                  placeholder="María"
                  required
                />
                {formErr.nombre && (
                  <p className="text-xs text-red-600 mt-1">{formErr.nombre}</p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Apellidos</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.apellidos}
                  onChange={handleChange("apellidos")}
                  placeholder="López Ruiz"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.email ? "border-red-400" : ""
                  }`}
                  value={form.email}
                  onChange={handleChange("email")}
                  type="email"
                  placeholder="empleado@empresa.com"
                />
                {formErr.email && (
                  <p className="text-xs text-red-600 mt-1">{formErr.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Teléfono</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.telefono}
                  onChange={handleChange("telefono")}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">
                Documento ID (NIF/NIE)
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.documento_id}
                onChange={handleChange("documento_id")}
                placeholder="12345678Z"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Ubicación (ID)</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.ubicacion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ubicacion: e.target.value }))
                }
                placeholder="2"
              />
              <p className="text-xs text-gray-500 mt-1">
                *De momento es el ID numérico de LocationLite.
              </p>
            </div>
            <div>
              <label className="block text-sm mb-1">Objetivo horas/mes</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="number"
                min={0}
                value={form.objetivo_horas_mes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, objetivo_horas_mes: e.target.value }))
                }
                placeholder="160"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={handleChange("activo")}
              />
              Activo
            </label>

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
