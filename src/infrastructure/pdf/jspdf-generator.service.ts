import { jsPDF } from "jspdf";
import { IPDFGenerator, PDFSettings } from "../../domain/material/material.types";

export class JsPDFGenerator implements IPDFGenerator {
  async generate(images: string[], onProgress: (p: number) => void, settings?: PDFSettings): Promise<Blob> {
    const { format = "a4", orientation = "portrait", margin = 0, quality = "medium" } = settings || {};
    const pdf = new jsPDF({ 
      orientation, 
      unit: "mm", 
      format,
      compress: true
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const drawAreaWidth = pageWidth - (margin * 2);
    const drawAreaHeight = pageHeight - (margin * 2);

    for (let i = 0; i < images.length; i++) {
      await this.addPageToPDF(pdf, images[i], i, drawAreaWidth, drawAreaHeight, margin, quality);
      onProgress(((i + 1) / images.length) * 100);
    }

    return pdf.output("blob");
  }

  private async addPageToPDF(pdf: jsPDF, imageUrl: string, index: number, drawAreaWidth: number, drawAreaHeight: number, margin: number, quality: "high" | "medium" | "low") {
    try {
      let base64 = await this.fetchImageAsBase64(imageUrl);
      if (index > 0) pdf.addPage();
      
      const { width, height } = await this.getImageDimensions(base64);
      
      // Resize image if quality is not high or if it's too large
      if (quality !== "high" || width > 2000 || height > 2000) {
        const maxDim = quality === "low" ? 800 : 1200;
        base64 = await this.resizeImage(base64, maxDim);
      }

      const { drawWidth, drawHeight } = this.calculateDrawDimensions(width, height, drawAreaWidth, drawAreaHeight);
      
      const x = margin + (drawAreaWidth - drawWidth) / 2;
      const y = margin + (drawAreaHeight - drawHeight) / 2;
      
      pdf.addImage(base64, "JPEG", x, y, drawWidth, drawHeight, undefined, 'FAST');
    } catch (error) {
      console.error(`Error adding image ${index}:`, error);
    }
  }

  private async resizeImage(base64: string, maxDimension: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // 0.7 quality for JPEG
      };
      img.src = base64;
    });
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    const blob = await response.blob();
    return this.blobToBase64(blob);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = base64;
    });
  }

  private calculateDrawDimensions(imgW: number, imgH: number, pageW: number, pageH: number) {
    const ratio = imgW / imgH;
    let drawWidth = pageW;
    let drawHeight = pageW / ratio;
    
    if (drawHeight > pageH) {
      drawHeight = pageH;
      drawWidth = pageH * ratio;
    }
    return { drawWidth, drawHeight };
  }
}
