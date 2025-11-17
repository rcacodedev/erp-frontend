import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function Navbar() {
  const { user, org, logout } = useAuth();
  const nav = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
      nav("/login");
    } catch {
      // noop
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b navbar-print-hide">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="font-semibold tracking-tight">
          ERP<span className="text-gray-500">.MVP</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/contacts/clients"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            Contactos
          </NavLink>
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            Inventario
          </NavLink>

          <NavLink
            to="/finanzas"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            Finanzas
          </NavLink>

          <NavLink
            to="/kpis"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            KPIs
          </NavLink>

          <NavLink
            to="/billing/plans"
            className={({ isActive }) =>
              `px-2 py-1 rounded ${
                isActive ? "bg-black text-white" : "hover:bg-gray-100"
              }`
            }
          >
            Billing
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {org?.slug && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100">
              Org: <span className="font-medium">{org.slug}</span>
            </span>
          )}
          {user?.email && (
            <span className="text-xs text-gray-600">{user.email}</span>
          )}
          <button
            onClick={onLogout}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
