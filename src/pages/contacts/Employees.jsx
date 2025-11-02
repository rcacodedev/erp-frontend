import DataTable from "../../components/DataTable.jsx";
import { useTenantList } from "./useTenantList";
import { downloadCSV } from "../../lib/csv";

export default function Employees() {
  const { rows, loading, error } = useTenantList("/contacts/employees/");
  const columns = [
    { key: "id", header: "ID" },
    { key: "first_name", header: "Nombre" },
    { key: "last_name", header: "Apellidos" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Teléfono" },
    { key: "position", header: "Puesto" },
  ];
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Empleados</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => downloadCSV("empleados.csv", rows)}
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
