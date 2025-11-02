export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  error = "",
}) {
  if (error) {
    return <div className="text-red-600">{error}</div>;
  }
  return (
    <div className="border rounded overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-2" colSpan={columns.length}>
                Cargando…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-3 py-2" colSpan={columns.length}>
                Sin datos
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
