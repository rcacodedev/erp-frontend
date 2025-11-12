// --- FILE: src/components/agenda/QuickNotes.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import ColorPicker from "./ColorPicker.jsx";
import ContactName from "./ContactName.jsx";

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export default function QuickNotes({ onChanged, refreshToken }) {
  const { org } = useAuth();
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState({
    title: "",
    color: "",
    is_important: false,
  });

  const load = async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toISOString();
    const { data } = await http.get(tpath(org.slug, `/agenda/notes/`), {
      params: { start, end, include_undated: true },
    });
    setList(normalizeRows(data));
  };

  useEffect(() => {
    load();
  }, [org.slug, refreshToken]);

  const add = async () => {
    if (!draft.title.trim()) return;
    await http.post(tpath(org.slug, `/agenda/notes/`), {
      title: draft.title,
      body: "",
      is_task: true,
      is_important: draft.is_important,
      color: draft.color || null,
    });
    setDraft({ title: "", color: "", is_important: false });
    await load();
    onChanged?.();
  };

  const toggleDone = async (note) => {
    await http.patch(tpath(org.slug, `/agenda/notes/${note.id}/`), {
      status: note.status === "done" ? "pending" : "done",
    });
    await load();
    onChanged?.();
  };

  const safeList = Array.isArray(list) ? list : [];

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Notas rápidas</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <input
          className="input"
          placeholder="Escribe una nota…"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <ColorPicker
          value={draft.color}
          onChange={(c) => setDraft({ ...draft, color: c })}
        />
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.is_important}
            onChange={(e) =>
              setDraft({ ...draft, is_important: e.target.checked })
            }
          />
          <span>Importante</span>
        </label>
        <button className="btn" onClick={add}>
          Añadir
        </button>
      </div>

      <ul className="mt-3 divide-y">
        {safeList.map((n) => (
          <li key={n.id} className="py-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={n.status === "done"}
              onChange={() => toggleDone(n)}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: n.color || "#64748b" }}
            />
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm truncate ${
                  n.status === "done" ? "line-through text-neutral-400" : ""
                }`}
              >
                {n.title}{" "}
                {n.is_important ? (
                  <span className="badge badge-warn ml-1">¡Importante!</span>
                ) : null}
              </div>
              <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                {n.due_date ? (
                  <span className="badge">
                    {new Date(n.due_date).toLocaleDateString()}
                  </span>
                ) : null}
                {n.contact ? <ContactName id={n.contact} /> : null}
                {n.status ? (
                  <span className="badge badge-soft">{n.status}</span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
