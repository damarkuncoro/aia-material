import { Toaster } from "@/components/ui/sonner";
import { useMaterialManager } from "../hooks/use-material-manager";
import { useAuth, useHistory } from "../hooks/use-firebase";
import { MainLayout } from "../templates/main-layout";
import { ControlPanel } from "../organisms/control-panel";
import { ImageGrid } from "../organisms/image-grid";
import { HistoryPanel } from "../organisms/history-panel";
import { AuthSection } from "../molecules/auth-section";

export function HomePage() {
  const { user, loading, login, logout } = useAuth();
  const { history, addToHistory, deleteFromHistory } = useHistory(user?.uid);
  
  const {
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
  } = useMaterialManager();

  const onScrapeSuccess = (scrapedUrl: string, mode: "page" | "sequence", count: number, name: string) => {
    if (user) {
      addToHistory({ url: scrapedUrl, mode, imageCount: count, fileName: name });
    }
  };

  return (
    <>
      <MainLayout 
        auth={<AuthSection user={user} loading={loading} onLogin={login} onLogout={logout} />}
        controls={
          <div className="space-y-6">
            <ControlPanel 
              url={url} setUrl={setUrl} 
              onScrape={() => handleScrape(onScrapeSuccess)} 
              isScraping={isScraping}
              images={images} fileName={fileName} setFileName={setFileName}
              onToggleAll={toggleSelectAll} onDownload={handleDownloadPDF}
              isGenerating={isGenerating} progress={progress}
            />
            {user && <HistoryPanel history={history} onSelect={setUrl} onDelete={deleteFromHistory} />}
          </div>
        }
        content={
          <ImageGrid images={images} scrapeMode={scrapeMode} onToggleImage={toggleImage} />
        }
      />
      <Toaster position="bottom-right" />
    </>
  );
}
