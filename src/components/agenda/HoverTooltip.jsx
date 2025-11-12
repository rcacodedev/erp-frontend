// --- FILE: src/components/agenda/HoverTooltip.jsx
export default function HoverTooltip({ x, y, children }) {
  if (x == null || y == null) return null;
  // Separación del cursor
  const style = { left: x + 12, top: y + 12 };
  return (
    <div
      className="fixed z-[9998] max-w-xs rounded-xl border border-neutral-200 bg-white shadow-xl p-3 text-sm leading-snug"
      style={style}
      role="tooltip"
    >
      {children}
    </div>
  );
}
