// --- FILE: src/pages/agenda/SuperAgenda.jsx
import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import AlertsBar from "../../components/agenda/AlertsBar.jsx";
import OverlayToggles from "../../components/agenda/OverlayToggles.jsx";
import SidebarToday from "../../components/agenda/SidebarToday.jsx";
import QuickNotes from "../../components/agenda/QuickNotes.jsx";
import EventModal from "../../components/agenda/EventModal.jsx";
import EventContextMenu from "../../components/agenda/EventContextMenu.jsx";
import { formatMoney, formatTimeRange } from "../../lib/format.js";
import { contactCache, invoiceCache } from "../../lib/cache.js";
import HoverCard from "../../components/agenda/HoverCard.jsx";
import { contrastText, mixWithWhite } from "../../lib/color.js";

// import { ToastHost, useToasts } from "../../components/ui/Toast.jsx"; // si lo usas

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}
const LS_KEY = "agenda_prefs_v1";

export default function SuperAgenda() {
  const { org } = useAuth();
  // const toasts = useToasts();

  const [events, setEvents] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [noteEvents, setNoteEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return saved.view || "dayGridMonth";
  });
  const [showOverlays, setShowOverlays] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return saved.showOverlays ?? true;
  });
  const [onlyImportant, setOnlyImportant] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return saved.onlyImportant ?? false;
  });
  const [query, setQuery] = useState("");
  const [notesTick, setNotesTick] = useState(0);

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    kind: "event",
    data: null,
    date: null,
  });

  // Context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const [ctxEvent, setCtxEvent] = useState(null);

  // Tooltip
  const [tt, setTt] = useState({ x: null, y: null, node: null, data: null });
  const moveHandlerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [hoveringCard, setHoveringCard] = useState(false);

  const calRef = useRef(null);
  const lastRangeRef = useRef({ start: null, end: null });
  const inFlightRef = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ view, showOverlays, onlyImportant })
    );
  }, [view, showOverlays, onlyImportant]);

  const fetchEvents = async (start, end, queryStr = "") => {
    const params = { start, end };
    if (onlyImportant) params.important = "true";
    if (queryStr) params.query = queryStr;
    const { data } = await http.get(tpath(org.slug, `/agenda/events/`), {
      params,
    });
    const rows = normalizeRows(data);
    setEvents(
      rows.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.all_day,
        titleAttr: e.title,
        backgroundColor: e.color || undefined,
        borderColor: e.color || undefined,
        extendedProps: { ...e, kind: "event" },
      }))
    );
  };

  const fetchOverlays = async (start, end) => {
    if (!showOverlays) {
      setOverlays([]);
      return;
    }
    const { data } = await http.get(
      tpath(org.slug, `/agenda/overlays/invoice-dues/`),
      { params: { start, end } }
    );
    const rows = normalizeRows(data);
    setOverlays(
      rows.map((o) => ({
        id: o.id,
        title: o.title,
        start: o.date,
        end: o.date,
        allDay: true,
        classNames: ["overlay-invoice"],
        titleAttr: o.title,
        extendedProps: { ...o, kind: "overlay" },
      }))
    );
  };

  const fetchImportantNotes = async (start, end) => {
    const { data } = await http.get(tpath(org.slug, `/agenda/notes/`), {
      params: { start, end, is_important: true },
    });
    const rows = normalizeRows(data);
    setNoteEvents(
      rows
        .filter((n) => !!n.due_date)
        .map((n) => ({
          id: `note-${n.id}`,
          title: n.title,
          start: n.due_date,
          end: n.due_date,
          allDay: true,
          classNames: ["note-important"],
          titleAttr: n.title,
          extendedProps: { ...n, kind: "note" },
        }))
    );
  };

  const doFetch = async (startISO, endISO, queryStr = query) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      await Promise.all([
        fetchEvents(startISO, endISO, queryStr),
        fetchOverlays(startISO, endISO),
        fetchImportantNotes(startISO, endISO),
      ]);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const handleDatesSet = async (arg) => {
    const startISO = arg.start.toISOString();
    const endISO = arg.end.toISOString();
    const { start: prevS, end: prevE } = lastRangeRef.current;
    if (prevS === startISO && prevE === endISO) return;
    lastRangeRef.current = { start: startISO, end: endISO };
    await doFetch(startISO, endISO);
  };

  // 👇 Doble clic: si estás en Semana (timeGridWeek) y haces doble clic,
  // abrimos modal con start=click y end=+1h. Con un solo clic, comportamiento normal.
  const onDateClick = (info) => {
    const isDouble = info.jsEvent && info.jsEvent.detail >= 2;
    const currentView = calRef.current?.getApi().view?.type;
    const base = {
      open: true,
      mode: "create",
      kind: "event",
      data: null,
    };

    if (isDouble && currentView === "timeGridWeek") {
      const start = new Date(info.date);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setModal({ ...base, date: start });
      // El end lo metemos dentro del modal: al abrir, si llega initialDate en semanal, pre-rellenas end=+1h (lo hacemos ya abajo)
      // Para no tocar mucho EventModal, mandaremos ambos por props opcionales:
      setTimeout(() => {
        // hack suave: guardamos en window para que el modal pueda leerlo opcionalmente.
        window.__agenda_default_end = end.toISOString().slice(0, 16);
      });
    } else {
      setModal({ ...base, date: info.date });
      window.__agenda_default_end = null;
    }
  };

  const onEventClick = (clickInfo) => {
    const data = clickInfo.event.extendedProps;
    if (data.kind === "overlay") return;
    if (data.kind === "note") {
      setModal({ open: true, mode: "edit", kind: "note", data, date: null });
    } else {
      setModal({ open: true, mode: "edit", kind: "event", data, date: null });
    }
  };

  // Context menu con botón secundario
  const onEventDidMount = (info) => {
    info.el.setAttribute("title", info.event.title || "Evento");
    info.el.oncontextmenu = (e) => {
      e.preventDefault();
      const data = info.event.extendedProps;
      if (data.kind === "overlay") return;
      setCtxEvent(data);
      setCtxPos({ x: e.clientX, y: e.clientY });
      setCtxOpen(true);
    };
  };
  const closeCtx = () => setCtxOpen(false);

  // Drag & drop / resize
  const onEventDrop = async (changeInfo) => {
    const { event } = changeInfo;
    const id = event.extendedProps?.id || event.id;
    if (!id) return;
    await http.patch(tpath(org.slug, `/agenda/events/${id}/`), {
      start: event.start ? new Date(event.start).toISOString() : null,
      end: event.end ? new Date(event.end).toISOString() : null,
      all_day: event.allDay ?? false,
    });
    refresh();
  };
  const onEventResize = async (resizeInfo) => {
    const { event } = resizeInfo;
    const id = event.extendedProps?.id || event.id;
    if (!id) return;
    await http.patch(tpath(org.slug, `/agenda/events/${id}/`), {
      start: event.start ? new Date(event.start).toISOString() : null,
      end: event.end ? new Date(event.end).toISOString() : null,
    });
    refresh();
  };

  const refresh = () => {
    const { start, end } = lastRangeRef.current;
    if (start && end) doFetch(start, end);
  };

  // Render con contraste automático
  const renderEvent = (arg) => {
    const data = arg.event.extendedProps || {};
    const bg =
      data.kind === "overlay"
        ? "rgba(37,99,235,0.06)"
        : data.kind === "note"
        ? "rgba(251,191,36,0.10)"
        : data.color
        ? mixWithWhite(data.color, 0.85)
        : "rgba(148,163,184,0.15)";
    const txt = data.color ? contrastText(data.color) : "#111";
    const border =
      data.color ||
      (data.kind === "overlay"
        ? "rgb(37,99,235)"
        : data.kind === "note"
        ? "rgb(251,191,36)"
        : "rgb(203,213,225)");

    return (
      <div
        className={`px-2 py-1 rounded-lg ${
          data.status === "done" ? "opacity-80 line-through" : ""
        }`}
        style={{
          background: bg,
          color: txt,
          border: `1px solid ${border}`,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={arg.event.title}
      >
        <span className="font-medium">{arg.event.title}</span>
      </div>
    );
  };

  // Búsqueda con debounce
  useEffect(() => {
    if (!lastRangeRef.current.start) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetch(lastRangeRef.current.start, lastRangeRef.current.end, query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, onlyImportant, showOverlays, org.slug]);

  // ---------- TOOLTIP LOGIC ----------
  const ensureContactName = async (contactId) => {
    if (!contactId) return null;
    if (contactCache.has(contactId)) return contactCache.get(contactId);
    try {
      const { data } = await http.get(
        tpath(org.slug, `/contacts/${contactId}`)
      );
      const name =
        data?.name || data?.razon_social || data?.full_name || `#${contactId}`;
      contactCache.set(contactId, name);
      return name;
    } catch {
      return `#${contactId}`;
    }
  };

  const ensureInvoiceInfo = async (invoiceId) => {
    if (!invoiceId) return null;
    if (invoiceCache.has(invoiceId)) return invoiceCache.get(invoiceId);
    try {
      const { data } = await http.get(
        tpath(org.slug, `/sales/invoices/${invoiceId}`)
      );
      const info = {
        total: data?.total ?? null,
        currency: data?.currency ?? "EUR",
        payment_status: data?.payment_status ?? "",
        number: data?.number ?? `#${invoiceId}`,
      };
      invoiceCache.set(invoiceId, info);
      return info;
    } catch {
      return null;
    }
  };

  const buildTooltipContent = (payload) => {
    const { kind } = payload;
    if (kind === "overlay") {
      const txtAmount = formatMoney(payload.amount, payload.currency);
      return (
        <div>
          <div className="font-semibold">{payload.title}</div>
          <div className="text-xs text-neutral-500">
            {new Date(payload.date).toLocaleDateString()}
          </div>
          <div className="mt-1">{txtAmount}</div>
          {payload.status ? (
            <div className="text-xs mt-1">Estado: {payload.status}</div>
          ) : null}
        </div>
      );
    }
    if (kind === "note") {
      return (
        <div>
          <div className="font-semibold">📝 {payload.title}</div>
          {payload.due_date ? (
            <div className="text-xs text-neutral-500">
              Fecha: {new Date(payload.due_date).toLocaleDateString()}
            </div>
          ) : null}
          {payload.contact_name ? (
            <div className="text-xs mt-1">Contacto: {payload.contact_name}</div>
          ) : null}
          {payload.status ? (
            <div className="text-xs mt-1">Estado: {payload.status}</div>
          ) : null}
        </div>
      );
    }
    // kind === "event"
    return (
      <div>
        <div className="font-semibold">{payload.title}</div>
        <div className="text-xs text-neutral-500">
          {formatTimeRange(payload.start, payload.end, payload.all_day)}
        </div>
        {payload.contact_name ? (
          <div className="text-xs mt-1">Contacto: {payload.contact_name}</div>
        ) : null}
        {payload.invoice_info ? (
          <div className="text-xs mt-1">
            Factura {payload.invoice_info.number}:{" "}
            {formatMoney(
              payload.invoice_info.total,
              payload.invoice_info.currency
            )}{" "}
            · {payload.invoice_info.payment_status}
          </div>
        ) : null}
      </div>
    );
  };

  const eventMouseEnter = async (info) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    const data = { ...info.event.extendedProps };
    if (data.contact && !data.contact_name) {
      try {
        const { data: c } = await http.get(
          tpath(org.slug, `/contacts/${data.contact}`)
        );
        data.contact_name =
          c?.name || c?.razon_social || c?.full_name || `#${data.contact}`;
        contactCache.set(data.contact, data.contact_name);
      } catch {}
    }
    if (data.invoice && !data.invoice_info) {
      try {
        const { data: inv } = await http.get(
          tpath(org.slug, `/sales/invoices/${data.invoice}`)
        );
        data.invoice_info = {
          total: inv?.total ?? null,
          currency: inv?.currency ?? "EUR",
          payment_status: inv?.payment_status ?? "",
          number: inv?.number ?? `#${data.invoice}`,
        };
        invoiceCache.set(data.invoice, data.invoice_info);
      } catch {}
    }
    const target = info.el;
    const move = (e) =>
      setTt({ x: e.clientX, y: e.clientY, node: target, data });
    moveHandlerRef.current = move;
    target.addEventListener("mousemove", move);
    setTt({ x: null, y: null, node: target, data });
  };

  const eventMouseLeave = () => {
    if (hoveringCard) {
      // damos “gracia”: si el puntero está en el card, esperamos por si vuelve
      hideTimerRef.current = setTimeout(() => {
        if (!hoveringCard) {
          if (tt.node && moveHandlerRef.current)
            tt.node.removeEventListener("mousemove", moveHandlerRef.current);
          moveHandlerRef.current = null;
          setTt({ x: null, y: null, node: null, data: null });
        }
      }, 400);
      return;
    }
    if (tt.node && moveHandlerRef.current)
      tt.node.removeEventListener("mousemove", moveHandlerRef.current);
    moveHandlerRef.current = null;
    setTt({ x: null, y: null, node: null, data: null });
  };

  const patchEventQuick = async (id, partial) => {
    await http.patch(tpath(org.slug, `/agenda/events/${id}/`), partial);
    refresh();
    // también actualizamos localmente para snappiness
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, extendedProps: { ...e.extendedProps, ...partial } }
          : e
      )
    );
  };

  const patchNoteQuick = async (id, partial) => {
    await http.patch(tpath(org.slug, `/agenda/notes/${id}/`), partial);
    refresh();
    setNoteEvents((prev) =>
      prev.map((n) =>
        n.id === `note-${id}`
          ? { ...n, extendedProps: { ...n.extendedProps, ...partial } }
          : n
      )
    );
  };

  // -----------------------------------

  return (
    <>
      {/* <ToastHost /> si usas toasts */}
      <div className="p-4 grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <AlertsBar />
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                className="btn"
                onClick={() =>
                  setModal({
                    open: true,
                    mode: "create",
                    kind: "event",
                    data: null,
                    date: new Date(),
                  })
                }
              >
                Crear
              </button>
              <OverlayToggles
                showOverlays={showOverlays}
                onToggleOverlays={setShowOverlays}
                onlyImportant={onlyImportant}
                onToggleImportant={setOnlyImportant}
                onChanged={() => refresh()}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input w-56"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="btn"
                onClick={() => calRef.current?.getApi().today()}
              >
                Hoy
              </button>
              <button
                className={`tab ${view === "dayGridMonth" ? "tab-active" : ""}`}
                onClick={() => {
                  setView("dayGridMonth");
                  calRef.current?.getApi().changeView("dayGridMonth");
                }}
              >
                Mes
              </button>
              <button
                className={`tab ${view === "timeGridWeek" ? "tab-active" : ""}`}
                onClick={() => {
                  setView("timeGridWeek");
                  calRef.current?.getApi().changeView("timeGridWeek");
                }}
              >
                Semana
              </button>
            </div>
          </div>

          <div className="card p-2 min-h-[420px] relative">
            {loading ? (
              <div className="absolute inset-0 p-2">
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-neutral-100 rounded" />
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div key={i} className="h-24 bg-neutral-100 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              headerToolbar={{ left: "prev,next", center: "title", right: "" }}
              locales={[esLocale]}
              locale="es"
              selectable
              selectMirror
              editable
              eventDurationEditable
              datesSet={handleDatesSet}
              dateClick={onDateClick}
              eventClick={onEventClick}
              eventDrop={onEventDrop}
              eventResize={onEventResize}
              eventDidMount={onEventDidMount}
              eventContent={renderEvent}
              eventMouseEnter={eventMouseEnter}
              eventMouseLeave={eventMouseLeave}
              events={[...events, ...noteEvents, ...overlays]}
              height="auto"
            />

            {ctxOpen && ctxEvent ? (
              <EventContextMenu
                x={ctxPos.x}
                y={ctxPos.y}
                onEdit={() => {
                  setModal({
                    open: true,
                    mode: "edit",
                    kind: "event",
                    data: ctxEvent,
                    date: null,
                  });
                  closeCtx();
                }}
                onDuplicate={async () => {
                  try {
                    await http.post(tpath(org.slug, `/agenda/events/`), {
                      title: `${ctxEvent.title} (copia)`,
                      start: ctxEvent.start,
                      end: ctxEvent.end,
                      all_day: ctxEvent.all_day,
                      notes: ctxEvent.notes || "",
                      contact: ctxEvent.contact ?? null,
                      color: ctxEvent.color || null,
                      is_important: !!ctxEvent.is_important,
                      status: ctxEvent.status || "scheduled",
                    });
                    // toasts?.success?.("Cita duplicada");
                    refresh();
                  } catch (e) {
                    // toasts?.error?.("No se pudo duplicar");
                    console.error(e);
                  } finally {
                    closeCtx();
                  }
                }}
                onDelete={async () => {
                  if (!confirm("¿Eliminar definitivamente esta cita?")) return;
                  try {
                    await http.delete(
                      tpath(org.slug, `/agenda/events/${ctxEvent.id}/`)
                    );
                    // toasts?.success?.("Cita eliminada");
                    refresh();
                  } catch (e) {
                    // toasts?.error?.("No se pudo eliminar");
                    console.error(e);
                  } finally {
                    closeCtx();
                  }
                }}
                onClose={closeCtx}
              />
            ) : null}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <SidebarToday
            range={lastRangeRef.current}
            events={events}
            overlays={overlays}
            onRefresh={refresh}
            onCreateEvent={() =>
              setModal({
                open: true,
                mode: "create",
                kind: "event",
                data: null,
                date: new Date(),
              })
            }
            onCreateNote={() =>
              setModal({
                open: true,
                mode: "create",
                kind: "note",
                data: null,
                date: new Date(),
              })
            }
          />
        </div>

        <div className="col-span-12">
          <QuickNotes onChanged={refresh} refreshToken={notesTick} />
        </div>

        {modal.open && (
          <EventModal
            open={modal.open}
            mode={modal.mode}
            kind={modal.kind}
            initialDate={modal.date}
            data={modal.data}
            onClose={() => setModal({ open: false })}
            onSaved={() => {
              setModal({ open: false });
              refresh();
              setNotesTick((t) => t + 1);
              // toasts?.success?.("Guardado");
            }}
          />
        )}
      </div>

      {/* Tooltip flotante */}
      {tt.data ? (
        <HoverCard
          x={tt.x}
          y={tt.y}
          onEnter={() => {
            setHoveringCard(true);
            if (hideTimerRef.current) {
              clearTimeout(hideTimerRef.current);
              hideTimerRef.current = null;
            }
          }}
          onLeave={() => {
            setHoveringCard(false);
            hideTimerRef.current = setTimeout(() => {
              if (!hoveringCard) {
                if (tt.node && moveHandlerRef.current)
                  tt.node.removeEventListener(
                    "mousemove",
                    moveHandlerRef.current
                  );
                moveHandlerRef.current = null;
                setTt({ x: null, y: null, node: null, data: null });
              }
            }, 400);
          }}
          actions={[
            ...(tt.data.kind !== "overlay"
              ? [
                  {
                    label: "Editar",
                    onClick: () => {
                      const kind = tt.data.kind === "note" ? "note" : "event";
                      setModal({
                        open: true,
                        mode: "edit",
                        kind,
                        data: tt.data,
                        date: null,
                      });
                      setTt({ x: null, y: null, node: null, data: null });
                    },
                  },
                ]
              : []),
            ...(tt.data.contact
              ? [
                  {
                    label: "Ver contacto",
                    onClick: () =>
                      window.open(
                        `/contacts/clients/${tt.data.contact}`,
                        "_self"
                      ),
                  },
                ]
              : []),
            ...(tt.data.invoice
              ? [
                  {
                    label: "Ver factura",
                    onClick: () =>
                      window.open(
                        `/finanzas/facturas/${tt.data.invoice}/print`,
                        "_self"
                      ),
                  },
                ]
              : []),
          ]}
        >
          {(() => {
            const d = tt.data;

            // -------- Overlay (solo lectura) --------
            if (d.kind === "overlay") {
              return (
                <div>
                  <div className="font-semibold">{d.title}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(d.date).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    {formatMoney(d.amount, d.currency)}
                  </div>
                  {d.status ? (
                    <div className="text-xs mt-1">Estado: {d.status}</div>
                  ) : null}
                </div>
              );
            }

            // -------- Nota: toggle done / importante --------
            if (d.kind === "note") {
              const isDone = d.status === "done";
              return (
                <div className="space-y-2">
                  <div className="font-semibold">📝 {d.title}</div>
                  {d.due_date ? (
                    <div className="text-xs text-neutral-500">
                      Fecha: {new Date(d.due_date).toLocaleDateString()}
                    </div>
                  ) : null}
                  {d.contact_name ? (
                    <div className="text-xs">Contacto: {d.contact_name}</div>
                  ) : null}

                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={async (e) => {
                          const status = e.target.checked ? "done" : "pending";
                          await patchNoteQuick(d.id, { status });
                          setTt((t) =>
                            t.data ? { ...t, data: { ...t.data, status } } : t
                          );
                        }}
                      />
                      <span>Completada</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!d.is_important}
                        onChange={async (e) => {
                          const is_important = e.target.checked;
                          await patchNoteQuick(d.id, { is_important });
                          setTt((t) =>
                            t.data
                              ? { ...t, data: { ...t.data, is_important } }
                              : t
                          );
                        }}
                      />
                      <span>Importante</span>
                    </label>
                  </div>
                </div>
              );
            }

            // -------- Evento: select estado / importante --------
            return (
              <div className="space-y-2">
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-neutral-500">
                  {formatTimeRange(d.start, d.end, d.all_day)}
                </div>
                {d.contact_name ? (
                  <div className="text-xs">Contacto: {d.contact_name}</div>
                ) : null}
                {d.invoice_info ? (
                  <div className="text-xs">
                    Factura {d.invoice_info.number}:{" "}
                    {formatMoney(d.invoice_info.total, d.invoice_info.currency)}{" "}
                    · {d.invoice_info.payment_status}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <label className="form-control">
                    <span className="label">Estado</span>
                    <select
                      className="select"
                      value={d.status || "scheduled"}
                      onChange={async (e) => {
                        const status = e.target.value;
                        await patchEventQuick(d.id, { status });
                        setTt((t) =>
                          t.data ? { ...t, data: { ...t.data, status } } : t
                        );
                      }}
                    >
                      <option value="scheduled">Programada</option>
                      <option value="done">Realizada</option>
                      <option value="canceled">Cancelada</option>
                    </select>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!d.is_important}
                      onChange={async (e) => {
                        const is_important = e.target.checked;
                        await patchEventQuick(d.id, { is_important });
                        setTt((t) =>
                          t.data
                            ? { ...t, data: { ...t.data, is_important } }
                            : t
                        );
                      }}
                    />
                    <span>Importante</span>
                  </label>
                </div>
              </div>
            );
          })()}
        </HoverCard>
      ) : null}
    </>
  );
}
