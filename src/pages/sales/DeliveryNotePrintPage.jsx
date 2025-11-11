// src/pages/sales/DeliveryNotePrintPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";

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

function displayDnStatus(status) {
  const s = (status || "draft").toLowerCase();
  if (s === "draft") return "Borrador";
  if (s === "done") return "Confirmado";
  return status || "Borrador";
}

export default function DeliveryNotePrintPage() {
  const { org } = useAuth();
  const { deliveryNoteId } = useParams();
  const nav = useNavigate();

  const [dn, setDn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!org?.slug || !deliveryNoteId) return;

    setLoading(true);
    setToast(null);

    http
      .get(tpath(org.slug, `/sales/delivery-notes/${deliveryNoteId}/`))
      .then(({ data }) => {
        setDn(data);
      })
      .catch((err) => {
        console.error("Error cargando albarán para impresión:", err);
        setToast({
          kind: "error",
          msg: "No se pudo cargar el albarán para impresión.",
        });
      })
      .finally(() => setLoading(false));
  }, [org?.slug, deliveryNoteId]);

  if (!org) {
    return (
      <div className="text-sm text-gray-600">
        Debes seleccionar una organización para ver este albarán.
      </div>
    );
  }

  const customer = dn?.customer_detail || dn?.customer;

  // Total importe (no contable)
  const totalImporte =
    Array.isArray(dn?.lines) && dn.lines.length
      ? dn.lines.reduce((acc, ln) => {
          const qty = Number(ln.qty) || 0;
          const unit = Number(ln.unit_price) || 0;
          return acc + qty * unit;
        }, 0)
      : 0;

  return (
    <section className="invoice-print-page">
      <div className="invoice-print-inner max-w-4xl mx-auto bg-white border rounded-lg shadow-sm p-4 md:p-6">
        {/* Barra superior solo pantalla */}
        <div className="flex items-center justify-between mb-4 no-print">
          <h1 className="text-lg font-semibold">
            Vista de impresión – Albarán {dn?.number || ""}
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={() => nav(-1)}
            >
              Volver
            </button>
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded bg-black text-white hover:bg-gray-900"
              onClick={() => window.print()}
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        {toast?.msg && (
          <div className="mb-3 no-print">
            <Toast
              kind={toast.kind || "error"}
              msg={toast.msg}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-600">Cargando albarán…</p>
        ) : !dn ? (
          <p className="text-sm text-gray-600">
            No se encontró el albarán indicado.
          </p>
        ) : (
          <div className="text-xs md:text-sm print:text-xs">
            {/* Cabecera emisor / cliente */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-3 mb-4">
              <div>
                <h2 className="text-base font-semibold">Albarán {dn.number}</h2>
                <p className="text-gray-600">
                  Fecha: <span className="font-medium">{dn.date}</span>
                </p>
                <p className="text-gray-600">
                  Estado:{" "}
                  <span className="font-medium">
                    {displayDnStatus(dn.status)}
                  </span>
                </p>
                {dn.warehouse && (
                  <p className="text-gray-600">
                    Almacén:{" "}
                    <span className="font-medium">
                      {dn.warehouse_name || dn.warehouse}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                {/* Empresa emisora */}
                <div className="border rounded p-2">
                  <h3 className="text-xs font-semibold mb-1">
                    Empresa emisora
                  </h3>
                  <p className="text-xs text-gray-700">
                    {org.name || "(sin nombre de empresa)"} <br />
                    {org.vat_number && (
                      <>
                        NIF: {org.vat_number}
                        <br />
                      </>
                    )}
                    {org.address && (
                      <>
                        {org.address}
                        <br />
                      </>
                    )}
                    {(org.zip_code || org.city) && (
                      <>
                        {org.zip_code} {org.city}
                        <br />
                      </>
                    )}
                    <span className="text-gray-500">
                      Org: {org.slug || "(sin slug)"}
                    </span>
                  </p>
                </div>

                {/* Cliente */}
                <div className="border rounded p-2">
                  <h3 className="text-xs font-semibold mb-1">Cliente</h3>
                  <p className="text-xs text-gray-700">
                    {displayContactName(customer) || "(sin cliente)"}
                    <br />
                    {customer?.documento_id && (
                      <>
                        NIF/DNI: {customer.documento_id}
                        <br />
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Líneas */}
            <div className="border rounded invoice-lines-box mb-4">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">
                      Descripción
                    </th>
                    <th className="px-2 py-1 text-right font-medium">Cant.</th>
                    <th className="px-2 py-1 text-left font-medium">Uds</th>
                    <th className="px-2 py-1 text-right font-medium">Precio</th>
                    <th className="px-2 py-1 text-right font-medium border-l border-gray-300">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(dn.lines) && dn.lines.length > 0 ? (
                    dn.lines.map((ln) => {
                      const qty = Number(ln.qty) || 0;
                      const unit = Number(ln.unit_price) || 0;
                      const base = qty * unit;

                      return (
                        <tr key={ln.id} className="border-t">
                          <td className="px-2 py-1">
                            {ln.description ||
                              ln.product_name ||
                              "(sin descripción)"}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatMoney(qty)}
                          </td>
                          <td className="px-2 py-1">{ln.uom || ""}</td>
                          <td className="px-2 py-1 text-right">
                            {formatMoney(unit)}
                          </td>
                          <td className="px-2 py-1 text-right border-l border-gray-300">
                            {formatMoney(base)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-2 py-2 text-gray-500" colSpan={5}>
                        No hay líneas en este albarán.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total importe (referencial) */}
            <div className="mt-2 flex justify-end">
              <table className="text-[11px]">
                <tbody>
                  <tr className="border-t border-gray-300">
                    <td className="px-2 py-1 text-right font-semibold">
                      Total importe (no contable)
                    </td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {formatMoney(totalImporte)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notas / Comentarios */}
            <div className="mt-4 border rounded p-2 invoice-notes-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Observaciones / Comentarios
              </h3>
              <p className="text-[11px] text-gray-700 whitespace-pre-wrap">
                {dn.notes || ""}
              </p>
            </div>

            {/* Texto legal / condiciones de entrega */}
            <div className="mt-3 border rounded p-2 invoice-legal-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Condiciones de entrega / texto legal
              </h3>
              <p className="text-[10px] text-gray-600 whitespace-pre-wrap">
                {dn.legal_text ||
                  org.delivery_legal_text ||
                  "Aquí podrás configurar las condiciones de entrega o texto legal asociado al albarán (por ejemplo, plazos de revisión, incidencias en transporte, etc.). Defínelo con tu gestoría o departamento legal y configúralo desde la página de cuenta cuando esté disponible."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
