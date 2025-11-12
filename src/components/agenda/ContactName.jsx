import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import http from "../../api/http";
import { tpath } from "../../lib/tenantPath";

export default function ContactName({ id }) {
  const { org } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await http.get(tpath(org.slug, `/contacts/${id}`));
        setName(
          data?.name || data?.razon_social || data?.full_name || `#${id}`
        );
      } catch {
        setName(`#${id}`);
      }
    })();
  }, [id, org.slug]);

  if (!id) return null;
  return <span className="badge">{name}</span>;
}
