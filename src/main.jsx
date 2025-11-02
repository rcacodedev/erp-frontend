import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider.jsx";
import ProtectedRoute from "./router/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";

import BillingPlans from "./pages/billing/BillingPlans.jsx";
import MySubscription from "./pages/billing/MySubscription.jsx";
import BillingSuccess from "./pages/billing/BillingSuccess.jsx";
import BillingCancel from "./pages/billing/BillingCancel.jsx";
import BillingPortalReturn from "./pages/billing/BillingPortalReturn.jsx";

import ContactsLayout from "./pages/contacts/ContactsLayout.jsx";
import Clients from "./pages/contacts/Clients.jsx";
import Employees from "./pages/contacts/Employees.jsx";
import Suppliers from "./pages/contacts/Suppliers.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Contactos (protegido) */}
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Navbar />
                <ContactsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Clients />} />
            <Route path="clients" element={<Clients />} />
            <Route path="employees" element={<Employees />} />
            <Route path="suppliers" element={<Suppliers />} />
          </Route>

          {/* Billing (protegido) */}
          <Route
            path="/billing/plans"
            element={
              <ProtectedRoute>
                <Navbar />
                <BillingPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/my-subscription"
            element={
              <ProtectedRoute>
                <Navbar />
                <MySubscription />
              </ProtectedRoute>
            }
          />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />
          <Route
            path="/billing/portal-return"
            element={<BillingPortalReturn />}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
