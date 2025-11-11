// src/components/sales/InvoiceLinesModal.jsx
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

export default function InvoiceLinesModal({ open, invoice, onClose, onSaved }) {
  const { org } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [toast, setToast] = useState(null);

  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (!open || !org?.slug || !invoice?.id) return;

    setToast(null);
    setLoadingInv(true);

    http
      .get(tpath(org.slug, `/sales/invoices/${invoice.id}/`))
      .then(({ data }) => {
        setHeader(data);
        const mapped = Array.isArray(data.lines)
          ? data.lines.map((ln) => ({
              id: ln.id,
              product: ln.product,
              product_name: ln.product_name || "",
              description: ln.description || "",
              qty:
                ln.qty !== undefined && ln.qty !== null ? String(ln.qty) : "1",
              uom: ln.uom || "unidad",
              price:
                ln.unit_price !== undefined && ln.unit_price !== null
                  ? String(ln.unit_price)
                  : "0.00",
              tax_rate:
                ln.tax_rate !== undefined && ln.tax_rate !== null
                  ? String(ln.tax_rate)
                  : "21.00",
              discount_pct:
                ln.discount_pct !== undefined && ln.discount_pct !== null
                  ? String(ln.discount_pct)
                  : "0.00",
            }))
          : [];
        setLines(mapped.length ? mapped : []);
      })
      .catch((err) => {
        console.error("Error cargando factura:", err);
        setToast({
          kind: "error",
          msg: "Error cargando la factura para edición.",
        });
      })
      .finally(() => setLoadingInv(false));
  }, [open, org?.slug, invoice?.id]);

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, [field]: value } : ln))
    );
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: null,
        product: null,
        product_name: "",
        description: "",
        qty: "1",
        uom: "unidad",
        price: "0.00",
        tax_rate: "21.00",
        discount_pct: "0.00",
      },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug || !invoice?.id) return;

    if (!lines.length) {
      setToast({
        kind: "error",
        msg: "La factura debe tener al menos una línea.",
      });
      return;
    }

    try {
      setLoading(true);

      const linesPayload = lines.map((ln) => ({
        product: ln.product || null,
        description: ln.description,
        qty: Number(ln.qty) || 0,
        uom: ln.uom || "unidad",
        unit_price: Number(ln.price) || 0,
        tax_rate: Number(ln.tax_rate) || 0,
        discount_pct: Number(ln.discount_pct) || 0,
      }));

      await http.post(
        tpath(org.slug, `/sales/invoices/${invoice.id}/replace_lines/`),
        { lines: linesPayload }
      );

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Error al guardar líneas de factura:", err);
      setToast({
        kind: "error",
        msg: "No se pudieron guardar las líneas de la factura.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Editar líneas de factura{" "}
              {header ? (header.series || "") + (header.number || "") : ""}
            </h2>
            {header && (
              <p className="text-xs text-gray-600">
                Cliente:{" "}
                {displayContactName(header.customer_detail || header.customer)}{" "}
                · Fecha: {header.date_issue}
              </p>
            )}
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
          className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2"
        >
          {loadingInv ? (
            <p className="text-xs text-gray-600">Cargando factura…</p>
          ) : (
            <>
              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">Líneas</h3>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={addLine}
                    disabled={loading}
                  >
                    Añadir línea
                  </button>
                </div>

                <div className="border rounded flex-1 overflow-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">
                          Producto
                        </th>
                        <th className="px-2 py-1 text-left font-medium">
                          Descripción
                        </th>
                        <th className="px-2 py-1 text-right font-medium">
                          Cant.
                        </th>
                        <th className="px-2 py-1 text-left font-medium">Uds</th>
                        <th className="px-2 py-1 text-right font-medium">
                          Precio
                        </th>
                        <th className="px-2 py-1 text-right font-medium">
                          IVA %
                        </th>
                        <th className="px-2 py-1 text-right font-medium">
                          Importe
                        </th>
                        <th className="px-2 py-1 text-right font-medium"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln, index) => {
                        const qty = Number(ln.qty) || 0;
                        const price = Number(ln.price) || 0;
                        const lineBase = qty * price;

                        return (
                          <tr key={index} className="border-t">
                            <td className="px-2 py-1">
                              <span className="text-[11px]">
                                {ln.product_name || "(sin producto)"}
                              </span>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                className="border rounded px-1 py-0.5 text-[11px] w-full"
                                value={ln.description}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                className="border rounded px-1 py-0.5 text-[11px] w-20 text-right"
                                value={ln.qty}
                                onChange={(e) =>
                                  handleLineChange(index, "qty", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                className="border rounded px-1 py-0.5 text-[11px] w-20"
                                value={ln.uom || ""}
                                onChange={(e) =>
                                  handleLineChange(index, "uom", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="border rounded px-1 py-0.5 text-[11px] w-24 text-right"
                                value={ln.price}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "price",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="border rounded px-1 py-0.5 text-[11px] w-20 text-right"
                                value={ln.tax_rate}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "tax_rate",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatMoney(lineBase)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {lines.length > 1 && (
                                <button
                                  type="button"
                                  className="text-[11px] text-red-600 underline"
                                  onClick={() => removeLine(index)}
                                >
                                  Quitar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t mt-2">
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
                  {loading ? "Guardando..." : "Guardar líneas"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
