// --- FILE: src/components/agenda/HoverCard.jsx
export default function HoverCard({
  x,
  y,
  children,
  actions,
  onEnter,
  onLeave,
}) {
  if (x == null || y == null) return null;

  const stop = (e) => {
    e.stopPropagation();
    // Evita que FullCalendar/otros oyentes cierren el hover
    // o disparen clicks sobre el evento que está debajo
    e.preventDefault?.();
  };

  return (
    <div
      className="fixed z-[10050] max-w-xs rounded-2xl border border-neutral-200 bg-white shadow-2xl p-3 text-sm"
      style={{ left: x + 8, top: y + 8 }}
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="space-y-2">
        {children}
        {actions?.length ? (
          <div className="pt-2 border-t border-neutral-200 flex gap-2 flex-wrap">
            {actions.map((a, i) => (
              <button key={i} className="btn btn-sm" onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
