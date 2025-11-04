import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import ModalProveedor from "../../components/contacts/ModalProveedor.jsx";

import SupplierNotes from "../../components/contacts/SupplierNotes.jsx";
import SupplierPrices from "../../components/contacts/SupplierPrices.jsx";
import SupplierCertifications from "../../components/contacts/SupplierCertifications.jsx";
import SupplierKPIsPlaceholder from "../../components/contacts/SupplierKPIsPlaceholder.jsx";
import ContactAddresses from "../../components/contacts/ContactAddresses.jsx";
import ContactConsents from "../../components/contacts/ContactConsents.jsx";

import { useAuth as useAuth2 } from "../../auth/AuthProvider.jsx"; // evitar tree-shake accidental

export default function SupplierProfile() {
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
        tpath(org.slug, `/contacts/suppliers/${id}/`)
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

  const updateProveedor = async (payload) => {
    try {
      setSubmittingEdit(true);
      await http.patch(tpath(org.slug, `/contacts/suppliers/${id}/`), payload);
      setToast({ kind: "success", msg: "Proveedor actualizado." });
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

  const deleteProveedor = async () => {
    const ok = window.confirm(
      "¿Eliminar este proveedor? Esta acción no se puede deshacer."
    );
    if (!ok) return;
    try {
      await http.delete(tpath(org.slug, `/contacts/suppliers/${id}/`));
      setToast({ kind: "success", msg: "Proveedor eliminado." });
      navigate("/contacts/suppliers");
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
      `Proveedor #${row.id}`
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
            onClick={deleteProveedor}
          >
            Eliminar
          </button>
        </div>
      </div>

      <Tabs
        initial={0}
        tabs={[
          {
            key: "datos",
            label: "Datos",
            content: () => (
              <div className="border rounded p-3 text-sm grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-gray-500">Plazo de pago:</span>{" "}
                  {row.proveedor?.plazo_pago || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Categorías:</span>{" "}
                  {Array.isArray(row.proveedor?.categorias_suministro)
                    ? row.proveedor.categorias_suministro.join(", ")
                    : "—"}
                </div>
                <div>
                  <span className="text-gray-500">Preferente:</span>{" "}
                  {row.proveedor?.es_preferente ? "Sí" : "No"}
                </div>
                <div>
                  <span className="text-gray-500">Calidad:</span>{" "}
                  {row.proveedor?.calidad_rating ?? "—"}
                </div>
              </div>
            ),
          },
          // Adjuntos específicos de proveedor (si quieres genéricos, usa ContactAttachments)
          {
            key: "direcciones",
            label: "Direcciones",
            content: () => <ContactAddresses contactId={row.id} />,
          },
          {
            key: "notas",
            label: "Notas",
            content: () => <SupplierNotes supplierId={row.id} />,
          },
          {
            key: "precios",
            label: "Precios",
            content: () => <SupplierPrices supplierId={row.id} />,
          },
          {
            key: "certs",
            label: "Certificaciones",
            content: () => <SupplierCertifications supplierId={row.id} />,
          },
          {
            key: "consentimientos",
            label: "Consentimientos",
            content: () => <ContactConsents contactId={row.id} />,
          },
          { key: "kpis", label: "KPIs", content: SupplierKPIsPlaceholder },
        ]}
      />

      <ModalProveedor
        open={openEdit}
        title="Editar proveedor"
        initialData={row}
        onSubmit={updateProveedor}
        onClose={() => setOpenEdit(false)}
        submitting={submittingEdit}
      />
    </section>
  );
}
