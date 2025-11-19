// src/pages/purchases/PurchasesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";

function displayContactName(c) {
  if (!c) return "";
  return (
    c.razon_social?.trim() ||
    [c.nombre, c.apellidos].filter(Boolean).join(" ").trim() ||
    c.nombre_comercial ||
    ""
  );
}

function formatMoney(v) {
  if (v === null || v === undefined) return "-";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return num.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

/* ---------- ESTADOS EN ESPAÑOL ---------- */

function StatusPill({ value }) {
  if (!value) return null;

  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium";

  const styles = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-50 text-blue-700",
    partially_received: "bg-amber-50 text-amber-700",
    received: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
    posted: "bg-emerald-50 text-emerald-700",
    unpaid: "bg-red-50 text-red-700",
    partial: "bg-amber-50 text-amber-700",
    paid: "bg-emerald-50 text-emerald-800",
  };

  const labels = {
    draft: "Borrador",
    sent: "Enviado",
    partially_received: "Parcialmente recibido",
    received: "Recibido",
    cancelled: "Cancelado",
    posted: "Contabilizada",
    unpaid: "Pendiente de pago",
    partial: "Pago parcial",
    paid: "Pagada",
  };

  return (
    <span className={`${base} ${styles[value] || "bg-gray-100 text-gray-800"}`}>
      {labels[value] || value}
    </span>
  );
}

/* ---------- MODAL GENÉRICO ---------- */

function BasicModal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div
        className={`bg-white rounded-xl shadow-xl w-full mx-3 ${
          wide ? "max-w-5xl" : "max-w-md"
        } max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------- MODAL NUEVO PEDIDO (con selects) ---------- */

function NewOrderModal({
  org,
  suppliers,
  warehouses,
  onClose,
  onCreated,
  setToast,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    number: "",
    date: today,
    expected_date: today,
    supplier: "",
    warehouse: "",
    notes_internal: "",
    notes_supplier: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;
    if (!form.number || !form.supplier || !form.warehouse) {
      setToast({
        kind: "error",
        msg: "Número, proveedor y almacén son obligatorios.",
      });
      return;
    }
    try {
      setSaving(true);
      setToast(null);
      await http.post(tpath(org.slug, "/purchases/orders/"), {
        number: form.number,
        date: form.date,
        expected_date: form.expected_date || null,
        supplier: form.supplier,
        warehouse: form.warehouse,
        currency: "EUR",
        notes_internal: form.notes_internal,
        notes_supplier: form.notes_supplier,
      });
      await onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo crear el pedido de proveedor.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BasicModal title="Nuevo pedido a proveedor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="space-y-1">
          <label className="block text-xs font-medium">Número</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.number}
            onChange={handleChange("number")}
            placeholder="PO-2025-0001"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium">Fecha</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.date}
              onChange={handleChange("date")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Fecha prevista recepción
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.expected_date}
              onChange={handleChange("expected_date")}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Proveedor</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.supplier}
            onChange={handleChange("supplier")}
          >
            <option value="">Selecciona proveedor…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {displayContactName(s)}
              </option>
            ))}
          </select>
          {suppliers.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No se han encontrado proveedores en esta organización.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Almacén</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.warehouse}
            onChange={handleChange("warehouse")}
          >
            <option value="">Selecciona almacén…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} – {w.name}
              </option>
            ))}
          </select>
          {warehouses.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No hay almacenes configurados. Crea al menos uno en Inventario.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Notas internas</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={form.notes_internal}
            onChange={handleChange("notes_internal")}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium">
            Notas al proveedor
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={form.notes_supplier}
            onChange={handleChange("notes_supplier")}
          />
        </div>
        <div className="pt-1 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded text-xs border"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1 rounded text-xs bg-black text-white disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear pedido"}
          </button>
        </div>
      </form>
    </BasicModal>
  );
}

/* ---------- MODAL NUEVA FACTURA (con selects) ---------- */

function NewInvoiceModal({
  org,
  suppliers,
  warehouses,
  defaultSupplierId,
  onClose,
  onCreated,
  setToast,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    number: "",
    supplier_invoice_number: "",
    date: today,
    due_date: today,
    supplier: defaultSupplierId || "",
    warehouse: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;
    if (!form.number || !form.supplier || !form.warehouse) {
      setToast({
        kind: "error",
        msg: "Número, proveedor y almacén son obligatorios.",
      });
      return;
    }
    try {
      setSaving(true);
      setToast(null);
      await http.post(tpath(org.slug, "/purchases/invoices/"), {
        number: form.number,
        supplier_invoice_number: form.supplier_invoice_number || "",
        date: form.date,
        due_date: form.due_date || null,
        supplier: form.supplier,
        warehouse: form.warehouse,
        currency: "EUR",
        notes: form.notes,
      });
      await onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo crear la factura de proveedor.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BasicModal title="Nueva factura de proveedor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="space-y-1">
          <label className="block text-xs font-medium">Número interno</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.number}
            onChange={handleChange("number")}
            placeholder="SINV-2025-0001"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium">
            Nº factura proveedor (opcional)
          </label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.supplier_invoice_number}
            onChange={handleChange("supplier_invoice_number")}
            placeholder="Número tal cual viene en la factura del proveedor"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium">Fecha factura</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.date}
              onChange={handleChange("date")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Fecha vencimiento
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.due_date}
              onChange={handleChange("due_date")}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Proveedor</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.supplier}
            onChange={handleChange("supplier")}
          >
            <option value="">Selecciona proveedor…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {displayContactName(s)}
              </option>
            ))}
          </select>
          {suppliers.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No se han encontrado proveedores en esta organización.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Almacén</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.warehouse}
            onChange={handleChange("warehouse")}
          >
            <option value="">Selecciona almacén…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} – {w.name}
              </option>
            ))}
          </select>
          {warehouses.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No hay almacenes configurados. Crea al menos uno en Inventario.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Notas</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={form.notes}
            onChange={handleChange("notes")}
          />
        </div>
        <div className="pt-1 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded text-xs border"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1 rounded text-xs bg-black text-white disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear factura"}
          </button>
        </div>
      </form>
    </BasicModal>
  );
}

function OrderLinesModal({
  org,
  orderId,
  onClose,
  setToast,
  products = [],
  onUpdated,
}) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newLine, setNewLine] = useState({
    product: "",
    description: "",
    qty: 1,
    uom: "unidad",
    unit_price: 0,
    tax_rate: 21,
    discount_pct: 0,
  });

  useEffect(() => {
    if (!org?.slug || !orderId) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data } = await http.get(
          tpath(org.slug, `/purchases/orders/${orderId}/`)
        );
        setOrder(data);
      } catch (err) {
        console.error(err);
        setToast({
          kind: "error",
          msg:
            err?.response?.data?.detail ||
            "Error cargando el detalle del pedido.",
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [org?.slug, orderId, onClose, setToast]);

  const lines = Array.isArray(order?.lines) ? order.lines : [];

  const handleNewLineChange = (field, value) => {
    setNewLine((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewLineProductChange = (value) => {
    const productId = value || "";
    const productObj = products.find((p) => String(p.id) === String(productId));
    setNewLine((prev) => ({
      ...prev,
      product: productId,
      description:
        prev.description && prev.description.trim().length > 0
          ? prev.description
          : productObj?.name || "",
      uom: productObj?.uom || prev.uom || "unidad",
    }));
  };

  const createLine = async (e) => {
    e?.preventDefault?.();
    if (!org?.slug || !order?.id) return;

    if (!newLine.description && !newLine.product) {
      setToast({
        kind: "error",
        msg: "Al menos pon una descripción o un producto.",
      });
      return;
    }

    try {
      setCreating(true);
      setToast(null);

      await http.post(
        tpath(org.slug, `/purchases/orders/${order.id}/add_line/`),
        {
          product: newLine.product || null,
          description: newLine.description || "",
          qty: Number(newLine.qty) || 0,
          uom: newLine.uom || "unidad",
          unit_price: newLine.unit_price || "0.00",
          tax_rate: newLine.tax_rate || "21.00",
          discount_pct: newLine.discount_pct || "0.00",
        }
      );

      // Refrescamos el pedido con totales y líneas
      const { data } = await http.get(
        tpath(org.slug, `/purchases/orders/${orderId}/`)
      );
      setOrder(data);
      onUpdated && (await onUpdated());

      setNewLine({
        product: "",
        description: "",
        qty: 1,
        uom: "unidad",
        unit_price: 0,
        tax_rate: 21,
        discount_pct: 0,
      });

      setToast({
        kind: "success",
        msg: "Línea añadida al pedido.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail || "No se pudo crear la línea de pedido.",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!order) {
    return (
      <BasicModal title="Detalle del pedido" onClose={onClose} wide={true}>
        {loading ? (
          <p className="text-sm text-gray-600">Cargando…</p>
        ) : (
          <p className="text-sm text-gray-600">No se encontró el pedido.</p>
        )}
      </BasicModal>
    );
  }

  return (
    <BasicModal
      title={`Pedido ${order.number} · detalle de líneas`}
      onClose={onClose}
      wide={true}
    >
      <div className="text-xs text-gray-600 space-y-1 mb-2">
        <p>
          Fecha: {order.date} · Proveedor:{" "}
          {displayContactName(order.supplier_detail || order.supplier)}
        </p>
        <p>
          Almacén:{" "}
          {order.warehouse_detail
            ? `${order.warehouse_detail.code} – ${order.warehouse_detail.name}`
            : "—"}
        </p>
        <p>
          Estado: <StatusPill value={order.status} />
        </p>
      </div>

      <div className="border rounded overflow-auto max-h-[55vh] text-xs mb-3">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Producto</th>
              <th className="px-2 py-1 text-left font-medium">Descripción</th>
              <th className="px-2 py-1 text-right font-medium">Ud.</th>
              <th className="px-2 py-1 text-right font-medium">Precio</th>
              <th className="px-2 py-1 text-right font-medium">IVA%</th>
              <th className="px-2 py-1 text-right font-medium">Dto%</th>
              <th className="px-2 py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-2 text-center text-gray-600 text-xs"
                >
                  Este pedido aún no tiene líneas de detalle.
                </td>
              </tr>
            ) : (
              lines.map((ln) => (
                <tr key={ln.id} className="border-t align-top">
                  <td className="px-2 py-1">
                    {ln.product_name || ln.product || "—"}
                  </td>
                  <td className="px-2 py-1">{ln.description || "—"}</td>
                  <td className="px-2 py-1 text-right">{ln.qty ?? "—"}</td>
                  <td className="px-2 py-1 text-right">
                    {formatMoney(ln.unit_price)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {ln.tax_rate != null ? `${ln.tax_rate}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {ln.discount_pct != null ? `${ln.discount_pct}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {formatMoney(ln.line_total)}
                  </td>
                </tr>
              ))
            )}

            {/* Fila nueva línea */}
            <tr className="border-t bg-gray-50/60">
              <td className="px-2 py-1 align-top">
                <select
                  className="w-full border rounded px-1 py-0.5 text-[11px]"
                  value={newLine.product}
                  onChange={(e) => handleNewLineProductChange(e.target.value)}
                >
                  <option value="">(sin producto)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `${p.sku} – ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-600">
                    No hay productos en Inventario. Crea alguno en el módulo de
                    Inventario para poder enlazarlos aquí.
                  </p>
                )}
              </td>
              <td className="px-2 py-1">
                <textarea
                  className="w-full border rounded px-1 py-0.5 text-[11px]"
                  rows={2}
                  value={newLine.description}
                  onChange={(e) =>
                    handleNewLineChange("description", e.target.value)
                  }
                  placeholder="Descripción"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.qty}
                  onChange={(e) => handleNewLineChange("qty", e.target.value)}
                  step="0.01"
                />
                <p className="mt-0.5 text-[10px] text-gray-500">
                  UoM: {newLine.uom || "unidad"}
                </p>
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.unit_price}
                  onChange={(e) =>
                    handleNewLineChange("unit_price", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.tax_rate}
                  onChange={(e) =>
                    handleNewLineChange("tax_rate", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.discount_pct}
                  onChange={(e) =>
                    handleNewLineChange("discount_pct", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1 text-right align-middle">
                <button
                  type="button"
                  className="text-[10px] underline"
                  disabled={creating}
                  onClick={createLine}
                >
                  {creating ? "Añadiendo…" : "Añadir línea"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-1 text-[11px] text-gray-500">
        Los totales del pedido se recalculan automáticamente al añadir líneas.
        De momento las líneas existentes son de sólo lectura; más adelante, si
        ampliamos backend, podemos permitir edición/borrado.
      </p>
    </BasicModal>
  );
}

function InvoiceLinesModal({
  org,
  invoiceId,
  onClose,
  setToast,
  onUpdated,
  products = [],
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newLine, setNewLine] = useState({
    product: "",
    description: "",
    qty: 1,
    uom: "unidad",
    unit_price: 0,
    tax_rate: 21,
    discount_pct: 0,
  });

  useEffect(() => {
    if (!org?.slug || !invoiceId) return;
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const { data } = await http.get(
          tpath(org.slug, `/purchases/invoices/${invoiceId}/`)
        );
        setInvoice(data);
      } catch (err) {
        console.error(err);
        setToast({
          kind: "error",
          msg:
            err?.response?.data?.detail ||
            "Error cargando el detalle de la factura.",
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [org?.slug, invoiceId, onClose, setToast]);

  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];

  const handleNewLineChange = (field, value) => {
    setNewLine((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewLineProductChange = (value) => {
    const productId = value || "";
    const productObj = products.find((p) => String(p.id) === String(productId));
    setNewLine((prev) => ({
      ...prev,
      product: productId,
      // si no hay descripción escrita, rellenamos con el nombre del producto
      description:
        prev.description && prev.description.trim().length > 0
          ? prev.description
          : productObj?.name || "",
      uom: productObj?.uom || prev.uom || "unidad",
    }));
  };

  const createLine = async (e) => {
    e?.preventDefault?.();
    if (!org?.slug || !invoice?.id) return;

    if (!newLine.description && !newLine.product) {
      setToast({
        kind: "error",
        msg: "Al menos pon una descripción o un producto.",
      });
      return;
    }

    try {
      setCreating(true);
      setToast(null);

      await http.post(
        tpath(org.slug, `/purchases/invoices/${invoice.id}/add_line/`),
        {
          product: newLine.product || null, // id del producto o null
          description: newLine.description || "",
          qty: Number(newLine.qty) || 0,
          uom: newLine.uom || "unidad",
          unit_price: newLine.unit_price || "0.00",
          tax_rate: newLine.tax_rate || "21.00",
          discount_pct: newLine.discount_pct || "0.00",
        }
      );

      // Refrescamos factura (totales y líneas)
      const { data } = await http.get(
        tpath(org.slug, `/purchases/invoices/${invoiceId}/`)
      );
      setInvoice(data);
      onUpdated && (await onUpdated());

      setNewLine({
        product: "",
        description: "",
        qty: 1,
        uom: "unidad",
        unit_price: 0,
        tax_rate: 21,
        discount_pct: 0,
      });

      setToast({
        kind: "success",
        msg: "Línea añadida.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo crear la línea de factura.",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!invoice) {
    return (
      <BasicModal title="Detalle de la factura" onClose={onClose} wide={true}>
        {loading ? (
          <p className="text-sm text-gray-600">Cargando…</p>
        ) : (
          <p className="text-sm text-gray-600">No se encontró la factura.</p>
        )}
      </BasicModal>
    );
  }

  return (
    <BasicModal
      title={`Factura ${invoice.number} · detalle de líneas`}
      onClose={onClose}
      wide={true}
    >
      <div className="text-xs text-gray-600 space-y-1 mb-2">
        <p>
          Fecha: {invoice.date} · Proveedor:{" "}
          {displayContactName(invoice.supplier_detail || invoice.supplier)}
        </p>
        <p>
          Almacén:{" "}
          {invoice.warehouse_detail
            ? `${invoice.warehouse_detail.code} – ${invoice.warehouse_detail.name}`
            : "—"}
        </p>
        <p>
          Estado: <StatusPill value={invoice.status} /> · Pago:{" "}
          <StatusPill value={invoice.payment_status} />
        </p>
      </div>

      <div className="border rounded overflow-auto max-h-[55vh] text-xs mb-3">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Producto</th>
              <th className="px-2 py-1 text-left font-medium">Descripción</th>
              <th className="px-2 py-1 text-right font-medium">Ud.</th>
              <th className="px-2 py-1 text-right font-medium">Precio</th>
              <th className="px-2 py-1 text-right font-medium">IVA%</th>
              <th className="px-2 py-1 text-right font-medium">Dto%</th>
              <th className="px-2 py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-2 text-center text-gray-600 text-xs"
                >
                  Esta factura aún no tiene líneas de detalle.
                </td>
              </tr>
            ) : (
              lines.map((ln) => (
                <tr key={ln.id} className="border-t align-top">
                  <td className="px-2 py-1">
                    {ln.product_name || ln.product || "—"}
                  </td>
                  <td className="px-2 py-1">{ln.description || "—"}</td>
                  <td className="px-2 py-1 text-right">{ln.qty ?? "—"}</td>
                  <td className="px-2 py-1 text-right">
                    {formatMoney(ln.unit_price)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {ln.tax_rate != null ? `${ln.tax_rate}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {ln.discount_pct != null ? `${ln.discount_pct}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {formatMoney(ln.line_total)}
                  </td>
                </tr>
              ))
            )}

            {/* Fila para nueva línea */}
            <tr className="border-t bg-gray-50/60">
              <td className="px-2 py-1 align-top">
                <select
                  className="w-full border rounded px-1 py-0.5 text-[11px]"
                  value={newLine.product}
                  onChange={(e) => handleNewLineProductChange(e.target.value)}
                >
                  <option value="">(sin producto)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `${p.sku} – ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-600">
                    No hay productos en Inventario. Crea alguno en el módulo de
                    Inventario para poder enlazarlos aquí.
                  </p>
                )}
              </td>
              <td className="px-2 py-1">
                <textarea
                  className="w-full border rounded px-1 py-0.5 text-[11px]"
                  rows={2}
                  value={newLine.description}
                  onChange={(e) =>
                    handleNewLineChange("description", e.target.value)
                  }
                  placeholder="Descripción"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.qty}
                  onChange={(e) => handleNewLineChange("qty", e.target.value)}
                  step="0.01"
                />
                <p className="mt-0.5 text-[10px] text-gray-500">
                  UoM: {newLine.uom || "unidad"}
                </p>
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.unit_price}
                  onChange={(e) =>
                    handleNewLineChange("unit_price", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.tax_rate}
                  onChange={(e) =>
                    handleNewLineChange("tax_rate", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  className="w-full border rounded px-1 py-0.5 text-right text-[11px]"
                  value={newLine.discount_pct}
                  onChange={(e) =>
                    handleNewLineChange("discount_pct", e.target.value)
                  }
                  step="0.01"
                />
              </td>
              <td className="px-2 py-1 text-right align-middle">
                <button
                  type="button"
                  className="text-[10px] underline"
                  disabled={creating}
                  onClick={createLine}
                >
                  {creating ? "Añadiendo…" : "Añadir línea"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-1 text-[11px] text-gray-500">
        Los totales de la factura se recalculan automáticamente al añadir
        líneas. De momento las líneas existentes son de sólo lectura; más
        adelante podemos añadir edición y borrado si ampliamos el backend.
      </p>
    </BasicModal>
  );
}

/* -------------------- TAB PEDIDOS -------------------- */

function OrdersTab({
  org,
  orders,
  loading,
  reload,
  setToast,
  onRequestNewOrder,
  onOpenOrderLines,
}) {
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const handleSend = async (order) => {
    if (!org?.slug) return;
    try {
      setToast(null);
      await http.post(tpath(org.slug, `/purchases/orders/${order.id}/send/`));
      await reload();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo marcar el pedido como enviado.",
      });
    }
  };

  const handleReceive = async (order) => {
    if (!org?.slug) return;
    try {
      setToast(null);
      await http.post(
        tpath(org.slug, `/purchases/orders/${order.id}/receive/`)
      );
      await reload();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo marcar el pedido como recibido.",
      });
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Pedidos a proveedor</h2>
          <p className="text-xs text-gray-600">
            Crea pedidos de compra, consulta su estado y márcalos como enviados
            o recibidos.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs text-gray-600">
            Estado:
            <select
              className="ml-1 border rounded px-1 py-0.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="partially_received">Parcialmente recibido</option>
              <option value="received">Recibido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded text-xs bg-black text-white"
            onClick={onRequestNewOrder}
          >
            Nuevo pedido
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando pedidos…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-600">
          No hay pedidos que coincidan con el filtro.
        </p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Número</th>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                <th className="px-3 py-2 text-left font-medium">Almacén</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Base</th>
                <th className="px-3 py-2 text-right font-medium">IVA</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.number}</td>
                  <td className="px-3 py-2">{o.date}</td>
                  <td className="px-3 py-2">
                    {displayContactName(o.supplier_detail || o.supplier)}
                  </td>
                  <td className="px-3 py-2">
                    {o.warehouse_detail
                      ? `${o.warehouse_detail.code} – ${o.warehouse_detail.name}`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusPill value={o.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(o.total_base)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(o.total_tax)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(o.total)}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      className="text-[11px] underline"
                      onClick={() => onOpenOrderLines(o)}
                    >
                      Ver líneas
                    </button>
                    {o.status === "draft" && (
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleSend(o)}
                      >
                        Enviar
                      </button>
                    )}
                    {["draft", "sent", "partially_received"].includes(
                      o.status
                    ) && (
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleReceive(o)}
                      >
                        Marcar recibido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------- TAB FACTURAS -------------------- */

function InvoicesTab({
  org,
  invoices,
  payments,
  loading,
  reload,
  setToast,
  onRequestNewInvoice,
  onOpenInvoiceLines,
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const invoicesWithPaid = useMemo(() => {
    return invoices.map((inv) => {
      const related = payments.filter((p) => p.invoice === inv.id);
      const paymentsTotal = related.reduce(
        (acc, p) => acc + Number(p.amount || 0),
        0
      );
      return { ...inv, payments_total: paymentsTotal };
    });
  }, [invoices, payments]);

  const filtered = useMemo(() => {
    return invoicesWithPaid.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (paymentFilter && inv.payment_status !== paymentFilter) return false;
      return true;
    });
  }, [invoicesWithPaid, statusFilter, paymentFilter]);

  const handlePost = async (inv) => {
    if (!org?.slug) return;
    try {
      setToast(null);
      await http.post(tpath(org.slug, `/purchases/invoices/${inv.id}/post/`));
      await reload();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo contabilizar la factura de proveedor.",
      });
    }
  };

  const handleQuickPayment = async (inv) => {
    if (!org?.slug) return;
    const pending = Number(inv.total) - Number(inv.payments_total || 0);
    if (!(pending > 0)) {
      setToast({
        kind: "info",
        msg: "Esta factura ya está totalmente pagada.",
      });
      return;
    }
    try {
      setToast(null);
      await http.post(tpath(org.slug, "/purchases/payments/"), {
        invoice: inv.id,
        amount: pending.toFixed(2),
        date: new Date().toISOString().slice(0, 10),
        method: "transfer",
        notes: "Pago rápido total desde UI",
      });
      await reload();
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg:
          err?.response?.data?.detail ||
          "No se pudo registrar el pago de la factura.",
      });
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Facturas de proveedor</h2>
          <p className="text-xs text-gray-600">
            Crea facturas de compra, contabilízalas (actualizando stock) y
            controla su estado de pago.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs text-gray-600">
            Estado:
            <select
              className="ml-1 border rounded px-1 py-0.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="posted">Contabilizada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Pago:
            <select
              className="ml-1 border rounded px-1 py-0.5 text-xs"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="unpaid">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="paid">Pagada</option>
            </select>
          </label>
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded text-xs bg-black text-white"
            onClick={onRequestNewInvoice}
          >
            Nueva factura
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando facturas…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-600">
          No hay facturas que coincidan con el filtro.
        </p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Número</th>
                <th className="px-3 py-2 text-left font-medium">
                  Nº proveedor
                </th>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Vencimiento</th>
                <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                <th className="px-3 py-2 text-left font-medium">Almacén</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2 text-center font-medium">Pago</th>
                <th className="px-3 py-2 text-right font-medium">Base</th>
                <th className="px-3 py-2 text-right font-medium">IVA</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-3 py-2">{inv.number}</td>
                  <td className="px-3 py-2">
                    {inv.supplier_invoice_number || "—"}
                  </td>
                  <td className="px-3 py-2">{inv.date}</td>
                  <td className="px-3 py-2">
                    {inv.due_date || (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {displayContactName(inv.supplier_detail || inv.supplier)}
                  </td>
                  <td className="px-3 py-2">
                    {inv.warehouse_detail
                      ? `${inv.warehouse_detail.code} – ${inv.warehouse_detail.name}`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusPill value={inv.status} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusPill value={inv.payment_status} />
                    {typeof inv.payments_total === "number" &&
                    inv.total !== undefined ? (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Pagado: {formatMoney(inv.payments_total)} /{" "}
                        {formatMoney(inv.total)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(inv.total_base)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(inv.total_tax)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(inv.total)}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      className="text-[11px] underline"
                      onClick={() => onOpenInvoiceLines(inv)}
                    >
                      Ver líneas
                    </button>
                    {inv.status === "draft" && (
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handlePost(inv)}
                      >
                        Contabilizar
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[11px] underline"
                      onClick={() => handleQuickPayment(inv)}
                    >
                      Pago rápido
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------- TAB PAGOS -------------------- */

function PaymentsTab({ payments, loading }) {
  const [methodFilter, setMethodFilter] = useState("");

  const filtered = useMemo(() => {
    if (!methodFilter) return payments;
    return payments.filter((p) => p.method === methodFilter);
  }, [payments, methodFilter]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Pagos a proveedor</h2>
          <p className="text-xs text-gray-600">
            Listado de pagos registrados en facturas de proveedor.
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-600">
            Método:
            <select
              className="ml-1 border rounded px-1 py-0.5 text-xs"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="cash">Efectivo</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando pagos…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-600">
          No hay pagos que coincidan con el filtro.
        </p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">
                  Nº factura proveedor
                </th>
                <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                <th className="px-3 py-2 text-left font-medium">Método</th>
                <th className="px-3 py-2 text-right font-medium">Importe</th>
                <th className="px-3 py-2 text-left font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.date}</td>
                  <td className="px-3 py-2">
                    {p.invoice_detail?.supplier_invoice_number ||
                      p.invoice_detail?.number ||
                      "—"}
                  </td>
                  <td className="px-3 py-2">
                    {displayContactName(
                      p.invoice_detail?.supplier_detail ||
                        p.invoice_detail?.supplier
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {p.method === "transfer"
                      ? "Transferencia"
                      : p.method === "card"
                      ? "Tarjeta"
                      : p.method === "cash"
                      ? "Efectivo"
                      : p.method}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(p.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {p.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------- PAGE SHELL -------------------- */

export default function PurchasesPage() {
  const { org } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [invoicePrefillSupplier, setInvoicePrefillSupplier] = useState("");

  const [showOrderLines, setShowOrderLines] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [showInvoiceLines, setShowInvoiceLines] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const params = new URLSearchParams(location.search);
  const tabFromQuery = params.get("tab");
  const initialTabIndex =
    tabFromQuery === "invoices" ? 1 : tabFromQuery === "payments" ? 2 : 0;

  const loadOrders = async () => {
    if (!org?.slug) return;
    setOrdersLoading(true);
    try {
      const { data } = await http.get(tpath(org.slug, "/purchases/orders/"));
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setOrders(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando pedidos de proveedor.",
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!org?.slug) return;
    setInvoicesLoading(true);
    try {
      const { data } = await http.get(tpath(org.slug, "/purchases/invoices/"));
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setInvoices(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando facturas de proveedor.",
      });
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadPayments = async () => {
    if (!org?.slug) return;
    setPaymentsLoading(true);
    try {
      const { data } = await http.get(tpath(org.slug, "/purchases/payments/"));
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setPayments(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando pagos a proveedor.",
      });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    if (!org?.slug) return;
    try {
      const { data } = await http.get(
        tpath(org.slug, "/contacts/suppliers/?page_size=200")
      );
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setSuppliers(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando la lista de proveedores.",
      });
    }
  };

  const loadWarehouses = async () => {
    if (!org?.slug) return;
    try {
      const { data } = await http.get(
        tpath(org.slug, "/inventory/warehouses/")
      );
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setWarehouses(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando los almacenes.",
      });
    }
  };

  const loadProducts = async () => {
    if (!org?.slug) return;
    try {
      const { data } = await http.get(
        tpath(org.slug, "/inventory/products/?page_size=500")
      );
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setProducts(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando la lista de productos.",
      });
    }
  };

  useEffect(() => {
    if (!org?.slug) return;
    // Cargamos todo al entrar en Compras o cambiar de organización
    loadOrders();
    loadInvoices();
    loadPayments();
    loadSuppliers();
    loadWarehouses();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.slug]);

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const supplierFromQuery = search.get("supplier");
    if (supplierFromQuery) {
      setInvoicePrefillSupplier(supplierFromQuery);
      setShowNewInvoice(true);
    }
  }, [location.search]);

  const tabs = [
    {
      key: "orders",
      label: "Pedidos proveedor",
      content: () => (
        <OrdersTab
          org={org}
          orders={orders}
          loading={ordersLoading}
          reload={loadOrders}
          setToast={setToast}
          onRequestNewOrder={() => setShowNewOrder(true)}
          onOpenOrderLines={(order) => {
            setSelectedOrderId(order.id);
            setShowOrderLines(true);
          }}
        />
      ),
    },
    {
      key: "invoices",
      label: "Facturas proveedor",
      content: () => (
        <InvoicesTab
          org={org}
          invoices={invoices}
          payments={payments}
          loading={invoicesLoading}
          reload={async () => {
            await loadInvoices();
            await loadPayments();
          }}
          setToast={setToast}
          onRequestNewInvoice={() => {
            setInvoicePrefillSupplier("");
            setShowNewInvoice(true);
          }}
          onOpenInvoiceLines={(inv) => {
            setSelectedInvoiceId(inv.id);
            setShowInvoiceLines(true);
          }}
        />
      ),
    },

    {
      key: "payments",
      label: "Pagos",
      content: () => (
        <PaymentsTab payments={payments} loading={paymentsLoading} />
      ),
    },
  ];

  return (
    <section className="max-w-6xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Compras</h1>
        <p className="text-sm text-gray-600">
          Módulo de compras: pedidos, facturas de proveedor y pagos. Ya puedes
          crear pedidos y facturas básicas desde esta pantalla, contabilizarlas
          y registrar pagos rápidos.
        </p>
      </header>

      {toast && (
        <Toast
          kind={toast.kind}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <Tabs tabs={tabs} initial={initialTabIndex} />

      {showNewOrder && (
        <NewOrderModal
          org={org}
          suppliers={suppliers}
          warehouses={warehouses}
          onClose={() => setShowNewOrder(false)}
          onCreated={loadOrders}
          setToast={setToast}
        />
      )}

      {showNewInvoice && (
        <NewInvoiceModal
          org={org}
          suppliers={suppliers}
          warehouses={warehouses}
          defaultSupplierId={invoicePrefillSupplier}
          onClose={() => setShowNewInvoice(false)}
          onCreated={async () => {
            await loadInvoices();
          }}
          setToast={setToast}
        />
      )}

      {showOrderLines && selectedOrderId && (
        <OrderLinesModal
          org={org}
          orderId={selectedOrderId}
          onClose={() => {
            setShowOrderLines(false);
            setSelectedOrderId(null);
          }}
          setToast={setToast}
          products={products} // NUEVO
          onUpdated={loadOrders} // NUEVO → refresca totales en la tabla
        />
      )}

      {showInvoiceLines && selectedInvoiceId && (
        <InvoiceLinesModal
          org={org}
          invoiceId={selectedInvoiceId}
          onClose={() => {
            setShowInvoiceLines(false);
            setSelectedInvoiceId(null);
          }}
          setToast={setToast}
          onUpdated={async () => {
            await loadInvoices();
            await loadPayments();
          }}
          products={products}
        />
      )}
    </section>
  );
}
