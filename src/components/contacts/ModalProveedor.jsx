import { useEffect, useMemo, useState } from "react";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalProveedor({
  open,
  title = "Nuevo proveedor",
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
    // Perfil proveedor (opcionales)
    plazo_pago: "",
    categorias_suministro: "",
    es_preferente: false,
    calidad_rating: 3,
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
      plazo_pago: initialData?.proveedor?.plazo_pago ?? "",
      categorias_suministro: Array.isArray(
        initialData?.proveedor?.categorias_suministro
      )
        ? initialData.proveedor.categorias_suministro.join(", ")
        : "",
      es_preferente: initialData?.proveedor?.es_preferente ?? false,
      calidad_rating: initialData?.proveedor?.calidad_rating ?? 3,
    });
    setFormErr({});
  }, [open, initialData]);

  const validate = () => {
    const e = {};
    if (!(form.razon_social.trim() || form.nombre.trim())) {
      e.razon_social = "Nombre o razón social es obligatorio.";
      e.nombre = "Nombre o razón social es obligatorio.";
    }
    if (form.email && !emailRegex.test(form.email))
      e.email = "Formato de email no válido.";
    if (
      form.calidad_rating != null &&
      (Number(form.calidad_rating) < 1 || Number(form.calidad_rating) > 5)
    )
      e.calidad_rating = "Rating 1-5.";
    return e;
  };

  const payload = useMemo(() => {
    const base = {
      tipo: "supplier",
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
    const proveedor = {};
    if (form.plazo_pago) proveedor.plazo_pago = form.plazo_pago.trim();
    if (form.categorias_suministro) {
      proveedor.categorias_suministro = form.categorias_suministro
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    proveedor.es_preferente = !!form.es_preferente;
    if (form.calidad_rating != null && form.calidad_rating !== "")
      proveedor.calidad_rating = Number(form.calidad_rating);
    if (Object.keys(proveedor).length) base.proveedor = proveedor;
    return base;
  }, [form]);

  const handleChange = (k) => (ev) => {
    const v =
      k === "es_persona" || k === "activo" || k === "es_preferente"
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
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg border">
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
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.nombre ? "border-red-400" : ""
                  }`}
                  value={form.nombre}
                  onChange={handleChange("nombre")}
                  placeholder="Juan"
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
                  placeholder="García Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Razón social</label>
              <input
                className={`w-full border rounded px-3 py-2 ${
                  formErr.razon_social ? "border-red-400" : ""
                }`}
                value={form.razon_social}
                onChange={handleChange("razon_social")}
                placeholder="SUMINISTROS S.A."
              />
              {formErr.razon_social && (
                <p className="text-xs text-red-600 mt-1">
                  {formErr.razon_social}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre comercial</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.nombre_comercial}
                  onChange={handleChange("nombre_comercial")}
                  placeholder="SUMI"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.email ? "border-red-400" : ""
                  }`}
                  value={form.email}
                  onChange={handleChange("email")}
                  type="email"
                  placeholder="contacto@proveedor.com"
                />
                {formErr.email && (
                  <p className="text-xs text-red-600 mt-1">{formErr.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Teléfono</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.telefono}
                  onChange={handleChange("telefono")}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Documento ID</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.documento_id}
                  onChange={handleChange("documento_id")}
                  placeholder="A12345678"
                />
              </div>
            </div>

            {/* Perfil proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Plazo de pago</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.plazo_pago}
                  onChange={handleChange("plazo_pago")}
                  placeholder="30 días"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Categorías suministro
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.categorias_suministro}
                  onChange={handleChange("categorias_suministro")}
                  placeholder="acero, embalaje, reactivos"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separadas por comas.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.es_preferente}
                  onChange={handleChange("es_preferente")}
                />
                Proveedor preferente
              </label>
              <div>
                <label className="block text-sm mb-1">Calidad (1–5)</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    formErr.calidad_rating ? "border-red-400" : ""
                  }`}
                  type="number"
                  min={1}
                  max={5}
                  value={form.calidad_rating}
                  onChange={handleChange("calidad_rating")}
                />
                {formErr.calidad_rating && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErr.calidad_rating}
                  </p>
                )}
              </div>
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
