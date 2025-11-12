import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import AuthProvider from "./auth/AuthProvider.jsx";
import ProtectedRoute from "./router/ProtectedRoute.jsx";

import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";

// Billing
import BillingPlans from "./pages/billing/BillingPlans.jsx";
import MySubscription from "./pages/billing/MySubscription.jsx";
import BillingSuccess from "./pages/billing/BillingSuccess.jsx";
import BillingCancel from "./pages/billing/BillingCancel.jsx";
import BillingPortalReturn from "./pages/billing/BillingPortalReturn.jsx";

// Contacts
import ContactsLayout from "./pages/contacts/ContactsLayout.jsx";
import Clients from "./pages/contacts/Clients.jsx";
import Employees from "./pages/contacts/Employees.jsx";
import Suppliers from "./pages/contacts/Suppliers.jsx";

// Perfiles
import ClientProfile from "./pages/contacts/ClientProfile.jsx";
import EmployeeProfile from "./pages/contacts/EmployeeProfile.jsx";
import SupplierProfile from "./pages/contacts/SupplierProfile.jsx";

import InventoryPage from "./pages/inventory/InventoryPage.jsx";
import FinancePage from "./pages/sales/FinancePage.jsx";

import InvoicePrintPage from "./pages/sales/InvoicePrintPage.jsx";
import QuotePrintPage from "./pages/sales/QuotePrintPage.jsx";
import DeliveryNotePrintPage from "./pages/sales/DeliveryNotePrintPage.jsx";

import SuperAgenda from "./pages/agenda/SuperAgenda.jsx";

// Layout protegido con Navbar + Outlet
function ProtectedShell() {
  return (
    <ProtectedRoute>
      <Navbar />
      <div className="p-4">
        <Outlet />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected root (dashboard, billing, contacts...) */}
          <Route element={<ProtectedShell />}>
            {/* Home → redirige a dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<SuperAgenda />} />

            {/* Inventario */}
            <Route path="/inventory" element={<InventoryPage />} />

            {/* Finanzas */}
            <Route path="/finanzas" element={<FinancePage />} />
            <Route
              path="/finanzas/facturas/:invoiceId/print"
              element={<InvoicePrintPage />}
            />
            <Route
              path="/finanzas/presupuestos/:quoteId/print"
              element={<QuotePrintPage />}
            />
            <Route
              path="/finanzas/albaranes/:deliveryNoteId/print"
              element={<DeliveryNotePrintPage />}
            />

            {/* Billing */}
            <Route path="/billing/plans" element={<BillingPlans />} />
            <Route
              path="/billing/my-subscription"
              element={<MySubscription />}
            />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/cancel" element={<BillingCancel />} />
            <Route
              path="/billing/portal-return"
              element={<BillingPortalReturn />}
            />

            {/* Contacts (usa tu ContactsLayout con <Outlet /> dentro) */}
            <Route path="/contacts" element={<ContactsLayout />}>
              {/* Listas */}
              <Route index element={<Clients />} />
              <Route path="clients" element={<Clients />} />
              <Route path="employees" element={<Employees />} />
              <Route path="suppliers" element={<Suppliers />} />

              {/* Perfiles */}
              <Route path="clients/:id" element={<ClientProfile />} />
              <Route path="employees/:id" element={<EmployeeProfile />} />
              <Route path="suppliers/:id" element={<SupplierProfile />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
