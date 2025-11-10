// src/components/sales/QuoteModal.jsx
import { useEffect, useMemo, useState } from "react";
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

export default function QuoteModal({
  open,
  mode = "create", // "create" | "edit"
  initial = null,
  onClose,
  onSaved,
}) {
  const { org } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [toast, setToast] = useState(null);

  // referencias
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // formulario
  const [customerId, setCustomerId] = useState("");
  const [number, setNumber] = useState(""); // número de presupuesto
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  // líneas (solo se usan en create de momento)
  const [lines, setLines] = useState([
    {
      product: "",
      description: "",
      qty: "1",
      price: "0.00",
      tax_rate: "21.00",
    },
  ]);

  // cargar combos (clientes, productos) al abrir
  useEffect(() => {
    if (!open || !org?.slug) return;

    const today = new Date().toISOString().slice(0, 10);
    setToast(null);
    setLoadingRefs(true);

    Promise.all([
      http.get(tpath(org.slug, "/contacts/clients/")),
      http.get(tpath(org.slug, "/inventory/products/")),
    ])
      .then(([clientsRes, productsRes]) => {
        const cData = clientsRes.data;
        const pData = productsRes.data;

        const clientItems = Array.isArray(cData?.results)
          ? cData.results
          : Array.isArray(cData)
          ? cData
          : cData?.items ?? [];

        const productItems = Array.isArray(pData?.results)
          ? pData.results
          : Array.isArray(pData)
          ? pData
          : pData?.items ?? [];

        setCustomers(clientItems);
        setProducts(productItems);

        if (mode === "create") {
          // defaults para nuevo presupuesto
          const year = new Date().getFullYear();
          setNumber(`P-${year}-0001`);
          setDate(today);
          setNotes("");

          if (clientItems.length > 0) {
            setCustomerId(String(clientItems[0].id));
          }

          setLines([
            {
              product: productItems[0]?.id ?? "",
              description: productItems[0]?.name ?? "",
              qty: "1",
              price: productItems[0]?.price
                ? String(productItems[0].price)
                : "0.00",
              tax_rate: productItems[0]?.tax_rate
                ? String(productItems[0].tax_rate)
                : "21.00",
            },
          ]);
        } else if (mode === "edit" && initial) {
          // rellenar la cabecera desde el presupuesto existente
          setNumber(initial.number || "");
          setDate(initial.date || today);
          setNotes(initial.notes || "");

          const custId =
            initial.customer ||
            initial.customer_id ||
            initial.customer?.id ||
            null;

          if (custId) {
            setCustomerId(String(custId));
          } else if (clientItems.length > 0) {
            setCustomerId(String(clientItems[0].id));
          }

          // De momento NO editamos líneas en el backend
          setLines([]);
        }
      })
      .catch((err) => {
        console.error("Error cargando combos de presupuesto:", err);
        setToast({
          kind: "error",
          msg: "Error cargando clientes o productos.",
        });
      })
      .finally(() => {
        setLoadingRefs(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, org?.slug, mode, initial]);

  // Totales solo tienen sentido en create (porque trabajamos con líneas)
  const totals = useMemo(() => {
    let base = 0;
    let tax = 0;
    for (const ln of lines) {
      const qty = Number(ln.qty) || 0;
      const price = Number(ln.price) || 0;
      const lineBase = qty * price;
      const rate = Number(ln.tax_rate) || 0;
      const lineTax = (lineBase * rate) / 100;
      base += lineBase;
      tax += lineTax;
    }
    return {
      base,
      tax,
      total: base + tax,
    };
  }, [lines]);

  if (!open) return null;

  // --- handlers ----------------------------------------------------

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, [field]: value } : ln))
    );
  };

  const handleSelectProduct = (index, productId) => {
    const p = products.find((x) => String(x.id) === String(productId));
    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              product: productId,
              description: p?.name || ln.description,
              price: p?.price ? String(p.price) : ln.price,
              tax_rate: p?.tax_rate
                ? String(p.tax_rate)
                : ln.tax_rate ?? "21.00",
            }
          : ln
      )
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        product: products[0]?.id ?? "",
        description: products[0]?.name ?? "",
        qty: "1",
        price: products[0]?.price ? String(products[0].price) : "0.00",
        tax_rate: products[0]?.tax_rate
          ? String(products[0].tax_rate)
          : "21.00",
      },
    ]);
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.slug) return;

    if (!customerId) {
      setToast({ kind: "error", msg: "Debes seleccionar un cliente." });
      return;
    }
    if (!number.trim()) {
      setToast({
        kind: "error",
        msg: "Debes indicar un número de presupuesto.",
      });
      return;
    }
    if (mode === "create" && !lines.length) {
      setToast({
        kind: "error",
        msg: "Debe haber al menos una línea en el presupuesto.",
      });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      const headerPayload = {
        number: number.trim(),
        customer: Number(customerId),
        date,
      };

      if (mode === "create") {
        // 1) Crear la CABECERA del presupuesto
        const quoteRes = await http.post(
          tpath(org.slug, "/sales/quotes/"),
          headerPayload
        );
        const quoteId = quoteRes.data?.id;
        if (!quoteId) {
          throw new Error(
            "El backend no devolvió ID de presupuesto al crearlo."
          );
        }

        // 2) Añadir LÍNEAS con el action /sales/quotes/{id}/add_line/
        for (const ln of lines) {
          if (!ln.product && !ln.description) continue;

          const linePayload = {
            product: ln.product || null,
            description: ln.description,
            qty: Number(ln.qty) || 0,
            unit_price: Number(ln.price) || 0,
            tax_rate: Number(ln.tax_rate) || 0,
          };

          await http.post(
            tpath(org.slug, `/sales/quotes/${quoteId}/add_line/`),
            linePayload
          );
        }
      } else if (mode === "edit" && initial?.id) {
        // De momento solo actualizamos la CABECERA (número, cliente, fecha)
        await http.patch(
          tpath(org.slug, `/sales/quotes/${initial.id}/`),
          headerPayload
        );
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Error al guardar presupuesto:", err);
      const status = err?.response?.status;
      const data = err?.response?.data;

      let friendly = "Error al guardar el presupuesto.";

      // Si viene respuesta del backend, intentamos sacar algo decente
      if (data) {
        // 🔹 Caso 1: respuesta HTML / tochaco del debug de Django
        if (typeof data === "string") {
          const lower = data.toLowerCase();

          // Intentamos detectar el caso de clave duplicada
          if (
            lower.includes("llave duplicada") ||
            lower.includes("duplicate key") ||
            lower.includes("unicidad") ||
            lower.includes("unique constraint")
          ) {
            friendly =
              "Ya existe un presupuesto con ese número. Cambia el número y vuelve a guardar.";
          } else if (!lower.includes("<html") && data.length < 200) {
            // Si es un string corto y no parece HTML, lo usamos tal cual
            friendly = data;
          } else if (status >= 500) {
            // Error 5xx genérico
            friendly =
              "Se ha producido un error interno al guardar el presupuesto. Prueba más tarde.";
          }
        }
        // 🔹 Caso 2: respuesta JSON de validación normal
        else if (typeof data === "object") {
          if (Array.isArray(data.non_field_errors)) {
            friendly = data.non_field_errors.join(" ");
          } else if (Array.isArray(data.number)) {
            friendly = data.number.join(" ");
          } else if (Array.isArray(data.customer)) {
            friendly = data.customer.join(" ");
          }
        }
      } else if (err?.message) {
        friendly = err.message;
      }

      setToast({ kind: "error", msg: friendly });
    } finally {
      setLoading(false);
    }
  };

  // --- render ------------------------------------------------------

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {mode === "create" ? "Nuevo presupuesto" : "Editar presupuesto"}
          </h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-black"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        {toast?.msg && (
          <div className="px-4 pt-3">
            <Toast
              kind={toast.kind || "error"}
              msg={toast.msg}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        <form
          className="px-4 pb-4 pt-2 flex-1 flex flex-col gap-3"
          onSubmit={handleSubmit}
        >
          {/* Cabecera */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Número</label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm w-full"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ej: P-2025-0001"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium">Cliente</label>
              {loadingRefs ? (
                <p className="text-xs text-gray-500">Cargando clientes…</p>
              ) : customers.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No hay clientes. Crea alguno en el módulo de contactos.
                </p>
              ) : (
                <select
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {displayContactName(c)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Fecha</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Notas internas</label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm w-full"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="(de momento no se guarda en backend)"
            />
          </div>

          {/* Líneas: solo en modo create (en edit aún no tocamos líneas) */}
          {!isEdit && (
            <>
              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">Líneas</h3>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={addLine}
                    disabled={loadingRefs || loading}
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
                              {products.length === 0 ? (
                                <span className="text-[11px] text-gray-500">
                                  Sin productos
                                </span>
                              ) : (
                                <select
                                  className="border rounded px-1 py-0.5 text-[11px] w-full"
                                  value={ln.product}
                                  onChange={(e) =>
                                    handleSelectProduct(index, e.target.value)
                                  }
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.sku} · {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
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
                                // 🎯 Cantidad: pasos de 1 (unidades contables: ruedas, panes…)
                                step="1"
                                min="0"
                                className="border rounded px-1 py-0.5 text-[11px] w-20 text-right"
                                value={ln.qty}
                                onChange={(e) =>
                                  handleLineChange(index, "qty", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                // 🎯 Precio con dos decimales típicos
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

              {/* Totales + acciones */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t mt-2">
                <div className="text-xs space-y-0.5">
                  <div>
                    Base imponible:{" "}
                    <span className="font-semibold">
                      {formatMoney(totals.base)} €
                    </span>
                  </div>
                  <div>
                    IVA:{" "}
                    <span className="font-semibold">
                      {formatMoney(totals.tax)} €
                    </span>
                  </div>
                  <div>
                    Total:{" "}
                    <span className="font-semibold">
                      {formatMoney(totals.total)} €
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
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
                    {loading
                      ? "Guardando..."
                      : mode === "create"
                      ? "Guardar presupuesto"
                      : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer para modo edit (sin líneas) */}
          {isEdit && (
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
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
