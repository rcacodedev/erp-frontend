import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

export default function ContactAttachments({ contactId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  const load = async () => {
    if (!org?.slug || !contactId) return;
    try {
      const { data } = await http.get(
        tpath(org.slug, `/contacts/${contactId}/attachments/`)
      );
      setRows(Array.isArray(data?.results) ? data.results : data ?? []);
    } catch (e) {
      setToast({
        kind: "error",
        msg:
          e?.response?.data?.detail || e.message || "Error al cargar adjuntos",
      });
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, contactId]);

  const upload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("nombre_original", file.name);
      await http.post(
        tpath(org.slug, `/contacts/${contactId}/attachments/`),
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setToast({ kind: "success", msg: "Fichero subido." });
      await load();
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error al subir adjunto",
      });
    } finally {
      setUploading(false);
    }
  };

  const download = async (id) => {
    try {
      const url = tpath(
        org.slug,
        `/contacts/${contactId}/attachments/${id}/download/`
      );
      window.open(url, "_blank");
    } catch {
      setToast({ kind: "error", msg: "No se pudo descargar." });
    }
  };

  return (
    <section className="space-y-3">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Adjuntos</h3>
        <label className="text-sm">
          <span className="px-3 py-1.5 rounded border cursor-pointer">
            Subir fichero
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
            disabled={uploading}
          />
        </label>
      </div>
      <ul className="text-sm list-disc pl-5">
        {rows?.length ? (
          rows.map((f) => (
            <li key={f.id}>
              {f.nombre_original || f.file}{" "}
              {f.categoria ? `· ${f.categoria}` : ""}{" "}
              <button
                className="underline text-xs ml-2"
                onClick={() => download(f.id)}
              >
                descargar
              </button>
            </li>
          ))
        ) : (
          <li className="list-none text-gray-500">Sin adjuntos</li>
        )}
      </ul>
    </section>
  );
}
