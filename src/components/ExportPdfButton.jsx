// --- FILE: src/components/ExportPdfButton.jsx
import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Export PDF con 2 rutas:
 * 1) Canvas -> jsPDF (alta fidelidad, multipágina)
 * 2) Fallback sin popups: imprime en un iframe oculto (no lo bloquea Firefox)
 *
 * Props:
 * - getElement: () => HTMLElement a capturar
 * - filename: nombre.pdf
 * - pixelRatio: escala del rasterizado (2 recomendado)
 * - marginPt: margen en puntos del PDF
 */
export default function ExportPdfButton({
  getElement,
  filename = "kpis.pdf",
  pixelRatio = 2,
  marginPt = 24,
  className = "",
}) {
  const [busy, setBusy] = useState(false);
  const clickedRef = useRef(false);

  const toPdfViaCanvas = async (el) => {
    const canvas = await htmlToImage.toCanvas(el, {
      pixelRatio,
      backgroundColor: "#ffffff",
      cacheBust: true,
      skipFonts: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    if (!imgData || imgData.length < 50_000) {
      // Si es muy pequeño: probablemente canvas bloqueado
      throw new Error("CanvasBlockedOrEmpty");
    }

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const innerW = pageW - marginPt * 2;
    const scale = innerW / canvas.width;
    const imgW = innerW;
    const imgH = canvas.height * scale;

    let y = marginPt;
    let remaining = imgH;

    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", marginPt, y, imgW, imgH, undefined, "FAST");
      remaining -= pageH - marginPt * 2;
      if (remaining > 0) {
        pdf.addPage();
        y = marginPt - (imgH - (pageH - marginPt * 2));
      }
    }

    pdf.save(filename);
  };

  /** Copia <style> y <link rel="stylesheet"> del documento al head del iframe */
  const cloneHeadStyles = (srcDoc, dstDoc) => {
    const head = dstDoc.head || dstDoc.getElementsByTagName("head")[0];
    // Clona <style>
    srcDoc.querySelectorAll("style").forEach((node) => {
      try {
        const clone = node.cloneNode(true);
        head.appendChild(clone);
      } catch {}
    });
    // Clona <link rel="stylesheet">
    srcDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
      try {
        const clone = node.cloneNode(true);
        head.appendChild(clone);
      } catch {}
    });
  };

  /** Fallback: imprime el contenido en un iframe oculto (no hay popup) */
  const toPdfViaIframePrint = (el) => {
    // Crea iframe oculto
    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"
    );
    document.body.appendChild(iframe);

    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(
      `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="print-root"></div></body></html>`
    );
    idoc.close();

    // Inyecta estilos (Tailwind/Vite) y CSS de impresión básico
    cloneHeadStyles(document, idoc);
    const style = idoc.createElement("style");
    style.textContent = `
      @page { size: A4; margin: 10mm; }
      html, body { background: #fff; }
      #print-root { width: 100%; }
      svg { max-width: 100% !important; height: auto !important; }
      .no-print { display:none !important; }
    `;
    idoc.head.appendChild(style);

    // Clona el nodo objetivo ya renderizado (incluye SVG de Recharts)
    const clone = el.cloneNode(true);
    // Evita posiciones sticky/fixed
    clone.querySelectorAll("*").forEach((n) => {
      const s = n.style;
      if (!s) return;
      if (s.position === "sticky" || s.position === "fixed") {
        s.position = "static";
        s.top = "auto";
      }
    });

    idoc.getElementById("print-root").appendChild(clone);

    // Da un tick para layout/estilos y dispara print del iframe
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        // Limpia tras un poco
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1000);
      }
    }, 250);
  };

  const onClick = () => {
    const el = typeof getElement === "function" ? getElement() : null;
    if (!el || busy) return;
    setBusy(true);
    clickedRef.current = true;

    toPdfViaCanvas(el)
      .catch((err) => {
        // Aquí caen: Firefox privado (canvas bloqueado), CORS raros, etc.
        console.warn("Canvas export failed; using iframe print fallback:", err);
        toPdfViaIframePrint(el);
      })
      .finally(() => {
        clickedRef.current = false;
        setBusy(false);
      });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        "text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50 transition dark:bg-slate-900 dark:border-slate-700 " +
        (busy ? "opacity-50 cursor-wait " : "") +
        className
      }
      title="Exportar PDF"
    >
      {busy ? "Generando..." : "Exportar PDF"}
    </button>
  );
}
