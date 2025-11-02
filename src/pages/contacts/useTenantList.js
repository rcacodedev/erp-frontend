import { useEffect, useState } from "react";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";
import { useAuth } from "../../auth/AuthProvider.jsx";

export function useTenantList(path) {
  const { org } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        if (!org?.slug) return;
        const { data } = await http.get(tpath(org.slug, path));
        const items = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        if (!cancelled) setRows(items);
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.detail || e.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [org?.slug, path]);

  return { rows, loading, error };
}
