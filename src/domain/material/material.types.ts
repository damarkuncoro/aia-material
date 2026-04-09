export interface ScrapedImage {
  url: string;
  selected: boolean;
  status: "idle" | "loading" | "success" | "error";
}

export interface ScrapeResult {
  images: ScrapedImage[];
  mode: "page" | "sequence";
}

export interface IScraperService {
  scrape(url: string): Promise<ScrapeResult>;
}

export interface PDFSettings {
  format: "a4" | "letter" | "legal";
  orientation: "portrait" | "landscape";
  margin: number;
  quality: "high" | "medium" | "low";
}

export interface IPDFGenerator {
  generate(images: string[], onProgress: (p: number) => void, settings?: PDFSettings): Promise<Blob>;
}
