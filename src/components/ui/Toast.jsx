import { createContext, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastHost() {
  const [items, setItems] = useState([]);
  const api = useMemo(
    () => ({
      push(t) {
        const id = Math.random().toString(36).slice(2);
        setItems((xs) => [...xs, { id, ...t }]);
        setTimeout(
          () => setItems((xs) => xs.filter((i) => i.id !== id)),
          t.timeout ?? 2500
        );
      },
      success(msg) {
        this.push({ kind: "success", msg });
      },
      error(msg) {
        this.push({ kind: "error", msg, timeout: 3500 });
      },
    }),
    []
  );

  return (
    <ToastCtx.Provider value={api}>
      {/* children? no hace falta, insertamos este host en la página */}
      <div className="fixed top-3 right-3 z-[9999] space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-xl shadow-md border text-sm ${
              t.kind === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToasts() {
  return useContext(ToastCtx) ?? { success() {}, error() {} };
}
