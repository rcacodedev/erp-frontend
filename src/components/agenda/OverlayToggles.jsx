export default function OverlayToggles({
  showOverlays,
  onToggleOverlays,
  onlyImportant,
  onToggleImportant,
  onChanged,
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={showOverlays}
          onChange={(e) => {
            onToggleOverlays?.(e.target.checked);
            onChanged?.();
          }}
        />
        <span>Vencimientos</span>
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={onlyImportant}
          onChange={(e) => {
            onToggleImportant?.(e.target.checked);
            onChanged?.();
          }}
        />
        <span>Solo importantes</span>
      </label>
    </div>
  );
}
