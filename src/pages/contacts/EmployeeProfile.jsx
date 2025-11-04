import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import ModalEmpleado from "../../components/contacts/ModalEmpleado.jsx";

import ContactAttachments from "../../components/contacts/ContactAttachments.jsx";
import ContactAddresses from "../../components/contacts/ContactAddresses.jsx";
import ContactConsents from "../../components/contacts/ContactConsents.jsx";
import EmployeeHours from "../../components/contacts/EmployeeHours.jsx";
import EmployeeCompensations from "../../components/contacts/EmployeeCompensations.jsx";
import EmployeeFinancialsPlaceholder from "../../components/contacts/EmployeeFinancialsPlaceholder.jsx";

export default function EmployeeProfile() {
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
        tpath(org.slug, `/contacts/employees/${id}/`)
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

  const updateEmpleado = async (payload) => {
    try {
      setSubmittingEdit(true);
      await http.patch(tpath(org.slug, `/contacts/employees/${id}/`), payload);
      setToast({ kind: "success", msg: "Empleado actualizado." });
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

  const deleteEmpleado = async () => {
    const ok = window.confirm(
      "¿Eliminar este empleado? Esta acción no se puede deshacer."
    );
    if (!ok) return;
    try {
      await http.delete(tpath(org.slug, `/contacts/employees/${id}/`));
      setToast({ kind: "success", msg: "Empleado eliminado." });
      navigate("/contacts/employees");
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error al eliminar",
      });
    }
  };

  const fullName = useMemo(() => {
    if (!row) return "";
    return (
      [row.nombre, row.apellidos].filter(Boolean).join(" ").trim() ||
      `Empleado #${row.id}`
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
          <h2 className="text-xl font-semibold">{fullName}</h2>
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
            onClick={deleteEmpleado}
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
                  <span className="text-gray-500">Puesto:</span>{" "}
                  {row.empleado?.puesto || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Departamento:</span>{" "}
                  {row.empleado?.departamento || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Ubicación ID:</span>{" "}
                  {row.empleado?.ubicacion ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">Tipo contrato:</span>{" "}
                  {row.empleado?.tipo_contrato || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Jornada:</span>{" "}
                  {row.empleado?.jornada || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Objetivo horas/mes:</span>{" "}
                  {row.empleado?.objetivo_horas_mes ?? "—"}
                </div>
              </div>
            ),
          },
          {
            key: "adjuntos",
            label: "Adjuntos",
            content: () => <ContactAttachments contactId={row.id} />,
          },
          {
            key: "direcciones",
            label: "Direcciones",
            content: () => <ContactAddresses contactId={row.id} />,
          },
          {
            key: "horas",
            label: "Horas",
            content: () => <EmployeeHours contactId={row.id} />,
          },
          {
            key: "compensaciones",
            label: "Compensaciones",
            content: () => <EmployeeCompensations contactId={row.id} />,
          },
          {
            key: "consentimientos",
            label: "Consentimientos",
            content: () => <ContactConsents contactId={row.id} />,
          },
          {
            key: "financials",
            label: "Financials",
            content: EmployeeFinancialsPlaceholder,
          },
        ]}
      />

      <ModalEmpleado
        open={openEdit}
        title="Editar empleado"
        initialData={row}
        onSubmit={updateEmpleado}
        onClose={() => setOpenEdit(false)}
        submitting={submittingEdit}
      />
    </section>
  );
}
