// src/components/inventory/StockMoveModal.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../Toast.jsx";

/**
 * mode:
 *  - "receive": Entrada de stock (product, warehouse, qty>0)
 *  - "adjust": Ajuste (product, warehouse, qty signed; + suma / - resta)
 *  - "transfer": Transferencia (product, warehouse_from, warehouse_to, qty>0)
 */
export default function StockMoveModal({
  open,
  mode = "receive",
  warehouses = [],
  products = [],
  onClose,
  onDone, // callback para refrescar stock
}) {
  const { org } = useAuth();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseFromId, setWarehouseFromId] = useState("");
  const [warehouseToId, setWarehouseToId] = useState("");
  const [qty, setQty] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (open) {
      setProductId(products[0]?.id ?? "");
      setWarehouseId(warehouses[0]?.id ?? "");
      setWarehouseFromId(warehouses[0]?.id ?? "");
      setWarehouseToId(warehouses[1]?.id ?? warehouses[0]?.id ?? "");
      setQty(mode === "adjust" ? "0" : "1");
      setToast(null);
    }
  }, [open, mode, products, warehouses]);

  if (!open) return null;

  const titleByMode = {
    receive: "Entrada de stock",
    adjust: "Ajuste de stock",
    transfer: "Transferencia de stock",
  };

  const endpointByMode = {
    receive: "/inventory/moves/receive/",
    adjust: "/inventory/moves/adjust/",
    transfer: "/inventory/moves/transfer/",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;
    setSubmitting(true);
    setToast(null);

    try {
      const numQty = Number(qty);
      if (!Number.isFinite(numQty)) {
        throw new Error("La cantidad no es válida.");
      }

      let payload = {};
      if (mode === "transfer") {
        payload = {
          product: productId,
          warehouse_from: warehouseFromId,
          warehouse_to: warehouseToId,
          qty: numQty,
        };
      } else {
        payload = {
          product: productId,
          warehouse: warehouseId,
          qty: numQty,
        };
      }

      await http.post(tpath(org.slug, endpointByMode[mode]), payload);

      onDone?.();
      onClose?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al registrar el movimiento.";
      setToast({ kind: "error", msg: detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{titleByMode[mode]}</h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-black"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </button>
        </div>

        {toast?.msg && (
          <Toast
            kind={toast.kind || "error"}
            msg={toast.msg}
            onClose={() => setToast(null)}
          />
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium">Producto</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "transfer" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Almacén origen (sale stock)
                </label>
                <select
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={warehouseFromId}
                  onChange={(e) => setWarehouseFromId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} · {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Almacén destino (entra stock)
                </label>
                <select
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={warehouseToId}
                  onChange={(e) => setWarehouseToId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} · {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-medium">Almacén</label>
              <select
                className="border rounded px-2 py-1 w-full text-sm"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">
              Cantidad{" "}
              {mode === "adjust"
                ? "(positivo para sumar, negativo para restar)"
                : ""}
            </label>
            <input
              type="number"
              step="0.001"
              className="border rounded px-2 py-1 w-full text-sm"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs px-3 py-1 border rounded bg-black text-white hover:bg-gray-900 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Registrar movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
