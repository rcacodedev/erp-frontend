import DataTable from "../../components/DataTable.jsx";
import { useTenantList } from "./useTenantList";
import { downloadCSV } from "../../lib/csv";

export default function Suppliers() {
  const { rows, loading, error } = useTenantList("/contacts/suppliers/");
  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Proveedor" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Teléfono" },
    { key: "vat_number", header: "NIF/CIF" },
    { key: "lead_time_days", header: "Lead Time (d)" },
  ];
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Proveedores</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => downloadCSV("proveedores.csv", rows)}
          >
            Exportar CSV
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
      />
    </section>
  );
}
