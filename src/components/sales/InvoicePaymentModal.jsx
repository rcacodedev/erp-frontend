// src/components/sales/InvoicePaymentModal.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

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
  if (v === null || v === undefined) return "0.00";
  const num = Number(v);
  if (!Number.isFinite(num)) return String(v);
  return num.toFixed(2);
}

export default function InvoicePaymentModal({
  open,
  invoice,
  onClose,
  onSaved,
}) {
  const { org } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!open || !invoice) return;
    setToast(null);

    const today = new Date().toISOString().slice(0, 10);
    setDate(invoice.date_issue || today);

    // De momento sugerimos el total de la factura; más adelante podremos usar "pendiente"
    const suggested = invoice.total ?? 0;
    setAmount(formatMoney(suggested));
  }, [open, invoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug || !invoice?.id) return;

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setToast({
        kind: "error",
        msg: "Introduce un importe de cobro válido.",
      });
      return;
    }

    if (!date) {
      setToast({
        kind: "error",
        msg: "La fecha del cobro es obligatoria.",
      });
      return;
    }

    try {
      setLoading(true);
      setToast(null);

      await http.post(
        tpath(org.slug, `/sales/invoices/${invoice.id}/register_payment/`),
        {
          amount: numAmount,
          date,
        }
      );

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Error registrando cobro:", err);
      setToast({
        kind: "error",
        msg: "No se pudo registrar el cobro de la factura.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Registrar cobro –{" "}
              {(invoice.series || "") + (invoice.number || "")}
            </h2>
            <p className="text-xs text-gray-600">
              Cliente:{" "}
              {displayContactName(invoice.customer_detail || invoice.customer)}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-black"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </header>

        {toast && (
          <div className="px-4 pt-2">
            <Toast
              kind={toast.kind}
              msg={toast.msg}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2 text-xs"
        >
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Importe factura:</span>
              <span className="font-mono font-semibold">
                {formatMoney(invoice.total)} €
              </span>
            </div>
            {/* Más adelante podríamos mostrar pendiente si el backend lo expone */}
          </div>

          <div className="grid grid-cols-1 gap-3 mt-2">
            <div className="flex flex-col gap-1">
              <label className="font-medium">Importe cobrado</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border rounded px-2 py-1 text-xs w-full text-right"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
                <span className="text-[11px] text-gray-600">€</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Fecha de cobro</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t mt-3">
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs px-3 py-1 border rounded bg-black text-white hover:bg-gray-900 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar cobro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
