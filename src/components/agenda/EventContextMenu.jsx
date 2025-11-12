export default function EventContextMenu({
  x,
  y,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}) {
  return (
    <div
      className="fixed z-50 bg-white border border-neutral-200 rounded-xl shadow-xl min-w-[180px]"
      style={{ left: x + 4, top: y + 4 }}
      onMouseLeave={onClose}
    >
      <button
        className="w-full text-left px-3 py-2 hover:bg-neutral-100"
        onClick={onEdit}
      >
        ✏️ Editar
      </button>
      <button
        className="w-full text-left px-3 py-2 hover:bg-neutral-100"
        onClick={onDuplicate}
      >
        📄 Duplicar
      </button>
      <div className="h-px bg-neutral-200" />
      <button
        className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
        onClick={onDelete}
      >
        🗑️ Borrar
      </button>
    </div>
  );
}
