import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ScrapedImage, ScrapeResult, PDFSettings } from "../../domain/material/material.types";
import { ScrapeMaterialUseCase } from "../../application/material/scrape-material.usecase";
import { GeneratePDFUseCase } from "../../application/material/generate-pdf.usecase";
import { HttpScraperService } from "../../infrastructure/material/http-scraper.service";
import { JsPDFGenerator } from "../../infrastructure/pdf/jspdf-generator.service";
import { geminiService } from "../../infrastructure/ai/gemini.service";

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
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeMode, setScrapeMode] = useState<"page" | "sequence" | null>(null);
  const [fileName, setFileName] = useState("");
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    format: "a4",
    orientation: "portrait",
    margin: 10,
    quality: "medium"
  });

  const handleScrape = useCallback(async (
    onScrapeSuccess?: (url: string, mode: "page" | "sequence", count: number, fileName: string, images: ScrapedImage[]) => void,
    overrideUrl?: string
  ) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl) return;

    setIsScraping(true);
    setImages([]);
    setScrapeMode(null);
    try {
      const result = await scrapeUseCase.execute(targetUrl);
      setScrapeMode(result.mode);
      setImages(result.images);
      const inferredName = inferFileName(targetUrl);
      setFileName(inferredName);
      
      if (onScrapeSuccess) {
        onScrapeSuccess(targetUrl, result.mode, result.images.length, inferredName, result.images);
      }
      
      toast.success(`Found ${result.images.length} images (${result.mode} mode)`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsScraping(false);
    }
  }, [url, scrapeUseCase]);

  const handleSuggestFileName = useCallback(async () => {
    if (images.length === 0) return;
    setIsSuggesting(true);
    try {
      const imageUrls = images.slice(0, 3).map(img => img.url);
      const suggestion = await geminiService.suggestFileName(imageUrls);
      setFileName(suggestion);
      toast.success("AI suggested a filename!");
    } catch (error: any) {
      toast.error("Failed to suggest filename");
    } finally {
      setIsSuggesting(false);
    }
  }, [images]);

  const handleDownloadPDF = useCallback(async () => {
    const selectedUrls = images.filter((img) => img.selected).map((img) => img.url);
    setIsGenerating(true);
    setProgress(0);
    try {
      const blob = await generatePDFUseCase.execute(selectedUrls, setProgress, pdfSettings);
      downloadBlob(blob, `${fileName || "iai-material"}.pdf`);
      toast.success("PDF generated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  }, [images, fileName, pdfSettings]);

  const handleSaveToDrive = useCallback(async () => {
    const selectedUrls = images.filter((img) => img.selected).map((img) => img.url);
    if (selectedUrls.length === 0) {
      toast.error("No images selected");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    try {
      const blob = await generatePDFUseCase.execute(selectedUrls, setProgress, pdfSettings);
      
      const uploadResponse = await fetch("/api/drive/upload", {
        method: "POST",
        credentials: "include",
        body: (() => {
          const formData = new FormData();
          formData.append("file", blob, `${fileName || "iai-material"}.pdf`);
          formData.append("name", `${fileName || "iai-material"}.pdf`);
          return formData;
        })()
      });

      if (uploadResponse.status === 401) {
        // Need to authenticate
        const authUrlResponse = await fetch("/api/auth/google/url", { credentials: "include" });
        if (!authUrlResponse.ok) {
          const text = await authUrlResponse.text();
          throw new Error(`Auth URL error: ${text.substring(0, 100)}`);
        }
        const { url: authUrl } = await authUrlResponse.json();
        
        const authWindow = window.open(authUrl, "google_auth", "width=600,height=700");
        if (!authWindow) {
          toast.error("Popup blocked. Please allow popups.");
          return;
        }

        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
            window.removeEventListener("message", handleMessage);
            toast.success("Authenticated! Saving to Drive...");
            handleSaveToDrive(); // Retry
          }
        };
        window.addEventListener("message", handleMessage);
      } else if (!uploadResponse.ok) {
        let errorMessage = "Failed to upload to Drive";
        const responseClone = uploadResponse.clone();
        try {
          const errorData = await uploadResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const text = await responseClone.text();
          errorMessage = `Server error (${uploadResponse.status}): ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      } else {
        const data = await uploadResponse.json();
        toast.success(`Saved to Google Drive! File ID: ${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  }, [images, fileName, pdfSettings]);

  const toggleSelectAll = useCallback(() => {
    const allSelected = images.every((img) => img.selected);
    setImages(prev => prev.map((img) => ({ ...img, selected: !allSelected })));
  }, [images]);

  const toggleImage = useCallback((index: number) => {
    setImages(prev => prev.map((img, i) => (i === index ? { ...img, selected: !img.selected } : img)));
  }, []);

  const loadImages = useCallback((urls: string[], mode: "page" | "sequence", name: string) => {
    setScrapeMode(mode);
    setFileName(name);
    setImages(urls.map(url => ({ url, selected: true, status: "idle" })));
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
    isSuggesting,
    progress,
    scrapeMode,
    fileName, setFileName,
    pdfSettings, setPdfSettings,
    handleScrape,
    handleSuggestFileName,
    handleDownloadPDF,
    handleSaveToDrive,
    toggleSelectAll,
    toggleImage,
    loadImages,
    setImages
  };
}
