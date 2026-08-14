import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Render an A4 preview element to a downloadable PDF (local only). */
export async function downloadPreviewAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // Webフォント未読込だとタイトルの行高・位置がズレやすい
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: false,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (_doc, cloned) => {
      const title = cloned.querySelector(".series-title");
      if (title instanceof HTMLElement) {
        title.style.transform = "translateY(-2px)";
        title.style.marginBottom = "2px";
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}
