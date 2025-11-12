import { useNavigate } from "react-router-dom";

export default function SidebarToday({
  onRefresh,
  range,
  events = [],
  overlays = [],
  onCreateEvent,
  onCreateNote,
}) {
  const nav = useNavigate();
  const todayList = Array.isArray(events) ? events.slice(0, 8) : [];
  const pending = Array.isArray(overlays) ? overlays.slice(0, 8) : [];

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <div className="font-semibold mb-2">Hoy / Próximos</div>
        <ul className="space-y-1">
          {todayList.length === 0 ? (
            <li className="animate-pulse h-4 bg-neutral-100 rounded" />
          ) : null}
          {todayList.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: e.backgroundColor || "#64748b" }}
              />
              <span className="text-sm truncate">{e.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-3">
        <div className="font-semibold mb-2">Cobros pendientes</div>
        <ul className="space-y-1">
          {pending.length === 0 ? (
            <li className="animate-pulse h-4 bg-neutral-100 rounded" />
          ) : null}
          {pending.map((o) => (
            <li key={o.id} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" />
              <span className="text-sm truncate">{o.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-3">
        <div className="font-semibold mb-2">Accesos rápidos</div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-sm" onClick={() => onRefresh?.()}>
            Refrescar
          </button>
          <button className="btn btn-sm" onClick={() => onCreateEvent?.()}>
            Nueva cita
          </button>
          <button className="btn btn-sm" onClick={() => onCreateNote?.()}>
            Nueva nota
          </button>
          <button className="btn btn-sm" onClick={() => nav("/contacts")}>
            Clientes
          </button>
          <button className="btn btn-sm" onClick={() => nav("/finanzas")}>
            Finanzas
          </button>
        </div>
      </div>
    </div>
  );
}
