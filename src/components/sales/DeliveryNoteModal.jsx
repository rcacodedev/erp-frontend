// src/components/sales/DeliveryNoteModal.jsx
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

export default function DeliveryNoteModal({
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

  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [lines, setLines] = useState([]);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open || !org?.slug) return;

    const today = new Date().toISOString().slice(0, 10);
    setToast(null);
    setLoadingRefs(true);

    const refsPromises = [
      http.get(tpath(org.slug, "/contacts/clients/")),
      http.get(tpath(org.slug, "/inventory/warehouses/")),
      http.get(tpath(org.slug, "/inventory/products/")),
    ];

    // Si estamos editando, también cargamos el detalle del albarán
    if (isEdit && initial?.id) {
      refsPromises.push(
        http.get(tpath(org.slug, `/sales/delivery-notes/${initial.id}/`))
      );
    }

    Promise.all(refsPromises)
      .then((responses) => {
        const [clientsRes, warehousesRes, productsRes, dnRes] = responses;

        const cData = clientsRes.data;
        const wData = warehousesRes.data;
        const pData = productsRes.data;

        const clientItems = Array.isArray(cData?.results)
          ? cData.results
          : Array.isArray(cData)
          ? cData
          : cData?.items ?? [];

        const warehouseItems = Array.isArray(wData?.results)
          ? wData.results
          : Array.isArray(wData)
          ? wData
          : wData?.items ?? [];

        const productItems = Array.isArray(pData?.results)
          ? pData.results
          : Array.isArray(pData)
          ? pData
          : pData?.items ?? [];

        setCustomers(clientItems);
        setWarehouses(warehouseItems);
        setProducts(productItems);

        if (!isEdit) {
          // --- MODO CREAR ---
          setDate(today);
          setNumber("");
          setCustomerId(clientItems[0] ? String(clientItems[0].id) : "");
          setWarehouseId(warehouseItems[0] ? String(warehouseItems[0].id) : "");
          setLines([]);
        } else {
          // --- MODO EDITAR ---
          const detail = dnRes ? dnRes.data : initial;

          setNumber(detail.number || "");
          setDate(detail.date || today);

          const custId =
            detail.customer ||
            detail.customer_id ||
            detail.customer_detail?.id ||
            null;
          if (custId) {
            setCustomerId(String(custId));
          } else if (clientItems[0]) {
            setCustomerId(String(clientItems[0].id));
          } else {
            setCustomerId("");
          }

          const whId =
            detail.warehouse ||
            detail.warehouse_id ||
            detail.warehouse_detail?.id ||
            null;
          if (whId) {
            setWarehouseId(String(whId));
          } else if (warehouseItems[0]) {
            setWarehouseId(String(warehouseItems[0].id));
          } else {
            setWarehouseId("");
          }

          const mappedLines = Array.isArray(detail.lines)
            ? detail.lines.map((ln) => ({
                id: ln.id,
                product: ln.product,
                description: ln.description || "",
                qty:
                  ln.qty !== undefined && ln.qty !== null
                    ? String(ln.qty)
                    : "1",
                uom: ln.uom || "",
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

          setLines(mappedLines.length ? mappedLines : []);
        }
      })
      .catch((err) => {
        console.error("Error cargando datos de albarán:", err);
        setToast({
          kind: "error",
          msg: "Error cargando clientes, almacenes, productos o el albarán.",
        });
      })
      .finally(() => {
        setLoadingRefs(false);
      });
  }, [open, org?.slug, isEdit, initial]);

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, [field]: value } : ln))
    );
  };

  const handleSelectProduct = (index, productId) => {
    const p = products.find((x) => String(x.id) === String(productId));
    const productUom = p?.uom ?? "";

    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              product: productId || null,
              // 👉 siempre pasamos la descripción al nombre del producto elegido
              description: p?.name || "",
              qty: ln.qty || "1",
              uom: productUom || ln.uom || "",
              price: p?.price ? String(p.price) : ln.price || "0.00",
              tax_rate: p?.tax_rate
                ? String(p.tax_rate)
                : ln.tax_rate ?? "21.00",
              discount_pct: ln.discount_pct || "0.00",
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
        id: null,
        product: p0?.id ?? null,
        description: p0?.name || "",
        qty: "1",
        uom: productUom,
        price: p0?.price ? String(p0.price) : "0.00",
        tax_rate: p0?.tax_rate ? String(p0.tax_rate) : "21.00",
        discount_pct: "0.00",
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
        msg: "Selecciona un cliente.",
      });
      return;
    }
    if (!warehouseId) {
      setToast({
        kind: "error",
        msg: "Selecciona un almacén.",
      });
      return;
    }

    const activeLines = lines.filter(
      (ln) => ln.product || ln.description.trim() !== ""
    );
    if (!activeLines.length) {
      setToast({
        kind: "error",
        msg: "El albarán debe tener al menos una línea.",
      });
      return;
    }

    const headerPayload = {
      date,
      customer: customerId,
      warehouse: warehouseId,
    };

    if (number && number.trim() !== "") {
      headerPayload.number = number.trim();
    }

    try {
      setLoading(true);
      setToast(null);

      if (!isEdit) {
        // --- CREAR ---
        const dnRes = await http.post(
          tpath(org.slug, "/sales/delivery-notes/"),
          headerPayload
        );
        const dnId = dnRes.data?.id;
        if (!dnId) {
          throw new Error("El backend no devolvió ID de albarán al crearlo.");
        }

        for (const ln of activeLines) {
          const linePayload = {
            product: ln.product || null,
            description: ln.description,
            qty: Number(ln.qty) || 0,
            uom: ln.uom || null,
            unit_price: Number(ln.price) || 0,
            tax_rate: Number(ln.tax_rate) || 0,
            discount_pct: Number(ln.discount_pct) || 0,
          };

          await http.post(
            tpath(org.slug, `/sales/delivery-notes/${dnId}/add_line/`),
            linePayload
          );
        }
      } else if (isEdit && initial?.id) {
        // --- EDITAR ---
        // 1) Actualizar cabecera
        await http.patch(
          tpath(org.slug, `/sales/delivery-notes/${initial.id}/`),
          headerPayload
        );

        // 2) Reemplazar todas las líneas
        const linesPayload = activeLines.map((ln) => ({
          product: ln.product || null,
          description: ln.description,
          qty: Number(ln.qty) || 0,
          uom: ln.uom || null,
          unit_price: Number(ln.price) || 0,
          tax_rate: Number(ln.tax_rate) || 0,
          discount_pct: Number(ln.discount_pct) || 0,
        }));

        await http.post(
          tpath(org.slug, `/sales/delivery-notes/${initial.id}/replace_lines/`),
          { lines: linesPayload }
        );
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Error al guardar albarán:", err);
      setToast({
        kind: "error",
        msg: "No se ha podido guardar el albarán. Revisa los datos o inténtalo más tarde.",
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
              {isEdit ? "Editar albarán" : "Nuevo albarán"}
            </h2>
            <p className="text-xs text-gray-600">
              Documento de entrega de mercancía. Más adelante lo enlazaremos con
              facturas y logística.
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col gap-1 md:col-span-2">
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

            <div className="flex flex-col gap-1">
              <label className="font-medium">Almacén</label>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={loadingRefs || loading}
              >
                {loadingRefs && <option>Cargando almacenes…</option>}
                {!loadingRefs && warehouses.length === 0 && (
                  <option value="">No hay almacenes</option>
                )}
                {!loadingRefs &&
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name || w.code || `Almacén ${w.id}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Líneas */}
          <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold">Líneas</h3>
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                onClick={addLine}
                disabled={loading || loadingRefs || products.length === 0}
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
                      Importe (€)
                    </th>
                    <th className="px-2 py-1 text-right font-medium"></th>
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

                        {/* Importe */}
                        <td className="px-2 py-1 text-right">
                          {formatMoney(lineBase)} €
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

            <p className="text-[10px] text-gray-500 pt-1">
              El albarán no genera asiento contable; solo controla entregas y
              movimiento de stock.
            </p>

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
                  : "Guardar albarán"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
