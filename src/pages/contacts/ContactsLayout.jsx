import { NavLink, Outlet } from "react-router-dom";

export default function ContactsLayout() {
  const tabs = [
    { to: "/contacts/clients", label: "Clientes" },
    { to: "/contacts/employees", label: "Empleados" },
    { to: "/contacts/suppliers", label: "Proveedores" },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Contactos</h1>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm border ${
                isActive
                  ? "bg-black text-white border-black"
                  : "hover:bg-gray-50"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
