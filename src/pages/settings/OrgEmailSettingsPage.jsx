// --- FILE: src/pages/settings/OrgEmailSettingsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  apiGetOrgEmailSettings,
  apiUpdateOrgEmailSettings,
  apiTestOrgEmail,
} from "../../api/email.js";
import Toast from "../../components/Toast.jsx";

function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  return fallback;
}

export default function OrgEmailSettingsPage() {
  const { org } = useAuth();
  const [form, setForm] = useState({
    from_name: "",
    from_email: "",
    reply_to_email: "",
    bcc_on_outgoing: false,
    send_system_emails: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState({ kind: "", msg: "" });

  useEffect(() => {
    const load = async () => {
      if (!org?.slug) return;
      try {
        setLoading(true);
        const data = await apiGetOrgEmailSettings(org.slug);
        setForm((prev) => ({
          ...prev,
          ...data,
        }));
      } catch (err) {
        console.error(err);
        setToast({
          kind: "error",
          msg: getErrorMessage(
            err,
            "No se han podido cargar los ajustes de correo."
          ),
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [org?.slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;
    try {
      setSaving(true);
      await apiUpdateOrgEmailSettings(org.slug, form);
      setToast({
        kind: "success",
        msg: "Ajustes de correo guardados correctamente.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: getErrorMessage(err, "Error al guardar los ajustes de correo."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!org?.slug) return;
    try {
      setTesting(true);
      await apiTestOrgEmail(org.slug);
      setToast({
        kind: "success",
        msg: "Email de prueba enviado. Revisa tu bandeja.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: getErrorMessage(err, "No se ha podido enviar el email de prueba."),
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando ajustes...</p>;
  }

  return (
    <>
      {toast.msg && (
        <div className="mb-3">
          <Toast
            kind={toast.kind || "success"}
            msg={toast.msg}
            onClose={() => setToast({ kind: "", msg: "" })}
          />
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre remitente
          </label>
          <input
            type="text"
            name="from_name"
            value={form.from_name || ""}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Ej: PREATOR ERP"
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre que verán tus clientes al recibir los emails.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email remitente
          </label>
          <input
            type="email"
            name="from_email"
            value={form.from_email || ""}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="no-reply@tudominio.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Dirección desde la que se enviarán los emails (configurada en
            Migadu).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Reply-To (responder a)
          </label>
          <input
            type="email"
            name="reply_to_email"
            value={form.reply_to_email || ""}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="soporte@tudominio.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Si tus clientes responden a un email, este será el correo de
            destino.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="bcc_on_outgoing"
              checked={!!form.bcc_on_outgoing}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <span>Enviar copia oculta a esta organización</span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            Guarda una copia de todos los emails enviados desde PREATOR.
          </p>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="send_system_emails"
              checked={!!form.send_system_emails}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <span>Permitir emails de sistema (avisos, pruebas, etc.)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-black text-white disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar ajustes"}
          </button>

          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-60"
          >
            {testing ? "Enviando..." : "Enviar email de prueba"}
          </button>
        </div>
      </form>
    </>
  );
}
