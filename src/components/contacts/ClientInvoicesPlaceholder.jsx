export default function ClientInvoicesPlaceholder() {
  return (
    <div className="p-4 border rounded bg-yellow-50 text-yellow-900">
      Módulo de <b>Facturación</b> pendiente de implementar. Aquí listaremos
      facturas de este cliente desde{" "}
      <code>/contacts/clients/:id/invoices/</code> cuando esté listo.
    </div>
  );
}
