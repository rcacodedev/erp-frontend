import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

export default function ClientNotes({ clientId }) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const load = async () => {
    if (!org?.slug || !clientId) return;
    const { data } = await http.get(
      tpath(org.slug, `/contacts/clients/${clientId}/notes/`)
    );
    setRows(Array.isArray(data?.results) ? data.results : data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [org?.slug, clientId]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Notas</h3>
        {/* TODO: nueva nota */}
      </div>
      <ul className="space-y-2">
        {!rows.length ? (
          <li className="text-gray-500">Sin notas</li>
        ) : (
          rows.map((n) => (
            <li key={n.id} className="border rounded p-2">
              <div className="text-sm font-medium">
                {n.titulo}{" "}
                {n.importante ? (
                  <span className="ml-1 text-red-600">●</span>
                ) : null}
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {n.texto}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
