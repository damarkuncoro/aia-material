import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryItem } from "../../infrastructure/history/history.repository";
import { StatusBadge } from "../atoms/status-badge";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (url: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryPanel({ history, onSelect, onDelete }: HistoryPanelProps) {
  if (history.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#1a1a1a]" />
          <CardTitle className="text-lg font-semibold">Recent Scrapes</CardTitle>
        </div>
        <CardDescription>Quickly re-access your previous materials.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y divide-[#f5f5f5]">
            {history.map((item) => (
              <div key={item.id} className="p-4 hover:bg-[#f9f9f9] transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelect(item.url)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge mode={item.mode} />
                      <span className="text-[10px] text-[#999] font-mono flex items-center gap-1">
                        <Clock size={10} />
                        {item.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate text-[#1a1a1a]">{item.fileName || "Untitled"}</p>
                    <p className="text-[10px] text-[#999] truncate">{item.url}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#999] hover:text-red-500"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
