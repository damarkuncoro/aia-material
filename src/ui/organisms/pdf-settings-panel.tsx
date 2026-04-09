import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { FileText, Settings2 } from "lucide-react";
import { PDFSettings } from "@/domain/material/material.types";

interface PDFSettingsPanelProps {
  settings: PDFSettings;
  onSettingsChange: (settings: PDFSettings) => void;
}

export function PDFSettingsPanel({ settings, onSettingsChange }: PDFSettingsPanelProps) {
  return (
    <Card className="border-none shadow-sm bg-white dark:bg-[#1a1a1a] rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#f5f5f5] dark:bg-white/5 rounded-xl text-[#1a1a1a] dark:text-white">
            <Settings2 size={18} />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">PDF Settings</CardTitle>
            <CardDescription>Configure output document layout</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Page Format</Label>
          <Select 
            value={settings.format} 
            onValueChange={(v: any) => onSettingsChange({ ...settings, format: v })}
          >
            <SelectTrigger className="rounded-xl border-[#eee] dark:border-white/10 bg-[#fcfcfc] dark:bg-white/5 h-10">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:bg-[#1a1a1a] dark:border-white/10">
              <SelectItem value="a4">A4 (Standard)</SelectItem>
              <SelectItem value="letter">Letter (US)</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Orientation</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSettingsChange({ ...settings, orientation: "portrait" })}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-xs font-medium transition-all ${
                settings.orientation === "portrait" 
                  ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] border-[#1a1a1a] dark:border-white" 
                  : "bg-[#fcfcfc] dark:bg-white/5 text-[#666] dark:text-[#999] border-[#eee] dark:border-white/10 hover:border-[#ccc] dark:hover:border-white/30"
              }`}
            >
              <FileText size={14} className={settings.orientation === "portrait" ? "rotate-0" : "rotate-0 opacity-50"} />
              Portrait
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, orientation: "landscape" })}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-xs font-medium transition-all ${
                settings.orientation === "landscape" 
                  ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] border-[#1a1a1a] dark:border-white" 
                  : "bg-[#fcfcfc] dark:bg-white/5 text-[#666] dark:text-[#999] border-[#eee] dark:border-white/10 hover:border-[#ccc] dark:hover:border-white/30"
              }`}
            >
              <FileText size={14} className={settings.orientation === "landscape" ? "rotate-90" : "rotate-90 opacity-50"} />
              Landscape
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Margins (mm)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSettingsChange({ ...settings, margin: 0 })}
                className={`h-6 px-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  settings.margin === 0 
                    ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]" 
                    : "text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                }`}
              >
                No Margin
              </Button>
              <span className="text-[10px] font-mono text-[#1a1a1a] dark:text-white bg-[#f5f5f5] dark:bg-white/10 px-2 py-0.5 rounded">{settings.margin}mm</span>
            </div>
          </div>
          <Slider
            value={[settings.margin]}
            min={0}
            max={50}
            step={1}
            onValueChange={(v) => {
              if (Array.isArray(v)) {
                onSettingsChange({ ...settings, margin: v[0] });
              }
            }}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Quality (File Size)</Label>
          <Select 
            value={settings.quality} 
            onValueChange={(v: any) => onSettingsChange({ ...settings, quality: v })}
          >
            <SelectTrigger className="rounded-xl border-[#eee] dark:border-white/10 bg-[#fcfcfc] dark:bg-white/5 h-10">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:bg-[#1a1a1a] dark:border-white/10">
              <SelectItem value="high">High (Original Size)</SelectItem>
              <SelectItem value="medium">Medium (Recommended)</SelectItem>
              <SelectItem value="low">Low (Smallest File)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-[#999] leading-relaxed">
            Lower quality reduces file size to avoid "Request Entity Too Large" errors when saving to Drive.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
