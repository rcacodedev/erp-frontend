import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import ModalCliente from "../../components/contacts/ModalCliente.jsx";

import ClientAttachments from "../../components/contacts/ClientAttachments.jsx";
import ClientEvents from "../../components/contacts/ClientEvents.jsx";
import ClientNotes from "../../components/contacts/ClientNotes.jsx";
import ClientInvoicesPlaceholder from "../../components/contacts/ClientInvoicesPlaceholder.jsx";
import ContactAddresses from "../../components/contacts/ContactAddresses.jsx";
import ContactConsents from "../../components/contacts/ContactConsents.jsx";

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { org } = useAuth();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  const [openEdit, setOpenEdit] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const load = async () => {
    if (!org?.slug || !id) return;
    setLoading(true);
    try {
      const { data } = await http.get(
        tpath(org.slug, `/contacts/clients/${id}/`)
      );
      setRow(data);
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error cargando perfil",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, id]);

  const updateCliente = async (payload) => {
    try {
      setSubmittingEdit(true);
      await http.patch(tpath(org.slug, `/contacts/clients/${id}/`), payload);
      setToast({ kind: "success", msg: "Cliente actualizado." });
      setOpenEdit(false);
      await load();
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error al actualizar",
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const deleteCliente = async () => {
    const ok = window.confirm(
      "¿Eliminar este cliente? Esta acción no se puede deshacer."
    );
    if (!ok) return;
    try {
      await http.delete(tpath(org.slug, `/contacts/clients/${id}/`));
      setToast({ kind: "success", msg: "Cliente eliminado." });
      navigate("/contacts/clients");
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error al eliminar",
      });
    }
  };

  const title = useMemo(() => {
    if (!row) return "";
    return (
      row.razon_social?.trim() ||
      [row.nombre, row.apellidos].filter(Boolean).join(" ").trim() ||
      `Cliente #${row.id}`
    );
  }, [row]);

  if (loading) return <div className="p-4">Cargando…</div>;
  if (!row) return <div className="p-4">No encontrado.</div>;

  return (
    <section className="space-y-4">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />

      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-600">
            ID: {row.id} · Email: {row.email || "—"} · Tel:{" "}
            {row.telefono || "—"}
          </p>
          <p className="text-sm text-gray-600">
            NIF/NIE: {row.documento_id || "—"} · Activo:{" "}
            {row.activo ? "Sí" : "No"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => setOpenEdit(true)}
          >
            Editar
          </button>
          <button
            className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm"
            onClick={deleteCliente}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        initial={0}
        tabs={[
          {
            key: "datos",
            label: "Datos",
            content: () => (
              <div className="border rounded p-3 text-sm grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-gray-500">Cliente desde:</span>{" "}
                  {row.cliente?.cliente_desde || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Sector:</span>{" "}
                  {row.cliente?.sector || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Tamaño:</span>{" "}
                  {row.cliente?.tamano || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Rating:</span>{" "}
                  {row.cliente?.rating ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">Límite crédito:</span>{" "}
                  {row.cliente?.limite_credito ?? "—"}
                </div>
              </div>
            ),
          },
          {
            key: "adjuntos",
            label: "Adjuntos",
            content: () => <ClientAttachments clientId={row.id} />,
          },
          {
            key: "direcciones",
            label: "Direcciones",
            content: () => <ContactAddresses contactId={row.id} />,
          },
          {
            key: "notas",
            label: "Notas",
            content: () => <ClientNotes clientId={row.id} />,
          },
          {
            key: "eventos",
            label: "Eventos",
            content: () => <ClientEvents clientId={row.id} />,
          },
          {
            key: "consentimientos",
            label: "Consentimientos",
            content: () => <ContactConsents contactId={row.id} />,
          },
          {
            key: "facturacion",
            label: "Facturación",
            content: ClientInvoicesPlaceholder,
          },
        ]}
      />

      <ModalCliente
        open={openEdit}
        title="Editar cliente"
        initialData={row}
        onSubmit={updateCliente}
        onClose={() => setOpenEdit(false)}
        submitting={submittingEdit}
      />
    </section>
  );
}
