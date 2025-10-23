import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider.jsx";
import ProtectedRoute from "./router/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

import BillingPlans from "./pages/billing/BillingPlans.jsx";
import MySubscription from "./pages/billing/MySubscription.jsx";
import BillingSuccess from "./pages/billing/BillingSuccess.jsx";
import BillingCancel from "./pages/billing/BillingCancel.jsx";
import BillingPortalReturn from "./pages/billing/BillingPortalReturn.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* App protegida */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Billing protegido */}
          <Route
            path="/billing/plans"
            element={
              <ProtectedRoute>
                <BillingPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/me"
            element={
              <ProtectedRoute>
                <MySubscription />
              </ProtectedRoute>
            }
          />

          {/* URLs de retorno desde Stripe (pueden ser públicas) */}
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
