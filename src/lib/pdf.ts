import { jsPDF } from "jspdf";

export interface ScrapedImage {
  url: string;
  selected: boolean;
  status: "idle" | "loading" | "success" | "error";
}

export async function generatePDF(
  images: string[],
  onProgress: (progress: number) => void
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];
    
    try {
      // Fetch image through proxy to avoid CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      if (i > 0) {
        pdf.addPage();
      }

      // Add image to PDF, fitting to page
      const imgProps = await getImageDimensions(base64);
      const ratio = imgProps.width / imgProps.height;
      
      let width = pageWidth;
      let height = pageWidth / ratio;
      
      if (height > pageHeight) {
        height = pageHeight;
        width = pageHeight * ratio;
      }

      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;

      pdf.addImage(base64, "JPEG", x, y, width, height);
    } catch (error) {
      console.error(`Error adding image ${i} to PDF:`, error);
    }

    onProgress(((i + 1) / images.length) * 100);
  }

  return pdf.output("blob");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = base64;
  });
}
