// --- FILE: src/pages/settings/WebhooksSettingsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import Toast from "../../components/Toast.jsx";
import WebhookModal from "../../components/integrations/WebhookModal.jsx";
import {
  apiListWebhooks,
  apiDeleteWebhook,
  apiListWebhookLogs,
  apiUpdateWebhook,
} from "../../api/integrations.js";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-ES");
}

export default function WebhooksSettingsPage() {
  const { org } = useAuth();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ kind: "", msg: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [current, setCurrent] = useState(null);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedForLogs, setSelectedForLogs] = useState(null);

  const loadWebhooks = async () => {
    if (!org?.slug) return;
    try {
      setLoading(true);
      const items = await apiListWebhooks(org.slug);
      setWebhooks(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          err?.message ||
          "Error al cargar los webhooks.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, [org?.slug]);

  const openCreate = () => {
    setModalMode("create");
    setCurrent(null);
    setModalOpen(true);
  };

  const openEdit = (endpoint) => {
    setModalMode("edit");
    setCurrent(endpoint);
    setModalOpen(true);
  };

  const handleToggleActive = async (endpoint) => {
    if (!org?.slug) return;
    try {
      await apiUpdateWebhook(org.slug, endpoint.id, {
        is_active: !endpoint.is_active,
      });
      await loadWebhooks();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          err?.message ||
          "No se ha podido cambiar el estado del webhook.",
      });
    }
  };

  const handleDelete = async (endpoint) => {
    if (!org?.slug) return;
    const ok = window.confirm(
      `¿Seguro que quieres borrar el webhook "${
        endpoint.name || endpoint.target_url
      }"?`
    );
    if (!ok) return;
    try {
      await apiDeleteWebhook(org.slug, endpoint.id);
      await loadWebhooks();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          err?.message ||
          "No se ha podido borrar el webhook.",
      });
    }
  };

  const handleViewLogs = async (endpoint) => {
    if (!org?.slug) return;
    setSelectedForLogs(endpoint);
    setLogs([]);
    setLogsLoading(true);
    try {
      const items = await apiListWebhookLogs(org.slug, endpoint.id);
      setLogs(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          err?.message ||
          "Error al cargar los logs.",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {toast.msg && (
        <Toast
          kind={toast.kind || "error"}
          msg={toast.msg}
          onClose={() => setToast({ kind: "", msg: "" })}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">Webhooks</p>
          <p className="text-xs text-gray-500">
            Envía eventos de PREATOR (facturas y clientes) a tus propias
            integraciones.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-3 py-1 text-xs rounded bg-black text-white"
        >
          Nuevo webhook
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-2 py-1">Nombre</th>
              <th className="text-left px-2 py-1">Evento</th>
              <th className="text-left px-2 py-1">URL</th>
              <th className="text-left px-2 py-1">Estado</th>
              <th className="text-left px-2 py-1">Último intento</th>
              <th className="text-left px-2 py-1">Activo</th>
              <th className="text-right px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-gray-500">
                  Cargando webhooks...
                </td>
              </tr>
            ) : webhooks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-gray-500">
                  No hay webhooks configurados todavía.
                </td>
              </tr>
            ) : (
              webhooks.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-2 py-1">
                    {w.name || (
                      <span className="text-gray-400">Sin nombre</span>
                    )}
                  </td>
                  <td className="px-2 py-1">{w.event}</td>
                  <td className="px-2 py-1 max-w-xs truncate">
                    <span title={w.target_url}>{w.target_url}</span>
                  </td>
                  <td className="px-2 py-1">
                    {w.last_status || <span className="text-gray-400">-</span>}
                    {w.last_status_code && (
                      <span className="text-gray-500 ml-1">
                        ({w.last_status_code})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {formatDate(w.last_triggered_at)}
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(w)}
                      className={`px-2 py-0.5 rounded text-xs ${
                        w.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {w.is_active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        className="px-2 py-0.5 rounded border text-xs hover:bg-gray-50"
                        onClick={() => openEdit(w)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="px-2 py-0.5 rounded border text-xs hover:bg-gray-50"
                        onClick={() => handleViewLogs(w)}
                      >
                        Logs
                      </button>
                      <button
                        type="button"
                        className="px-2 py-0.5 rounded border text-xs hover:bg-red-50 text-red-600"
                        onClick={() => handleDelete(w)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border rounded-lg p-3">
        <p className="font-medium text-xs mb-2">Logs del webhook</p>
        {!selectedForLogs && (
          <p className="text-xs text-gray-500">
            Selecciona un webhook y pulsa{" "}
            <span className="font-semibold">Logs</span> para ver los últimos
            envíos.
          </p>
        )}
        {selectedForLogs && (
          <>
            <p className="text-xs mb-2">
              Mostrando últimos envíos de:{" "}
              <span className="font-semibold">
                {selectedForLogs.name || selectedForLogs.target_url}
              </span>
            </p>
            {logsLoading ? (
              <p className="text-xs text-gray-500">Cargando logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay logs todavía para este webhook.
              </p>
            ) : (
              <div className="max-h-48 overflow-auto border rounded">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-2 py-1">Fecha</th>
                      <th className="text-left px-2 py-1">Estado</th>
                      <th className="text-left px-2 py-1">Código</th>
                      <th className="text-left px-2 py-1">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-2 py-1">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-2 py-1">{log.status}</td>
                        <td className="px-2 py-1">
                          {log.last_status_code ?? "-"}
                        </td>
                        <td className="px-2 py-1 max-w-xs truncate">
                          <span title={log.last_error}>
                            {log.last_error || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <WebhookModal
        open={modalOpen}
        mode={modalMode}
        initial={current}
        onClose={() => setModalOpen(false)}
        onSaved={loadWebhooks}
      />
    </div>
  );
}
