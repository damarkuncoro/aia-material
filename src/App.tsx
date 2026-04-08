import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronRight,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { generatePDF, ScrapedImage } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export default function App() {
  const [url, setUrl] = useState("https://web.iaiglobal.or.id/assets/materi/Sertifikasi/CA/modul/aml/");
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeMode, setScrapeMode] = useState<"page" | "sequence" | null>(null);
  const [fileName, setFileName] = useState("");

  const handleScrape = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsScraping(true);
    setImages([]);
    setScrapeMode(null);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: "auto" }),
      });

      if (!response.ok) throw new Error("Failed to scrape URL");

      const data = await response.json();
      setScrapeMode(data.mode);
      
      const newImages: ScrapedImage[] = data.images.map((imgUrl: string) => ({
        url: imgUrl,
        selected: true,
        status: "idle",
      }));

      setImages(newImages);
      
      // Infer filename from URL
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          let name = pathParts[pathParts.length - 1];
          if (name === "mobile" || name === "files" || name === "modul") {
            name = pathParts[pathParts.length - 2] || name;
          }
          setFileName(name.replace(/\.[^/.]+$/, ""));
        }
      } catch (e) {
        setFileName("iai-material");
      }

      toast.success(`Found ${newImages.length} images (${data.mode} mode)`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsScraping(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = images.every((img) => img.selected);
    setImages(images.map((img) => ({ ...img, selected: !allSelected })));
  };

  const toggleImage = (index: number) => {
    setImages(
      images.map((img, i) => (i === index ? { ...img, selected: !img.selected } : img))
    );
  };

  const handleDownloadPDF = async () => {
    const selectedImages = images.filter((img) => img.selected).map((img) => img.url);
    if (selectedImages.length === 0) {
      toast.error("No images selected");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    try {
      const pdfBlob = await generatePDF(selectedImages, (p) => setProgress(p));
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${fileName || "iai-material"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate PDF: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-[#1a1a1a] selection:text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-white">
              <FileDown size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">IAI Scraper</h1>
              <p className="text-sm text-[#666] font-medium uppercase tracking-widest">Material to PDF Converter</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Source URL</CardTitle>
                <CardDescription>Enter the IAI material page URL to scrape images.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input 
                    placeholder="https://web.iaiglobal.or.id/..." 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 h-12 bg-[#f9f9f9] border-none focus-visible:ring-1 focus-visible:ring-[#1a1a1a] rounded-xl"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                </div>
                <Button 
                  onClick={handleScrape} 
                  disabled={isScraping}
                  className="w-full h-12 bg-[#1a1a1a] hover:bg-[#333] text-white rounded-xl transition-all active:scale-[0.98]"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    "Scrape Images"
                  )}
                </Button>
              </CardContent>
            </Card>

            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Actions</CardTitle>
                    <CardDescription>
                      {images.filter(img => img.selected).length} of {images.length} images selected
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5 mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#999] ml-1">File Name</label>
                      <Input 
                        placeholder="iai-material" 
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="h-10 bg-[#f9f9f9] border-none focus-visible:ring-1 focus-visible:ring-[#1a1a1a] rounded-xl"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={toggleSelectAll}
                      className="w-full justify-start h-11 border-[#eee] hover:bg-[#f9f9f9] rounded-xl"
                    >
                      {images.every(img => img.selected) ? (
                        <><Square className="mr-2 h-4 w-4" /> Deselect All</>
                      ) : (
                        <><CheckSquare className="mr-2 h-4 w-4" /> Select All</>
                      )}
                    </Button>
                    <Button 
                      onClick={handleDownloadPDF} 
                      disabled={isGenerating || images.filter(img => img.selected).length === 0}
                      className="w-full h-12 bg-[#1a1a1a] hover:bg-[#333] text-white rounded-xl transition-all active:scale-[0.98]"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </CardContent>
                  {isGenerating && (
                    <CardFooter className="flex-col items-start gap-2 pt-0">
                      <Progress value={progress} className="h-1.5 w-full bg-[#eee]" />
                      <p className="text-[10px] text-[#999] font-mono uppercase tracking-tighter">
                        Processing: {Math.round(progress)}%
                      </p>
                    </CardFooter>
                  )}
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-sm bg-white rounded-2xl h-[calc(100vh-200px)] flex flex-col overflow-hidden">
              <CardHeader className="border-b border-[#f5f5f5] flex flex-row items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Found Images</CardTitle>
                    {scrapeMode && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                        scrapeMode === "sequence" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>
                        {scrapeMode}
                      </span>
                    )}
                  </div>
                  <CardDescription>Preview and select images to include in PDF.</CardDescription>
                </div>
                {images.length > 0 && (
                  <div className="text-[10px] font-mono bg-[#f5f5f5] px-2 py-1 rounded text-[#666]">
                    {images.length} TOTAL
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  {images.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-4">
                      <div className="w-16 h-16 bg-[#f9f9f9] rounded-full flex items-center justify-center text-[#ccc]">
                        <ImageIcon size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-[#999]">No images found yet</p>
                        <p className="text-sm text-[#ccc]">Enter a URL and click scrape to begin</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      <AnimatePresence>
                        {images.map((img, index) => (
                          <motion.div
                            key={img.url}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className={cn(
                              "group relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                              img.selected ? "border-[#1a1a1a]" : "border-transparent bg-[#f9f9f9]"
                            )}
                            onClick={() => toggleImage(index)}
                          >
                            <img 
                              src={`/api/proxy-image?url=${encodeURIComponent(img.url)}`} 
                              alt={`Scraped ${index}`}
                              className={cn(
                                "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                                !img.selected && "opacity-40 grayscale"
                              )}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2">
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                                img.selected ? "bg-[#1a1a1a] text-white" : "bg-white/80 text-[#ccc]"
                              )}>
                                {img.selected && <CheckCircle2 size={14} />}
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <a 
                                href={img.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-white flex items-center gap-1 hover:underline"
                              >
                                View Original <ExternalLink size={10} />
                              </a>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
