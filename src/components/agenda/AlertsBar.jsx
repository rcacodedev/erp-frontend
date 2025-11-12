// --- FILE: src/components/agenda/AlertsBar.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

export default function AlertsBar() {
  const { org } = useAuth();
  const [data, setData] = useState({
    notes_pinned: [],
    events_today: [],
    events_tomorrow: [],
    notes_overdue: [],
  });

  useEffect(() => {
    (async () => {
      const { data } = await http.get(tpath(org.slug, `/agenda/alerts`));
      setData(data);
    })();
  }, [org.slug]);

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      {data.notes_overdue?.slice(0, 4).map((n) => (
        <div
          key={`o-${n.id}`}
          className="card p-3 border-l-4"
          style={{ borderColor: n.color || "#ef4444" }}
        >
          <div className="text-sm">📌 Vencida</div>
          <div className="font-medium">{n.title}</div>
        </div>
      ))}
      {data.events_today?.slice(0, 4).map((e) => (
        <div
          key={`t-${e.id}`}
          className="card p-3 border-l-4"
          style={{ borderColor: e.color || "#2563eb" }}
        >
          <div className="text-sm">📅 Hoy</div>
          <div className="font-medium">{e.title}</div>
        </div>
      ))}
      {data.events_tomorrow?.slice(0, 4).map((e) => (
        <div
          key={`tm-${e.id}`}
          className="card p-3 border-l-4"
          style={{ borderColor: e.color || "#22c55e" }}
        >
          <div className="text-sm">🗓️ Mañana</div>
          <div className="font-medium">{e.title}</div>
        </div>
      ))}
      {data.notes_pinned?.slice(0, 4).map((n) => (
        <div
          key={`p-${n.id}`}
          className="card p-3 border-l-4"
          style={{ borderColor: n.color || "#8b5cf6" }}
        >
          <div className="text-sm">⭐ Fijada</div>
          <div className="font-medium">{n.title}</div>
        </div>
      ))}
    </div>
  );
}
