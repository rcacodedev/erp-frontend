// --- FILE: src/utils/exportPdf.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Captura un elemento DOM y lo exporta a PDF (A4) con paginación automática.
 * - Captura todo el contenido (aunque haya scroll).
 * - Fuerza fondo blanco para que no herede el dark mode.
 * - Soporta SVG (Recharts).
 *
 * @param {HTMLElement} element - Nodo raíz a exportar.
 * @param {string} filename - Nombre del archivo PDF.
 */
export async function exportElementToPdf(element, filename = "kpis.pdf") {
  if (!element) return;

  // Aseguramos estar arriba para evitar cortes raros de scroll
  const prevScrollX = window.pageXOffset;
  const prevScrollY = window.pageYOffset;
  window.scrollTo(0, 0);

  try {
    // Canvas a buena resolución
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // más nítido
      useCORS: true, // por si hay imágenes con CORS permitido
      logging: false,
      // foreignObjectRendering: true, // normalmente no hace falta con Recharts (SVG)
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Tamaño A4 en puntos (jsPDF por defecto usa pt)
    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth; // ajustamos al ancho de página
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Si la imagen cabe en una página, directo
    if (imgHeight <= pageHeight) {
      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
    } else {
      // Paginación: dibujamos “trozos” verticales
      let remainingHeight = imgHeight;
      let positionY = 0;

      const canvasPage = document.createElement("canvas");
      const ctx = canvasPage.getContext("2d");

      // Altura que corresponde a una página A4 al escalar al ancho
      const pageCanvasHeight = Math.floor(
        (canvas.width * pageHeight) / pageWidth
      );
      canvasPage.width = canvas.width;
      canvasPage.height = pageCanvasHeight;

      let pageIndex = 0;
      while (remainingHeight > 0) {
        // Recortamos del canvas original el trozo que cabe en una página
        const sY = pageIndex * pageCanvasHeight;
        const sH = Math.min(pageCanvasHeight, canvas.height - sY);

        ctx.clearRect(0, 0, canvasPage.width, canvasPage.height);
        ctx.drawImage(
          canvas,
          0,
          sY,
          canvas.width,
          sH, // src
          0,
          0,
          canvasPage.width,
          sH // dest
        );

        const pageData = canvasPage.toDataURL("image/jpeg", 0.95);
        if (pageIndex === 0) {
          pdf.addImage(
            pageData,
            "JPEG",
            0,
            0,
            imgWidth,
            (sH * imgWidth) / canvas.width,
            undefined,
            "FAST"
          );
        } else {
          pdf.addPage();
          pdf.addImage(
            pageData,
            "JPEG",
            0,
            0,
            imgWidth,
            (sH * imgWidth) / canvas.width,
            undefined,
            "FAST"
          );
        }

        remainingHeight -= pageHeight;
        pageIndex += 1;
        positionY -= pageHeight; // informativo
      }
    }

    pdf.save(filename);
  } finally {
    // Restaurar scroll
    window.scrollTo(prevScrollX, prevScrollY);
  }
}
