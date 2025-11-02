export default function Toast({ kind = "success", msg = "", onClose }) {
  if (!msg) return null;
  const cls =
    kind === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded px-3 py-2 text-sm ${cls}`}>
      <div className="flex items-start gap-2">
        <span className="font-medium">
          {kind === "error" ? "Error" : "Listo"}
        </span>
        <span className="flex-1">{msg}</span>
        <button
          className="text-xs underline opacity-70 hover:opacity-100"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
