// src/pages/sales/InvoicePrintPage.jsx
import { useEffect, useState, useMemo } from "react";
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

function displayInvoiceStatus(status) {
  const s = (status || "draft").toLowerCase();
  if (s === "posted") return "Contabilizada";
  if (s === "draft") return "Borrador";
  if (s === "cancelled" || s === "canceled") return "Anulada";
  return status || "Borrador";
}

export default function InvoicePrintPage() {
  const { org } = useAuth();
  const { invoiceId } = useParams();
  const nav = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!org?.slug || !invoiceId) return;

    setLoading(true);
    setToast(null);

    http
      .get(tpath(org.slug, `/sales/invoices/${invoiceId}/`))
      .then(({ data }) => {
        setInvoice(data);
      })
      .catch((err) => {
        console.error("Error cargando factura para impresión:", err);
        setToast({
          kind: "error",
          msg: "No se pudo cargar la factura para impresión.",
        });
      })
      .finally(() => setLoading(false));
  }, [org?.slug, invoiceId]);

  // Resumen IVA por tipo
  const ivaSummary = useMemo(() => {
    if (!invoice || !Array.isArray(invoice.lines)) return [];
    const map = new Map();

    invoice.lines.forEach((ln) => {
      const rate = Number(ln.tax_rate) || 0;
      const key = rate.toFixed(2);

      const qty = Number(ln.qty) || 0;
      const unit = Number(ln.unit_price) || 0;
      const disc = Number(ln.discount_pct) || 0;

      const baseLine = qty * unit * (1 - (disc || 0) / 100);

      if (!map.has(key)) {
        map.set(key, { rate, base: 0, tax: 0 });
      }
      const item = map.get(key);
      item.base += baseLine;
      item.tax += baseLine * (rate / 100);
    });

    return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
  }, [invoice]);

  const ivaTotalsLabel = useMemo(() => {
    if (
      !invoice ||
      !Array.isArray(invoice.lines) ||
      invoice.lines.length === 0
    ) {
      return "IVA";
    }
    const uniqueRates = Array.from(
      new Set(
        invoice.lines.map((ln) => {
          const r = Number(ln.tax_rate);
          return Number.isFinite(r) ? r.toFixed(2) : "0.00";
        })
      )
    );

    if (uniqueRates.length === 1) {
      const r = uniqueRates[0];
      return `IVA (${r} %)`;
    }
    if (uniqueRates.length > 1) {
      return "IVA (varios tipos)";
    }
    return "IVA";
  }, [invoice]);

  if (!org) {
    return (
      <div className="text-sm text-gray-600">
        Debes seleccionar una organización para ver esta factura.
      </div>
    );
  }

  const customer = invoice?.customer_detail || invoice?.customer;

  return (
    <section className="invoice-print-page">
      <div className="invoice-print-inner max-w-4xl mx-auto bg-white border rounded-lg shadow-sm p-4 md:p-6">
        {/* Barra superior solo en pantalla */}
        <div className="flex items-center justify-between mb-4 no-print">
          <h1 className="text-lg font-semibold">
            Vista de impresión – Factura{" "}
            {invoice ? (invoice.series || "") + (invoice.number || "") : ""}
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
          <p className="text-sm text-gray-600">Cargando factura…</p>
        ) : !invoice ? (
          <p className="text-sm text-gray-600">
            No se encontró la factura indicada.
          </p>
        ) : (
          <div className="text-xs md:text-sm print:text-xs">
            {/* Cabecera emisor / cliente */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-3 mb-4">
              <div>
                <h2 className="text-base font-semibold">
                  Factura {(invoice.series || "") + (invoice.number || "")}
                </h2>
                <p className="text-gray-600">
                  Fecha de emisión:{" "}
                  <span className="font-medium">{invoice.date_issue}</span>
                </p>
                <p className="text-gray-600">
                  Estado:{" "}
                  <span className="font-medium">
                    {displayInvoiceStatus(invoice.status)}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                {/* Empresa emisora */}
                <div className="border rounded p-2">
                  <h3 className="text-xs font-semibold mb-1">
                    Empresa emisora
                  </h3>
                  <p className="text-xs text-gray-700">
                    {org.name || "(sin nombre de empresa)"} <br />
                    {/* Estos campos saldrán si el backend los expone en org */}
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
                  {invoice.billing_address && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-medium">
                        Dirección facturación:
                      </span>{" "}
                      {invoice.billing_address}
                    </p>
                  )}
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
                    <th className="px-2 py-1 text-right font-medium">
                      Precio ({invoice.currency})
                    </th>
                    <th className="px-2 py-1 text-right font-medium">Dto. %</th>
                    <th className="px-2 py-1 text-right font-medium">IVA %</th>
                    <th className="px-2 py-1 text-right font-medium border-l border-gray-300">
                      Importe ({invoice.currency})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(invoice.lines) && invoice.lines.length > 0 ? (
                    invoice.lines.map((ln) => {
                      const qty = Number(ln.qty) || 0;
                      const unit = Number(ln.unit_price) || 0;
                      const disc = Number(ln.discount_pct) || 0;
                      const base = qty * unit * (1 - (disc || 0) / 100.0);

                      return (
                        <tr key={ln.id} className="border-t">
                          {/* Descripción */}
                          <td className="px-2 py-1">
                            {ln.description ||
                              ln.product_name ||
                              "(sin descripción)"}
                          </td>

                          {/* Cant. */}
                          <td className="px-2 py-1 text-right">
                            {formatMoney(qty)}
                          </td>

                          {/* Uds */}
                          <td className="px-2 py-1">{ln.uom || ""}</td>

                          {/* Precio */}
                          <td className="px-2 py-1 text-right">
                            {formatMoney(unit)}
                          </td>

                          {/* Dto */}
                          <td className="px-2 py-1 text-right">
                            {formatMoney(disc)}
                          </td>

                          {/* IVA */}
                          <td className="px-2 py-1 text-right">
                            {formatMoney(ln.tax_rate)}
                          </td>

                          {/* Importe — con línea de separación vertical */}
                          <td className="px-2 py-1 text-right border-l border-gray-300">
                            {formatMoney(base)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-2 py-2 text-gray-500" colSpan={7}>
                        No hay líneas en esta factura.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen IVA por tipo */}
            {ivaSummary.length > 0 && (
              <div className="mt-1 max-w-sm ml-auto mb-3">
                <h3 className="text-[11px] font-semibold mb-1">
                  Resumen IVA por tipo
                </h3>
                <table className="w-full text-[11px] border rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-right font-medium">
                        Tipo %
                      </th>
                      <th className="px-2 py-1 text-right font-medium">Base</th>
                      <th className="px-2 py-1 text-right font-medium">
                        Cuota
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ivaSummary.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1 text-right">
                          {formatMoney(row.rate)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatMoney(row.base)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatMoney(row.tax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            <div className="mt-2 flex justify-end">
              <table className="text-[11px]">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 text-right text-gray-600">
                      Base imponible
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {formatMoney(invoice.totals_base)} {invoice.currency}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {ivaTotalsLabel}
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {formatMoney(invoice.totals_tax)} {invoice.currency}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="px-2 py-1 text-right font-semibold">
                      Total factura
                    </td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {formatMoney(invoice.total)} {invoice.currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notas / Comentarios */}
            <div className="mt-4 border rounded p-2 invoice-notes-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Notas / Comentarios
              </h3>
              <p className="text-[11px] text-gray-700 whitespace-pre-wrap">
                {invoice.notes || ""}
              </p>
            </div>

            {/* Pie legal / texto configurable por empresa */}
            <div className="mt-3 border rounded p-2 invoice-legal-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Texto legal / pie de factura
              </h3>
              <p className="text-[10px] text-gray-600 whitespace-pre-wrap">
                {invoice.legal_text ||
                  org.invoice_legal_text ||
                  "Aquí podrás configurar el texto legal de tu factura (por ejemplo, menciones a la Ley 37/1992 del IVA, regímenes especiales, exenciones, inversión del sujeto pasivo, etc.). Consulta con tu gestoría qué texto debes incluir y configúralo desde la página de cuenta cuando esté disponible."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
