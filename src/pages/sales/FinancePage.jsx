// src/pages/sales/FinancePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import Toast from "../../components/Toast.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import QuoteModal from "../../components/sales/QuoteModal.jsx";
import InvoiceLinesModal from "../../components/sales/InvoiceLinesModal.jsx";
import InvoicePaymentModal from "../../components/sales/InvoicePaymentModal.jsx";
import DeliveryNoteModal from "../../components/sales/DeliveryNoteModal.jsx";

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

function getPaymentStatusBadge(status) {
  const s = (status || "pending").toLowerCase();

  if (s === "paid" || s === "pagada") {
    return {
      label: "Pagada",
      className: "bg-green-100 text-green-800",
    };
  }

  if (s === "partial" || s === "parcial") {
    return {
      label: "Parcial",
      className: "bg-amber-100 text-amber-800",
    };
  }

  // pending, null, unknown...
  return {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-800",
  };
}

export default function FinancePage() {
  const { org } = useAuth();

  const [quotes, setQuotes] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [loadingDN, setLoadingDN] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);

  const [toast, setToast] = useState(null);

  // Modal de presupuesto (create/edit)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteModalMode, setQuoteModalMode] = useState("create"); // "create" | "edit"
  const [quoteToEdit, setQuoteToEdit] = useState(null);

  // Modal de factura (editar líneas)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  // Modal de cobro de factura
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);

  // Modal de albarán (nuevo)
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryModalMode, setDeliveryModalMode] = useState("create");
  const [deliveryToEdit, setDeliveryToEdit] = useState(null);

  // --- Loaders ----------------------------------------------------

  const loadQuotes = async () => {
    if (!org?.slug) return;
    setLoadingQuotes(true);
    try {
      const { data } = await http.get(tpath(org.slug, "/sales/quotes/"));
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setQuotes(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando presupuestos.",
      });
    } finally {
      setLoadingQuotes(false);
    }
  };

  const loadDeliveryNotes = async () => {
    if (!org?.slug) return;
    setLoadingDN(true);
    try {
      const { data } = await http.get(
        tpath(org.slug, "/sales/delivery-notes/")
      );
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data?.items ?? [];
      setDeliveryNotes(items);
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "Error cargando albaranes.",
      });
    } finally {
      setLoadingDN(false);
    }
  };

  const loadInvoices = async () => {
    if (!org?.slug) return;
    setLoadingInv(true);
    try {
      const { data } = await http.get(tpath(org.slug, "/sales/invoices/"));
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
        msg: "Error cargando facturas.",
      });
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    if (!org?.slug) return;
    loadQuotes();
    loadDeliveryNotes();
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.slug]);

  // --- Acciones de presupuestos -----------------------------------

  const handleQuoteStatus = async (quote, action) => {
    if (!org?.slug) return;
    try {
      const { data } = await http.post(
        tpath(org.slug, `/sales/quotes/${quote.id}/${action}/`)
      );
      setQuotes((prev) => prev.map((q) => (q.id === data.id ? data : q)));
      setToast({
        kind: "success",
        msg: `Presupuesto ${data.number} actualizado (${data.status}).`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo actualizar el estado del presupuesto.",
      });
    }
  };

  const handleQuoteToInvoice = async (quote) => {
    if (!org?.slug) return;
    if (
      !window.confirm(`¿Convertir el presupuesto ${quote.number} en factura?`)
    ) {
      return;
    }
    try {
      await http.post(tpath(org.slug, `/sales/quotes/${quote.id}/to_invoice/`));
      await loadQuotes();
      await loadInvoices();
      setToast({
        kind: "success",
        msg: `Presupuesto ${quote.number} convertido en factura.`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo convertir el presupuesto en factura.",
      });
    }
  };

  // ✅ DUPLICAR PRESUPUESTO
  const handleDuplicateQuote = async (quote) => {
    if (!org?.slug) return;

    try {
      setToast(null);

      // Número original
      const origNumber = quote.number || "";

      // Generar número nuevo tipo P-2025-0002-COPY, P-2025-0002-COPY2, etc.
      let newNumber;
      const copyMatch = origNumber.match(/^(.*-COPY)(\d+)?$/);

      if (copyMatch) {
        const base = copyMatch[1]; // "P-2025-0002-COPY"
        const num = copyMatch[2]
          ? parseInt(copyMatch[2], 10) + 1 // "COPY2" -> "COPY3"
          : 2; // primera copia: "COPY2"
        newNumber = `${base}${num}`;
      } else {
        newNumber = `${origNumber}-COPY`;
      }

      // Cabecera nueva
      const headerPayload = {
        number: newNumber,
        customer: quote.customer || quote.customer_detail?.id,
        date: quote.date,
      };

      const { data: newQuote } = await http.post(
        tpath(org.slug, "/sales/quotes/"),
        headerPayload
      );

      // Duplicar líneas
      if (Array.isArray(quote.lines)) {
        for (const ln of quote.lines) {
          await http.post(
            tpath(org.slug, `/sales/quotes/${newQuote.id}/add_line/`),
            {
              product: ln.product || null,
              description: ln.description,
              qty: ln.qty, // ya viene como string tipo "6.000"
              unit_price: ln.unit_price,
              tax_rate: ln.tax_rate,
              discount_pct: ln.discount_pct,
            }
          );
        }
      }

      await loadQuotes();

      setToast({
        kind: "success",
        msg: `Presupuesto duplicado como ${newQuote.number}.`,
      });
    } catch (err) {
      console.error("Error al duplicar presupuesto:", err);

      const status = err?.response?.status;
      const data = err?.response?.data;
      let friendly = "No se pudo duplicar el presupuesto.";

      if (typeof data === "string") {
        const lower = data.toLowerCase();
        if (
          lower.includes("llave duplicada") ||
          lower.includes("duplicate key") ||
          lower.includes("unicidad") ||
          lower.includes("unique constraint")
        ) {
          friendly =
            "No se pudo duplicar porque el número generado ya existe. Cambia el número y vuelve a intentarlo.";
        } else if (!lower.includes("<html") && data.length < 200) {
          friendly = data;
        } else if (status >= 500) {
          friendly =
            "Error interno del servidor al duplicar el presupuesto. Prueba más tarde.";
        }
      } else if (data && typeof data === "object") {
        if (Array.isArray(data.number)) {
          friendly = data.number.join(" ");
        } else if (Array.isArray(data.non_field_errors)) {
          friendly = data.non_field_errors.join(" ");
        }
      }

      setToast({ kind: "error", msg: friendly });
    }
  };

  // --- Acciones de facturas ---------------------------------------

  const handlePostInvoice = async (inv) => {
    if (!org?.slug) return;
    if (inv.status === "posted") return;
    if (
      !window.confirm(
        `¿Contabilizar la factura ${inv.series || ""}${
          inv.number
        }? Después no se podrá editar.`
      )
    ) {
      return;
    }
    try {
      const { data } = await http.post(
        tpath(org.slug, `/sales/invoices/${inv.id}/post/`)
      );
      setInvoices((prev) => prev.map((i) => (i.id === data.id ? data : i)));
      setToast({
        kind: "success",
        msg: `Factura ${data.series || ""}${data.number} contabilizada.`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo contabilizar la factura.",
      });
    }
  };

  const handleRegisterPayment = (inv) => {
    if (!org?.slug) return;
    setInvoiceForPayment(inv);
    setPaymentModalOpen(true);
  };

  const handleDeleteQuote = async (quote) => {
    if (!org?.slug) return;

    if (
      !window.confirm(
        `¿Eliminar el presupuesto ${quote.number}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await http.delete(tpath(org.slug, `/sales/quotes/${quote.id}/`));
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
      setToast({
        kind: "success",
        msg: `Presupuesto ${quote.number} eliminado correctamente.`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo eliminar el presupuesto.",
      });
    }
  };

  const handleEditInvoice = (inv) => {
    if (!org?.slug) return;
    if (inv.status === "posted") return; // por si acaso
    setInvoiceToEdit(inv);
    setInvoiceModalOpen(true);
  };

  const handleOpenInvoicePdf = (inv) => {
    if (!org?.slug || !inv?.id) return;
    const url = tpath(org.slug, `/sales/invoices/${inv.id}/print/`);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --- Acciones de Albarán ---------------------------------------
  const handleConfirmDeliveryNote = async (dn) => {
    if (!org?.slug) return;
    if (dn.status === "done") return;

    if (
      !window.confirm(
        `¿Confirmar el albarán ${dn.number}? Esto actualizará el stock.`
      )
    ) {
      return;
    }

    try {
      const { data } = await http.post(
        tpath(org.slug, `/sales/delivery-notes/${dn.id}/confirm/`)
      );
      setDeliveryNotes((prev) =>
        prev.map((d) => (d.id === data.id ? data : d))
      );
      setToast({
        kind: "success",
        msg: `Albarán ${data.number} confirmado.`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo confirmar el albarán.",
      });
    }
  };

  const handleDeleteDeliveryNote = async (dn) => {
    if (!org?.slug) return;

    if (
      !window.confirm(
        `¿Eliminar el albarán ${dn.number}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await http.delete(tpath(org.slug, `/sales/delivery-notes/${dn.id}/`));

      setDeliveryNotes((prev) => prev.filter((d) => d.id !== dn.id));

      setToast({
        kind: "success",
        msg: `Albarán ${dn.number} eliminado correctamente.`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        kind: "error",
        msg: "No se pudo eliminar el albarán.",
      });
    }
  };

  // --- Tabs --------------------------------------------------------

  function QuotesTab() {
    const [search, setSearch] = useState("");

    const filteredQuotes = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return quotes;
      return quotes.filter((q) => {
        const num = String(q.number || "").toLowerCase();
        const cust = displayContactName(
          q.customer_detail || q.customer
        )?.toLowerCase();
        return num.includes(term) || cust.includes(term);
      });
    }, [quotes, search]);

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-medium text-sm">Presupuestos</h2>
            <p className="text-xs text-gray-600">
              Lista de presupuestos y acciones básicas (enviar, aceptar,
              rechazar, convertir).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Buscar</label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm"
                placeholder="Número o cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={() => {
                setQuoteModalMode("create");
                setQuoteToEdit(null);
                setQuoteModalOpen(true);
              }}
            >
              Nuevo presupuesto
            </button>
          </div>
        </div>

        {loadingQuotes ? (
          <p className="text-sm text-gray-600">Cargando presupuestos…</p>
        ) : filteredQuotes.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay presupuestos que coincidan con el filtro.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Número</th>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">IVA</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-center font-medium">Estado</th>
                  <th className="px-3 py-2 text-center font-medium">Factura</th>
                  <th className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="border-t">
                    <td className="px-3 py-2">{q.number}</td>
                    <td className="px-3 py-2">{q.date}</td>
                    <td className="px-3 py-2">
                      {displayContactName(q.customer_detail || q.customer)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(q.totals_base)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(q.totals_tax)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(q.total)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-gray-100">
                        {q.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {q.invoice_id ? (
                        <span className="text-xs text-gray-700">
                          #{q.invoice_id}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {/* Editar cabecera */}
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => {
                          setQuoteModalMode("edit");
                          setQuoteToEdit(q);
                          setQuoteModalOpen(true);
                        }}
                      >
                        Editar
                      </button>

                      {/* Duplicar presupuesto */}
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleDuplicateQuote(q)}
                      >
                        Duplicar
                      </button>

                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleQuoteStatus(q, "mark_sent")}
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleQuoteStatus(q, "mark_accepted")}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        className="text-[11px] underline text-red-600"
                        onClick={() => handleQuoteStatus(q, "mark_rejected")}
                      >
                        Rechazar
                      </button>
                      {/* Eliminar presupuesto */}
                      <button
                        type="button"
                        className="text-[11px] underline text-red-600"
                        onClick={() => handleDeleteQuote(q)}
                      >
                        Eliminar
                      </button>

                      {!q.invoice_id && (
                        <button
                          type="button"
                          className="text-[11px] underline font-medium"
                          onClick={() => handleQuoteToInvoice(q)}
                        >
                          A factura
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function DeliveryNotesTab() {
    const [search, setSearch] = useState("");

    const filteredDeliveryNotes = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return deliveryNotes;

      return deliveryNotes.filter((dn) => {
        const num = String(dn.number || "").toLowerCase();
        const cust = displayContactName(
          dn.customer_detail || dn.customer
        )?.toLowerCase();
        const wh = String(dn.warehouse || "").toLowerCase();
        return num.includes(term) || cust.includes(term) || wh.includes(term);
      });
    }, [deliveryNotes, search]);

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">Albaranes</h2>
            <p className="text-xs text-gray-600">
              Lista de albaranes de salida. Puedes crear nuevos y confirmarlos
              para que actualicen el stock.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Buscar</label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm"
                placeholder="Número, cliente o almacén…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
              onClick={() => {
                setDeliveryModalMode("create");
                setDeliveryToEdit(null);
                setDeliveryModalOpen(true);
              }}
            >
              Nuevo albarán
            </button>
          </div>
        </div>

        {loadingDN ? (
          <p className="text-sm text-gray-600">Cargando albaranes…</p>
        ) : filteredDeliveryNotes.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay albaranes que coincidan con el filtro.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Número</th>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Almacén</th>
                  <th className="px-3 py-2 text-center font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveryNotes.map((dn) => (
                  <tr key={dn.id} className="border-t">
                    <td className="px-3 py-2">{dn.number}</td>
                    <td className="px-3 py-2">{dn.date}</td>
                    <td className="px-3 py-2">
                      {displayContactName(dn.customer_detail || dn.customer)}
                    </td>
                    <td className="px-3 py-2">
                      {dn.warehouse || "" /* por ahora viene como ID */}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${
                          dn.status === "done"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {dn.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {dn.status !== "done" && (
                        <>
                          <button
                            type="button"
                            className="text-[11px] underline"
                            onClick={() => {
                              setDeliveryModalMode("edit");
                              setDeliveryToEdit(dn);
                              setDeliveryModalOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-[11px] underline"
                            onClick={() => handleConfirmDeliveryNote(dn)}
                          >
                            Confirmar
                          </button>
                        </>
                      )}

                      {/* Eliminar (permitimos siempre, o si quieres solo drafts, mete condición) */}
                      {dn.status === "draft" && (
                        <button
                          type="button"
                          className="text-[11px] underline text-red-600"
                          onClick={() => handleDeleteDeliveryNote(dn)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function InvoicesTab() {
    const [search, setSearch] = useState("");

    const filteredInvoices = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return invoices;
      return invoices.filter((inv) => {
        const num = `${inv.series || ""}${inv.number || ""}`.toLowerCase();
        const cust = displayContactName(
          inv.customer_detail || inv.customer
        )?.toLowerCase();
        return num.includes(term) || cust.includes(term);
      });
    }, [invoices, search]);

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-medium text-sm">Facturas</h2>
            <p className="text-xs text-gray-600">
              Flujo de facturación SIF: ver, contabilizar y registrar cobros.
              Verifactu se deja para una actualización posterior.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Buscar</label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder="Número o cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loadingInv ? (
          <p className="text-sm text-gray-600">Cargando facturas…</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay facturas que coincidan con el filtro.
          </p>
        ) : (
          <div className="border rounded overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Número</th>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">IVA</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-center font-medium">Estado</th>
                  <th className="px-3 py-2 text-center font-medium">Cobro</th>
                  {/* <th className="px-3 py-2 text-center font-medium"> */}
                  {/* Verifactu */}
                  {/* </th> */}
                  <th className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-3 py-2">
                      {(inv.series || "") + (inv.number || "")}
                    </td>
                    <td className="px-3 py-2">{inv.date_issue}</td>
                    <td className="px-3 py-2">
                      {displayContactName(inv.customer_detail || inv.customer)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(inv.totals_base)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(inv.totals_tax)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(inv.total)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${
                          inv.status === "posted"
                            ? "bg-green-100 text-green-800"
                            : inv.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const badge = getPaymentStatusBadge(inv.payment_status);
                        return (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* <td className="px-3 py-2 text-center"> */}
                    {/* <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-gray-100"> */}
                    {/* {inv.verifactu_status || "pending"} */}
                    {/* </span> */}
                    {/* </td> */}
                    <td className="px-3 py-2 text-right space-x-2">
                      {inv.status !== "posted" && (
                        <>
                          <button
                            type="button"
                            className="text-[11px] underline"
                            onClick={() => handleEditInvoice(inv)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-[11px] underline font-medium"
                            onClick={() => handlePostInvoice(inv)}
                          >
                            Contabilizar
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleRegisterPayment(inv)}
                      >
                        Cobro
                      </button>

                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() => handleOpenInvoicePdf(inv)}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const tabs = useMemo(
    () => [
      { key: "quotes", label: "Presupuestos", content: QuotesTab },
      { key: "delivery", label: "Albaranes", content: DeliveryNotesTab },
      { key: "invoices", label: "Facturas", content: InvoicesTab },
    ],
    [quotes, deliveryNotes, invoices, loadingQuotes, loadingDN, loadingInv]
  );

  return (
    <section className="p-4 space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Finanzas</h1>
        <p className="text-xs text-gray-600">
          Presupuestos, albaranes y facturas. Flujo de facturación SIF listo;
          Verifactu llegará en una actualización posterior.
        </p>
      </header>

      {toast?.msg && (
        <Toast
          kind={toast.kind || "error"}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}

      <Tabs tabs={tabs} initial={0} />

      {/* Modal de presupuesto (create/edit) */}
      <QuoteModal
        open={quoteModalOpen}
        mode={quoteModalMode}
        initial={quoteToEdit}
        onClose={() => {
          setQuoteModalOpen(false);
          setQuoteToEdit(null);
        }}
        onSaved={async () => {
          await loadQuotes();
        }}
      />
      <InvoiceLinesModal
        open={invoiceModalOpen}
        invoice={invoiceToEdit}
        onClose={() => {
          setInvoiceModalOpen(false);
          setInvoiceToEdit(null);
        }}
        onSaved={async () => {
          await loadInvoices();
        }}
      />
      <InvoicePaymentModal
        open={paymentModalOpen}
        invoice={invoiceForPayment}
        onClose={() => {
          setPaymentModalOpen(false);
          setInvoiceForPayment(null);
        }}
        onSaved={async () => {
          await loadInvoices();
          setToast({
            kind: "success",
            msg: `Cobro registrado para la factura ${
              (invoiceForPayment?.series || "") +
              (invoiceForPayment?.number || "")
            }.`,
          });
        }}
      />

      <DeliveryNoteModal
        open={deliveryModalOpen}
        mode={deliveryModalMode}
        initial={deliveryToEdit}
        onClose={() => {
          setDeliveryModalOpen(false);
          setDeliveryToEdit(null);
        }}
        onSaved={async () => {
          await loadDeliveryNotes();
        }}
      />
    </section>
  );
}
