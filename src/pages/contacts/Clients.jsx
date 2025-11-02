import { useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import { useTenantList } from "./useTenantList";
import Toast from "../../components/Toast.jsx";
import ModalCliente from "../../components/contacts/ModalCliente.jsx";
import { downloadCSV } from "../../lib/csv";

export default function Clients() {
  const { org } = useAuth();

  // Forzar refetch con una key en querystring
  const [reloadKey, setReloadKey] = useState(0);
  const path = useMemo(() => `/contacts/clients/?rk=${reloadKey}`, [reloadKey]);

  const { rows, loading, error } = useTenantList(path);

  // Toast global
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  // Crear
  const [openNew, setOpenNew] = useState(false);
  const [submittingNew, setSubmittingNew] = useState(false);

  // Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const createCliente = async (payload) => {
    try {
      setSubmittingNew(true);
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      await http.post(tpath(org.slug, "/contacts/clients/"), payload);
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Cliente creado correctamente." });
      setOpenNew(false);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al crear el cliente.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmittingNew(false);
    }
  };

  const updateCliente = async (id, payload) => {
    try {
      setSubmittingEdit(true);
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      await http.patch(tpath(org.slug, `/contacts/clients/${id}/`), payload);
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Cliente actualizado correctamente." });
      setOpenEdit(false);
      setEditRow(null);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al actualizar el cliente.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const deleteCliente = async (row) => {
    try {
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      const ok = window.confirm(
        `¿Seguro que deseas eliminar el cliente “${row?.name ?? row?.id}”?`
      );
      if (!ok) return;
      await http.delete(tpath(org.slug, `/contacts/clients/${row.id}/`));
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Cliente eliminado correctamente." });
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al eliminar el cliente.";
      setToast({ kind: "error", msg: detail });
    }
  };

  return (
    <section className="space-y-3">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />

      <div className="flex justify-between items-center">
        <h2 className="font-medium">Clientes</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => setOpenNew(true)}
          >
            Nuevo cliente
          </button>
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => downloadCSV("clientes.csv", rows)}
            disabled={!rows?.length}
            title={
              !rows?.length ? "No hay datos para exportar" : "Exportar CSV"
            }
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">ID</th>
                <th className="text-left px-3 py-2 font-medium">Nombre</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Teléfono</th>
                <th className="text-left px-3 py-2 font-medium">NIF/CIF</th>
                <th className="text-left px-3 py-2 font-medium w-40">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-2" colSpan={6}>
                    Cargando…
                  </td>
                </tr>
              ) : !rows?.length ? (
                <tr>
                  <td className="px-3 py-2" colSpan={6}>
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{r.name ?? ""}</td>
                    <td className="px-3 py-2">{r.email ?? ""}</td>
                    <td className="px-3 py-2">{r.phone ?? ""}</td>
                    <td className="px-3 py-2">{r.vat_number ?? ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                          onClick={() => {
                            setEditRow(r);
                            setOpenEdit(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => deleteCliente(r)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nuevo */}
      <ModalCliente
        open={openNew}
        title="Nuevo cliente"
        onSubmit={createCliente}
        onClose={() => !submittingNew && setOpenNew(false)}
        submitting={submittingNew}
      />

      {/* Modal: Editar */}
      <ModalCliente
        open={openEdit}
        title="Editar cliente"
        initialData={editRow ?? undefined}
        onSubmit={async (payload) => {
          if (!editRow?.id) return;
          await updateCliente(editRow.id, payload);
        }}
        onClose={() => !submittingEdit && setOpenEdit(false)}
        submitting={submittingEdit}
      />
    </section>
  );
}
