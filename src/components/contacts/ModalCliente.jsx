import { useEffect, useMemo, useState } from "react";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalCliente({
  open,
  title = "Nuevo cliente",
  initialData = null,
  onSubmit,
  onClose,
  submitting = false,
}) {
  const [form, setForm] = useState({
    es_persona: false,
    nombre: "",
    apellidos: "",
    razon_social: "",
    nombre_comercial: "",
    email: "",
    telefono: "",
    documento_id: "",
    activo: true,
    // Perfil cliente (opcionales)
    cliente_desde: "",
    sector: "",
    tamano: "",
    rating: 3,
    limite_credito: "",
  });
  const [formErr, setFormErr] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      es_persona: initialData?.es_persona ?? false,
      nombre: initialData?.nombre ?? "",
      apellidos: initialData?.apellidos ?? "",
      razon_social: initialData?.razon_social ?? "",
      nombre_comercial: initialData?.nombre_comercial ?? "",
      email: initialData?.email ?? "",
      telefono: initialData?.telefono ?? "",
      documento_id: initialData?.documento_id ?? "",
      activo: initialData?.activo ?? true,
      cliente_desde: initialData?.cliente?.cliente_desde ?? "",
      sector: initialData?.cliente?.sector ?? "",
      tamano: initialData?.cliente?.tamano ?? "",
      rating: initialData?.cliente?.rating ?? 3,
      limite_credito: initialData?.cliente?.limite_credito ?? "",
    });
    setFormErr({});
  }, [open, initialData]);

  const validate = () => {
    const e = {};
    if (!(form.razon_social.trim() || form.nombre.trim())) {
      e.razon_social = "Nombre o razón social es obligatorio.";
      e.nombre = "Nombre o razón social es obligatorio.";
    }
    if (form.email && !emailRegex.test(form.email)) e.email = "Formato de email no válido.";
    if (form.rating != null && (Number(form.rating) < 1 || Number(form.rating) > 5)) e.rating = "Rating 1-5.";
    return e;
  };

  const payload = useMemo(() => {
    const base = {
      tipo: "client",
      es_persona: !!form.es_persona,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim() || "",
      razon_social: form.razon_social.trim() || "",
      nombre_comercial: form.nombre_comercial.trim() || "",
      email: form.email.trim() || "",
      telefono: form.telefono.trim() || "",
      documento_id: form.documento_id.trim() || "",
      activo: !!form.activo,
    };
    const cliente = {};
    if (form.cliente_desde) cliente.cliente_desde = form.cliente_desde;
    if (form.sector) cliente.sector = form.sector.trim();
    if (form.tamano) cliente.tamano = form.tamano.trim();
    if (form.rating != null && form.rating !== "") cliente.rating = Number(form.rating);
    if (String(form.limite_credito).trim() !== "") cliente.limite_credito = Number(form.limite_credito);
    if (Object.keys(cliente).length) base.cliente = cliente;
    return base;
  }, [form]);

  const handleChange = (k) => (ev) => {
    const v = k === "es_persona" || k === "activo" ? ev.target.checked : ev.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setFormErr((fe) => ({ ...fe, [k]: "" }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setFormErr(e); return; }
    await onSubmit?.(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg border">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <button className="text-sm px-2 py-1 rounded hover:bg-gray-50" onClick={onClose} disabled={submitting}>✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.es_persona} onChange={handleChange("es_persona")} />
              ¿Es persona física?
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input className={`w-full border rounded px-3 py-2 ${formErr.nombre ? "border-red-400" : ""}`}
                  value={form.nombre} onChange={handleChange("nombre")} placeholder="Juan" />
                {formErr.nombre && <p className="text-xs text-red-600 mt-1">{formErr.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">Apellidos</label>
                <input className="w-full border rounded px-3 py-2"
                  value={form.apellidos} onChange={handleChange("apellidos")} placeholder="García Pérez" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Razón social</label>
              <input className={`w-full border rounded px-3 py-2 ${formErr.razon_social ? "border-red-400" : ""}`}
                value={form.razon_social} onChange={handleChange("razon_social")} placeholder="ACME S.L." />
              {formErr.razon_social && <p className="text-xs text-red-600 mt-1">{formErr.razon_social}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre comercial</label>
                <input className="w-full border rounded px-3 py-2"
                  value={form.nombre_comercial} onChange={handleChange("nombre_comercial")} placeholder="ACME" />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input className={`w-full border rounded px-3 py-2 ${formErr.email ? "border-red-400" : ""}`}
                  value={form.email} onChange={handleChange("email")} type="email" placeholder="contacto@empresa.com" />
                {formErr.email && <p className="text-xs text-red-600 mt-1">{formErr.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Teléfono</label>
                <input className="w-full border rounded px-3 py-2" value={form.telefono}
                  onChange={handleChange("telefono")} placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className="block text-sm mb-1">Documento ID (NIF/NIE)</label>
                <input className="w-full border rounded px-3 py-2" value={form.documento_id}
                  onChange={handleChange("documento_id")} placeholder="B12345678" />
              </div>
            </div>

            {/* Perfil cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Cliente desde</label>
                <input className="w-full border rounded px-3 py-2" type="date"
                  value={form.cliente_desde} onChange={handleChange("cliente_desde")} />
              </div>
              <div>
                <label className="block text-sm mb-1">Sector</label>
                <input className="w-full border rounded px-3 py-2" value={form.sector}
                  onChange={handleChange("sector")} placeholder="Tecnología" />
              </div>
              <div>
                <label className="block text-sm mb-1">Tamaño</label>
                <input className="w-full border rounded px-3 py-2" value={form.tamano}
                  onChange={handleChange("tamano")} placeholder="Pyme / Enterprise" />
              </div>
              <div>
                <label className="block text-sm mb-1">Rating (1–5)</label>
                <input className={`w-full border rounded px-3 py-2 ${formErr.rating ? "border-red-400" : ""}`}
                  type="number" min={1} max={5}
                  value={form.rating} onChange={handleChange("rating")} />
                {formErr.rating && <p className="text-xs text-red-600 mt-1">{formErr.rating}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">Límite de crédito (€)</label>
                <input className="w-full border rounded px-3 py-2" type="number" min={0} step="0.01"
                  value={form.limite_credito} onChange={handleChange("limite_credito")} placeholder="0" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo} onChange={handleChange("activo")} />
              Activo
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                onClick={onClose} disabled={submitting}>Cancelar</button>
              <button type="submit" className="px-3 py-2 text-sm rounded bg-black text-white disabled:opacity-60"
                disabled={submitting}>{submitting ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
