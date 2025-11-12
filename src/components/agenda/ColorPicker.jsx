// --- FILE: src/components/agenda/ColorPicker.jsx
const DEFAULTS = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
];
export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DEFAULTS.map((c) => (
        <button
          key={c}
          type="button"
          className="w-6 h-6 rounded-full border"
          style={{ background: c }}
          onClick={() => onChange?.(c)}
        />
      ))}
      <input
        className="input w-28"
        placeholder="#RRGGBB"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
