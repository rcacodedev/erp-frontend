import { useState } from "react";

export default function Tabs({ tabs = [], initial = 0 }) {
  const [idx, setIdx] = useState(initial);
  const Active = tabs[idx]?.content || null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((t, i) => (
          <button
            key={t.key || i}
            onClick={() => setIdx(i)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              i === idx
                ? "border-black font-medium"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{Active ? <Active /> : null}</div>
    </div>
  );
}
