import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { TablesInsert } from "@/integrations/supabase/types";
import { KeyFeaturesList } from "@/components/KeyFeatures";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const makeUUID = (): string => {
    const g = globalThis as {
      crypto?: {
        randomUUID?: () => string;
        getRandomValues?: (arr: Uint8Array) => Uint8Array;
      };
    };
    if (g.crypto?.randomUUID) return g.crypto.randomUUID();
    if (g.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      g.crypto.getRandomValues?.(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
      return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/"),
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/"),
      );
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${makeUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("medical-reports")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create report record
        const { data: reportData, error: dbError } = await supabase
          .from("reports")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            status: "processing",
          } as TablesInsert<"reports">)
          .select()
          .single();

        if (dbError) throw dbError;

        // Trigger AI processing (fire and forget)
        if (reportData) {
          supabase.functions
            .invoke("process-report", {
              body: { reportId: reportData.id },
            })
            .catch(console.error);
        }
      }

      toast({
        title: "Reports uploaded",
        description: `${files.length} file(s) uploaded and queued for analysis.`,
      });
      setFiles([]);
      navigate("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="px-4 sm:px-6 py-6 sm:py-8 min-h-screen md:h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-3.5rem)]"
      onTouchStart={(e) => {
        const isMobile =
          (window.matchMedia &&
            window.matchMedia("(max-width: 767px)").matches) ||
          window.innerWidth < 768;
        const isTouch =
          "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
        if (!(isMobile && isTouch)) return;
        const t = e.touches[0];
        touchStartX.current = t.clientX;
        touchStartY.current = t.clientY;
      }}
      onTouchEnd={(e) => {
        const isMobile =
          (window.matchMedia &&
            window.matchMedia("(max-width: 767px)").matches) ||
          window.innerWidth < 768;
        const isTouch =
          "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
        if (!(isMobile && isTouch)) return;
        if (touchStartX.current == null || touchStartY.current == null) return;
        const startX = touchStartX.current;
        const startY = touchStartY.current;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        touchStartX.current = null;
        touchStartY.current = null;
        const deltaX = endX - startX;
        const deltaY = Math.abs(endY - startY);
        if (deltaX < -80 && deltaY < 80) {
          setRightOpen(true);
        }
      }}
    >
      <div className="flex flex-col md:flex-row gap-6 md:items-stretch md:h-full">
        <div className="flex-1 min-w-0">
          <div className="mb-10 md:mb-8">
            <h1 className="text-2xl font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
              Upload Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload medical reports (PDF, JPG, PNG) for AI-powered analysis
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-md p-12 text-center transition-colors cursor-pointer
              ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDF, JPG, PNG up to 20MB
            </p>
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2"
              >
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center justify-between border border-border rounded-md bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full h-9 text-sm mt-4"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Upload ${files.length} file(s)`
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <aside className="hidden md:block md:w-60 md:shrink-0 md:border-l border-border md:pl-4 md:h-full space-y-4">
          <div className="border border-border rounded-md p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Key Features
            </h3>
            <KeyFeaturesList />
          </div>
          <div className="border border-border rounded-md p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Quick Links
            </h3>
            <ul className="text-sm space-y-1">
              <li>
                <Link to="/reports" className="text-link">
                  All Reports
                </Link>
              </li>
              <li>
                <Link to="/biography" className="text-link">
                  Health Biography
                </Link>
              </li>
              <li>
                <Link to="/trends" className="text-link">
                  Trends
                </Link>
              </li>
              <li>
                <Link to="/upload" className="text-link">
                  Upload New Report
                </Link>
              </li>
            </ul>
          </div>
        </aside>
        <Sheet open={rightOpen} onOpenChange={setRightOpen}>
          <SheetContent
            side="right"
            className="p-0 w-4/5 sm:max-w-xs"
            hideClose
          >
            <div
              className="p-3 space-y-3 h-full"
              onTouchStart={(e) => {
                if (window.innerWidth >= 768) return;
                const t = e.touches[0];
                touchStartX.current = t.clientX;
                touchStartY.current = t.clientY;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null || touchStartY.current == null)
                  return;
                const startX = touchStartX.current;
                const startY = touchStartY.current;
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                touchStartX.current = null;
                touchStartY.current = null;
                const deltaX = endX - startX;
                const deltaY = Math.abs(endY - startY);
                if (deltaX > 40 && deltaY < 30) {
                  setRightOpen(false);
                }
              }}
            >
              <div className="border border-border rounded-md p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Key Features
                </h3>
                <KeyFeaturesList />
              </div>
              <div className="border border-border rounded-md p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Quick Links
                </h3>
                <ul className="text-sm space-y-1">
                  <li>
                    <Link to="/reports" className="text-link">
                      All Reports
                    </Link>
                  </li>
                  <li>
                    <Link to="/biography" className="text-link">
                      Health Biography
                    </Link>
                  </li>
                  <li>
                    <Link to="/trends" className="text-link">
                      Trends
                    </Link>
                  </li>
                  <li>
                    <Link to="/upload" className="text-link">
                      Upload New Report
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
