// src/pages/settings/SettingsLayout.jsx
import { NavLink, Outlet } from "react-router-dom";

export default function SettingsLayout() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Ajustes</h1>

      {/* Tabs de secciones de ajustes */}
      <div className="border-b mb-4 flex gap-4">
        <NavLink
          to="email"
          className={({ isActive }) =>
            `pb-2 text-sm ${
              isActive
                ? "border-b-2 border-black font-medium"
                : "text-gray-500 hover:text-black"
            }`
          }
        >
          Correo
        </NavLink>

        <NavLink
          to="billing"
          className={({ isActive }) =>
            `pb-2 text-sm ${
              isActive
                ? "border-b-2 border-black font-medium"
                : "text-gray-500 hover:text-black"
            }`
          }
        >
          Facturación
        </NavLink>

        <NavLink
          to="integrations"
          className={({ isActive }) =>
            `pb-2 text-sm ${
              isActive
                ? "border-b-2 border-black font-medium"
                : "text-gray-500 hover:text-black"
            }`
          }
        >
          Integraciones
        </NavLink>

        {/* Futuras secciones:
        <NavLink to="profile">Cuenta</NavLink>
        <NavLink to="org">Organización</NavLink>
        */}
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <Outlet />
      </div>
    </div>
  );
}
