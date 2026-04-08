import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ScrapedImage, ScrapeResult } from "../../domain/material/material.types";
import { ScrapeMaterialUseCase } from "../../application/material/scrape-material.usecase";
import { GeneratePDFUseCase } from "../../application/material/generate-pdf.usecase";
import { HttpScraperService } from "../../infrastructure/material/http-scraper.service";
import { JsPDFGenerator } from "../../infrastructure/pdf/jspdf-generator.service";

// Dependencies Injection
const scraperService = new HttpScraperService();
const pdfGenerator = new JsPDFGenerator();
const scrapeUseCase = new ScrapeMaterialUseCase(scraperService);
const generatePDFUseCase = new GeneratePDFUseCase(pdfGenerator);

export function useMaterialManager() {
  const [url, setUrl] = useState("https://web.iaiglobal.or.id/assets/materi/Sertifikasi/CA/modul/aml/");
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeMode, setScrapeMode] = useState<"page" | "sequence" | null>(null);
  const [fileName, setFileName] = useState("");

  const handleScrape = useCallback(async (onScrapeSuccess?: (url: string, mode: "page" | "sequence", count: number, fileName: string) => void) => {
    setIsScraping(true);
    setImages([]);
    setScrapeMode(null);
    try {
      const result = await scrapeUseCase.execute(url);
      setScrapeMode(result.mode);
      setImages(result.images);
      const inferredName = inferFileName(url);
      setFileName(inferredName);
      
      if (onScrapeSuccess) {
        onScrapeSuccess(url, result.mode, result.images.length, inferredName);
      }
      
      toast.success(`Found ${result.images.length} images (${result.mode} mode)`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsScraping(false);
    }
  }, [url]);

  const handleDownloadPDF = useCallback(async () => {
    const selectedUrls = images.filter((img) => img.selected).map((img) => img.url);
    setIsGenerating(true);
    setProgress(0);
    try {
      const blob = await generatePDFUseCase.execute(selectedUrls, setProgress);
      downloadBlob(blob, `${fileName || "iai-material"}.pdf`);
      toast.success("PDF generated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  }, [images, fileName]);

  const toggleSelectAll = useCallback(() => {
    const allSelected = images.every((img) => img.selected);
    setImages(prev => prev.map((img) => ({ ...img, selected: !allSelected })));
  }, [images]);

  const toggleImage = useCallback((index: number) => {
    setImages(prev => prev.map((img, i) => (i === index ? { ...img, selected: !img.selected } : img)));
  }, []);

  const inferFileName = (sourceUrl: string): string => {
    try {
      const urlObj = new URL(sourceUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        let name = parts[parts.length - 1];
        if (["mobile", "files", "modul"].includes(name)) name = parts[parts.length - 2] || name;
        return name.replace(/\.[^/.]+$/, "");
      }
    } catch {
      return "iai-material";
    }
    return "iai-material";
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const pdfUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    url, setUrl,
    images,
    isScraping,
    isGenerating,
    progress,
    scrapeMode,
    fileName, setFileName,
    handleScrape,
    handleDownloadPDF,
    toggleSelectAll,
    toggleImage
  };
}
