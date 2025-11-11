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
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  // líneas (con UOM)
  const [lines, setLines] = useState([]);

  const isEdit = mode === "edit";

  // Cargar combos + rellenar formulario
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
          : [];
        const productItems = Array.isArray(pData?.results)
          ? pData.results
          : Array.isArray(pData)
          ? pData
          : [];

        setCustomers(clientItems);
        setProducts(productItems);

        // Rellenar formulario según modo
        if (mode === "create") {
          setNumber("");
          setDate(today);
          setNotes("");

          if (clientItems.length > 0) {
            setCustomerId(String(clientItems[0].id));
          } else {
            setCustomerId("");
          }
          // No pre-cargamos ninguna línea, el usuario añade la primera
          setLines([]);
        } else if (mode === "edit" && initial) {
          // Cabecera
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
          } else {
            setCustomerId("");
          }

          // Líneas existentes del presupuesto
          const mappedLines = Array.isArray(initial.lines)
            ? initial.lines.map((ln) => ({
                id: ln.id,
                product: ln.product || "",
                description: ln.description || "",
                qty:
                  ln.qty !== undefined && ln.qty !== null
                    ? String(ln.qty)
                    : "1",
                uom: ln.uom || "", // 👈 sin “unidad”
                price:
                  ln.unit_price !== undefined && ln.unit_price !== null
                    ? String(ln.unit_price)
                    : "0.00",
                tax_rate:
                  ln.tax_rate !== undefined && ln.tax_rate !== null
                    ? String(ln.tax_rate)
                    : "21.00",
              }))
            : [];

          if (mappedLines.length) {
            setLines(mappedLines);
          } else {
            setLines([
              {
                product: "",
                description: "",
                qty: "1",
                uom: "",
                price: "0.00",
                tax_rate: "21.00",
              },
            ]);
          }
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

  // Totales
  const totals = useMemo(() => {
    let base = 0;
    let tax = 0;
    for (const ln of lines) {
      const qty = Number(ln.qty) || 0;
      const price = Number(ln.price) || 0;
      const lineBase = qty * price;
      const lineTaxRate = Number(ln.tax_rate) || 0;
      const lineTax = (lineBase * lineTaxRate) / 100;
      base += lineBase;
      tax += lineTax;
    }
    return {
      base,
      tax,
      total: base + tax,
    };
  }, [lines]);

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, [field]: value } : ln))
    );
  };

  const handleSelectProduct = (index, productId) => {
    const p = products.find((x) => String(x.id) === String(productId));
    const productUom = p?.uom ?? ""; // 👈 cogemos tal cual venga del backend

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
              uom: productUom || ln.uom || "",
            }
          : ln
      )
    );
  };

  const addLine = () => {
    const p0 = products[0];
    const productUom = p0?.uom ?? "";

    setLines((prev) => [
      ...prev,
      {
        product: p0?.id ?? "",
        description: p0?.name ?? "",
        qty: "1",
        uom: productUom,
        price: p0?.price ? String(p0.price) : "0.00",
        tax_rate: p0?.tax_rate ? String(p0.tax_rate) : "21.00",
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
      setToast({
        kind: "error",
        msg: "Selecciona un cliente antes de guardar.",
      });
      return;
    }

    // Validación mínima líneas
    const activeLines = lines.filter(
      (ln) => ln.product || ln.description.trim() !== ""
    );
    if (!activeLines.length) {
      setToast({
        kind: "error",
        msg: "El presupuesto debe tener al menos una línea.",
      });
      return;
    }

    const payloadHeader = {
      customer: customerId,
      date,
      notes,
    };

    if (number && number.trim() !== "") {
      payloadHeader.number = number.trim();
    }

    try {
      setLoading(true);
      setToast(null);

      if (mode === "create") {
        // 1) Crear CABECERA
        const quoteRes = await http.post(
          tpath(org.slug, "/sales/quotes/"),
          payloadHeader
        );
        const quoteId = quoteRes.data?.id;
        if (!quoteId) {
          throw new Error(
            "El backend no devolvió ID de presupuesto al crearlo."
          );
        }

        // 2) Añadir LÍNEAS con add_line
        for (const ln of activeLines) {
          const linePayload = {
            product: ln.product || null,
            description: ln.description,
            qty: Number(ln.qty) || 0,
            uom: ln.uom || null,
            unit_price: Number(ln.price) || 0,
            tax_rate: Number(ln.tax_rate) || 0,
          };

          await http.post(
            tpath(org.slug, `/sales/quotes/${quoteId}/add_line/`),
            linePayload
          );
        }
      } else if (mode === "edit" && initial?.id) {
        // 1) Actualizar CABECERA
        await http.patch(
          tpath(org.slug, `/sales/quotes/${initial.id}/`),
          payloadHeader
        );

        // 2) Reemplazar LÍNEAS completas
        const linesPayload = activeLines.map((ln) => ({
          product: ln.product || null,
          description: ln.description,
          qty: Number(ln.qty) || 0,
          uom: ln.uom || null,
          unit_price: Number(ln.price) || 0,
          tax_rate: Number(ln.tax_rate) || 0,
        }));

        await http.post(
          tpath(org.slug, `/sales/quotes/${initial.id}/replace_lines/`),
          { lines: linesPayload }
        );
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Error al guardar presupuesto:", err);
      let friendly =
        "No se ha podido guardar el presupuesto. Revisa los datos o inténtalo más tarde.";

      const resp = err?.response;
      if (resp) {
        const { status, data } = resp;
        if (typeof data === "string") {
          const lower = data.toLowerCase();
          if (
            lower.includes("duplicate key") ||
            lower.includes("unicidad") ||
            lower.includes("unique constraint")
          ) {
            friendly =
              "Ya existe un presupuesto con ese número. Cambia el número y vuelve a guardar.";
          } else if (!lower.includes("<html") && data.length < 200) {
            friendly = data;
          } else if (status >= 500) {
            friendly =
              "Se ha producido un error interno al guardar el presupuesto. Prueba más tarde.";
          }
        } else if (typeof data === "object") {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {isEdit ? "Editar presupuesto" : "Nuevo presupuesto"}
            </h2>
            <p className="text-xs text-gray-600">
              {isEdit && initial
                ? `Cliente: ${displayContactName(
                    initial.customer_detail || initial.customer
                  )}`
                : "Crea o edita un presupuesto de venta."}
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
          className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2"
        >
          {/* Cabecera */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-medium">Cliente</label>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingRefs || loading}
              >
                {loadingRefs && <option>Cargando clientes…</option>}
                {!loadingRefs && customers.length === 0 && (
                  <option value="">No hay clientes</option>
                )}
                {!loadingRefs &&
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {displayContactName(c)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Número</label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-xs"
                placeholder="(auto)"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={loading}
              />
              <p className="text-[10px] text-gray-500">
                Si lo dejas vacío, se numerará automáticamente.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Fecha</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <label className="font-medium">Notas</label>
            <textarea
              className="border rounded px-2 py-1 text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Condiciones, observaciones…"
            />
          </div>

          {/* Líneas (create + edit, con UOM) */}
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
                    <th className="px-2 py-1 text-left font-medium">Uds</th>
                    <th className="px-2 py-1 text-right font-medium">Cant.</th>
                    <th className="px-2 py-1 text-right font-medium">
                      Precio (€)
                    </th>
                    <th className="px-2 py-1 text-right font-medium">IVA %</th>
                    <th className="px-2 py-1 text-right font-medium">
                      Importe (€)
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
                        {/* Producto */}
                        <td className="px-2 py-1">
                          <select
                            className="border rounded px-1 py-0.5 text-[11px] w-full"
                            value={ln.product || ""}
                            onChange={(e) =>
                              handleSelectProduct(index, e.target.value)
                            }
                          >
                            <option value="">(sin producto)</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Descripción */}
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

                        {/* Uds */}
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

                        {/* Cantidad */}
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

                        {/* Precio */}
                        <td className="px-2 py-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="border rounded px-1 py-0.5 text-[11px] w-24 text-right"
                            value={ln.price}
                            onChange={(e) =>
                              handleLineChange(index, "price", e.target.value)
                            }
                          />
                        </td>

                        {/* IVA */}
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

                        {/* Importe */}
                        <td className="px-2 py-1 text-right">
                          {formatMoney(lineBase)}
                        </td>

                        {/* Quitar */}
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

            {/* Totales */}
            <div className="flex flex-col items-end gap-1 text-[11px] pt-2">
              <div>
                <span className="inline-block w-24 text-right mr-2 text-gray-500">
                  Base imponible
                </span>
                <span className="font-mono">{formatMoney(totals.base)} €</span>
              </div>
              <div>
                <span className="inline-block w-24 text-right mr-2 text-gray-500">
                  IVA
                </span>
                <span className="font-mono">{formatMoney(totals.tax)} €</span>
              </div>
              <div>
                <span className="inline-block w-24 text-right mr-2 font-semibold">
                  Total
                </span>
                <span className="font-mono font-semibold">
                  {formatMoney(totals.total)} €
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-3 border-t mt-2 justify-end">
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
                  : isEdit
                  ? "Guardar cambios"
                  : "Guardar presupuesto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
