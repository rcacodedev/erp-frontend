// src/pages/sales/QuotePrintPage.jsx
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

function displayQuoteStatus(status) {
  const s = (status || "draft").toLowerCase();
  if (s === "draft") return "Borrador";
  if (s === "sent") return "Enviado";
  if (s === "accepted") return "Aceptado";
  if (s === "rejected") return "Rechazado";
  return status || "Borrador";
}

export default function QuotePrintPage() {
  const { org } = useAuth();
  const { quoteId } = useParams();
  const nav = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!org?.slug || !quoteId) return;

    setLoading(true);
    setToast(null);

    http
      .get(tpath(org.slug, `/sales/quotes/${quoteId}/`))
      .then(({ data }) => {
        setQuote(data);
      })
      .catch((err) => {
        console.error("Error cargando presupuesto para impresión:", err);
        setToast({
          kind: "error",
          msg: "No se pudo cargar el presupuesto para impresión.",
        });
      })
      .finally(() => setLoading(false));
  }, [org?.slug, quoteId]);

  // Resumen IVA por tipo (igual que en factura)
  const ivaSummary = useMemo(() => {
    if (!quote || !Array.isArray(quote.lines)) return [];
    const map = new Map();

    quote.lines.forEach((ln) => {
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
  }, [quote]);

  const ivaTotalsLabel = useMemo(() => {
    if (!quote || !Array.isArray(quote.lines) || quote.lines.length === 0) {
      return "IVA";
    }
    const uniqueRates = Array.from(
      new Set(
        quote.lines.map((ln) => {
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
  }, [quote]);

  if (!org) {
    return (
      <div className="text-sm text-gray-600">
        Debes seleccionar una organización para ver este presupuesto.
      </div>
    );
  }

  const customer = quote?.customer_detail || quote?.customer;

  return (
    <section className="invoice-print-page">
      <div className="invoice-print-inner max-w-4xl mx-auto bg-white border rounded-lg shadow-sm p-4 md:p-6">
        {/* Barra superior solo pantalla */}
        <div className="flex items-center justify-between mb-4 no-print">
          <h1 className="text-lg font-semibold">
            Vista de impresión – Presupuesto {quote?.number || ""}
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
          <p className="text-sm text-gray-600">Cargando presupuesto…</p>
        ) : !quote ? (
          <p className="text-sm text-gray-600">
            No se encontró el presupuesto indicado.
          </p>
        ) : (
          <div className="text-xs md:text-sm print:text-xs">
            {/* Cabecera emisor / cliente */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-3 mb-4">
              <div>
                <h2 className="text-base font-semibold">
                  Presupuesto {quote.number}
                </h2>
                <p className="text-gray-600">
                  Fecha: <span className="font-medium">{quote.date}</span>
                </p>
                <p className="text-gray-600">
                  Estado:{" "}
                  <span className="font-medium">
                    {displayQuoteStatus(quote.status)}
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
                    <th className="px-2 py-1 text-right font-medium">
                      Precio ({quote.currency})
                    </th>
                    <th className="px-2 py-1 text-right font-medium">Dto. %</th>
                    <th className="px-2 py-1 text-right font-medium">IVA %</th>
                    <th className="px-2 py-1 text-right font-medium border-l border-gray-300">
                      Importe ({quote.currency})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(quote.lines) && quote.lines.length > 0 ? (
                    quote.lines.map((ln) => {
                      const qty = Number(ln.qty) || 0;
                      const unit = Number(ln.unit_price) || 0;
                      const disc = Number(ln.discount_pct) || 0;
                      const base = qty * unit * (1 - (disc || 0) / 100.0);

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
                          <td className="px-2 py-1 text-right">
                            {formatMoney(disc)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatMoney(ln.tax_rate)}
                          </td>
                          <td className="px-2 py-1 text-right border-l border-gray-300">
                            {formatMoney(base)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-2 py-2 text-gray-500" colSpan={7}>
                        No hay líneas en este presupuesto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen IVA */}
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
                      {formatMoney(quote.totals_base)} {quote.currency}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {ivaTotalsLabel}
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {formatMoney(quote.totals_tax)} {quote.currency}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="px-2 py-1 text-right font-semibold">
                      Total presupuesto
                    </td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {formatMoney(quote.total)} {quote.currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notas / comentarios */}
            <div className="mt-4 border rounded p-2 invoice-notes-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Notas / Comentarios
              </h3>
              <p className="text-[11px] text-gray-700 whitespace-pre-wrap">
                {quote.notes || ""}
              </p>
            </div>

            {/* Texto legal configurable */}
            <div className="mt-3 border rounded p-2 invoice-legal-box">
              <h3 className="text-[11px] font-semibold mb-1">
                Texto legal / condiciones del presupuesto
              </h3>
              <p className="text-[10px] text-gray-600 whitespace-pre-wrap">
                {quote.legal_text ||
                  org.quote_legal_text ||
                  org.invoice_legal_text ||
                  "Aquí podrás configurar el texto legal o las condiciones del presupuesto (validez, forma de pago, plazos de entrega, etc.). Consulta con tu gestoría o asesoría legal qué texto debes incluir y configúralo desde la página de cuenta cuando esté disponible."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
