import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import ModalEmpleado from "../../components/contacts/ModalEmpleado.jsx";
import { downloadCSV } from "../../lib/csv";
import { Link } from "react-router-dom";

function displayName(r) {
  return (
    [r.nombre, r.apellidos].filter(Boolean).join(" ").trim() ||
    r.razon_social ||
    ""
  );
}
function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Employees() {
  const { org } = useAuth();

  // filtros / búsqueda / orden
  const [search, setSearch] = useState("");
  const [activo, setActivo] = useState("");
  const [bloqueado, setBloqueado] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [ordering, setOrdering] = useState("nombre");
  const searchDeb = useDebouncedValue(search, 400);

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const PAGE_SIZE_MUTABLE = true;

  // datos
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // query de lista (endpoint dedicado)
  const listQueryPath = useMemo(() => {
    const p = new URLSearchParams();
    if (searchDeb.trim()) p.set("search", searchDeb.trim());
    if (activo === "true" || activo === "false") p.set("activo", activo);
    if (bloqueado === "true" || bloqueado === "false")
      p.set("bloqueado", bloqueado);
    if (etiquetas.trim()) p.set("etiquetas", etiquetas.trim());
    if (ordering) p.set("ordering", ordering);
    p.set("page", String(page));
    if (PAGE_SIZE_MUTABLE) p.set("page_size", String(pageSize));
    p.set("rk", String(reloadKey));
    return `/contacts/employees/?${p.toString()}`;
  }, [
    searchDeb,
    activo,
    bloqueado,
    etiquetas,
    ordering,
    page,
    pageSize,
    reloadKey,
  ]);

  useEffect(() => {
    setLoading(true);
    setError("");
    setRows([]);
    setCount(0);
    let cancelled = false;
    async function fetchPage() {
      try {
        if (!org?.slug) return;
        const { data } = await http.get(tpath(org.slug, listQueryPath));
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        if (!cancelled) {
          setRows(results);
          setCount(
            typeof data?.count === "number" ? data.count : results.length
          );
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.detail || e.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [org?.slug, listQueryPath]);

  useEffect(() => {
    setPage(1);
  }, [searchDeb, activo, bloqueado, etiquetas, ordering, pageSize]);

  // toasts
  const [toast, setToast] = useState({ kind: "success", msg: "" });

  // modales
  const [openNew, setOpenNew] = useState(false);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // CREATE → /contacts/employees/
  const createEmpleado = async (payload) => {
    try {
      setSubmittingNew(true);
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      await http.post(tpath(org.slug, "/contacts/employees/"), payload);
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Empleado creado correctamente." });
      setOpenNew(false);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al crear el empleado.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmittingNew(false);
    }
  };

  // UPDATE → /contacts/employees/{id}/
  const updateEmpleado = async (id, payload) => {
    try {
      setSubmittingEdit(true);
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      await http.patch(tpath(org.slug, `/contacts/employees/${id}/`), payload);
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Empleado actualizado correctamente." });
      setOpenEdit(false);
      setEditRow(null);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al actualizar el empleado.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // DELETE → /contacts/employees/{id}/
  const deleteEmpleado = async (row) => {
    try {
      if (!org?.slug) throw new Error("Falta el slug de la organización.");
      const ok = window.confirm(
        `¿Seguro que deseas eliminar “${displayName(row) || row.id}”?`
      );
      if (!ok) return;
      await http.delete(tpath(org.slug, `/contacts/employees/${row.id}/`));
      setReloadKey((k) => k + 1);
      setToast({ kind: "success", msg: "Empleado eliminado correctamente." });
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al eliminar.";
      setToast({ kind: "error", msg: detail });
    }
  };

  // Exportar TODO desde /contacts/employees/
  const exportCSV = async () => {
    if (!org?.slug) return;
    try {
      const base = new URLSearchParams();
      if (searchDeb.trim()) base.set("search", searchDeb.trim());
      if (activo === "true" || activo === "false") base.set("activo", activo);
      if (bloqueado === "true" || bloqueado === "false")
        base.set("bloqueado", bloqueado);
      if (etiquetas.trim()) base.set("etiquetas", etiquetas.trim());
      if (ordering) base.set("ordering", ordering);

      const CHUNK = 1000;
      let pageNum = 1;
      let all = [];
      while (true) {
        const p = new URLSearchParams(base);
        p.set("page", String(pageNum));
        p.set("page_size", String(CHUNK));
        const { data } = await http.get(
          tpath(org.slug, `/contacts/employees/?${p.toString()}`)
        );
        const results = Array.isArray(data?.results) ? data.results : [];
        all = all.concat(results);
        if (!data?.next || results.length === 0) break;
        pageNum += 1;
        if (all.length >= 50000) break;
      }

      const mapped = all.map((r) => ({
        id: r.id,
        nombre: displayName(r),
        email: r.email || "",
        telefono: r.telefono || "",
        documento_id: r.documento_id || "",
        activo: r.activo ? "sí" : "no",
      }));
      downloadCSV("empleados.csv", mapped);
    } catch (e) {
      setToast({
        kind: "error",
        msg: e?.response?.data?.detail || e.message || "Error al exportar",
      });
    }
  };

  return (
    <section className="space-y-4">
      <Toast
        kind={toast.kind}
        msg={toast.msg}
        onClose={() => setToast((t) => ({ ...t, msg: "" }))}
      />

      {/* Barra superior */}
      <div className="flex items-center">
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={exportCSV}
            title="Exportar CSV (todo lo filtrado)"
          >
            Exportar CSV
          </button>
        </div>
        <div className="ml-auto">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => setOpenNew(true)}
          >
            Nuevo empleado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="border rounded p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Buscar</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Nombre, email, teléfono, NIF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Activo</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={activo}
              onChange={(e) => setActivo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Bloqueado</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={bloqueado}
              onChange={(e) => setBloqueado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Etiqueta</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="ej. rrhh"
              value={etiquetas}
              onChange={(e) => setEtiquetas(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Orden</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="nombre">Nombre ↑</option>
              <option value="-nombre">Nombre ↓</option>
              <option value="updated_at">Actualizado ↑</option>
              <option value="-updated_at">Actualizado ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
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
                <th className="text-left px-3 py-2 font-medium">NIF/NIE</th>
                <th className="text-left px-3 py-2 font-medium">Activo</th>
                <th className="text-left px-3 py-2 font-medium w-40">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-2" colSpan={7}>
                    Cargando…
                  </td>
                </tr>
              ) : !rows?.length ? (
                <tr>
                  <td className="px-3 py-2" colSpan={7}>
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{displayName(r)}</td>
                    <td className="px-3 py-2">{r.email ?? ""}</td>
                    <td className="px-3 py-2">{r.telefono ?? ""}</td>
                    <td className="px-3 py-2">{r.documento_id ?? ""}</td>
                    <td className="px-3 py-2">{r.activo ? "Sí" : "No"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                          to={`/contacts/employees/${r.id}`}
                        >
                          Perfil
                        </Link>
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
                          onClick={() => deleteEmpleado(r)}
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

      {/* Paginación */}
      <div className="flex items-center gap-3 justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>Página</span>
          <button
            className="px-2 py-1 rounded border disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            ←
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>
            {page} / {Math.max(1, Math.ceil(count / pageSize))}
          </span>
          <button
            className="px-2 py-1 rounded border disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={
              page >= Math.max(1, Math.ceil(count / pageSize)) || loading
            }
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>Filas por página</span>
          <select
            className="border rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            disabled={!PAGE_SIZE_MUTABLE}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-gray-500">{count} total</span>
        </div>
      </div>

      {/* Modales */}
      <ModalEmpleado
        open={openNew}
        title="Nuevo empleado"
        onSubmit={createEmpleado}
        onClose={() => !submittingNew && setOpenNew(false)}
        submitting={submittingNew}
      />
      <ModalEmpleado
        open={openEdit}
        title="Editar empleado"
        initialData={editRow ?? undefined}
        onSubmit={async (payload) => {
          if (!editRow?.id) return;
          await updateEmpleado(editRow.id, payload);
        }}
        onClose={() => !submittingEdit && setOpenEdit(false)}
        submitting={submittingEdit}
      />
    </section>
  );
}
