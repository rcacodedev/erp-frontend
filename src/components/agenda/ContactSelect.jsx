import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export default function ContactSelect({ value, onChange }) {
  const { org } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await http.get(tpath(org.slug, `/contacts`), {
          params: { query: q },
          signal: ctrl.signal,
        });
        setItems(normalizeRows(data));
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
          /* ignore */
        } else console.error("ContactSelect fetch error:", err);
      }
    }, 250);
    return () => {
      clearTimeout(debounceRef.current);
      ctrl.abort();
    };
  }, [q, org.slug]);

  return (
    <div className="space-y-1">
      <input
        className="input"
        placeholder="Buscar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="select"
        value={value ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">— Sin contacto —</option>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name || c.razon_social || c.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
