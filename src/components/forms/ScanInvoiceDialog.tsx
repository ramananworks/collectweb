import { useRef, useState, useCallback } from "react";
import { Camera, Upload, Scan, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface ExtractedInvoiceData {
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  amount?: number | null;
  customer_name?: string | null;
  description?: string | null;
}

interface ScanInvoiceDialogProps {
  onDataExtracted: (data: ExtractedInvoiceData) => void;
}

type Mode = "idle" | "camera" | "preview" | "extracting" | "done";

export default function ScanInvoiceDialog({ onDataExtracted }: ScanInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMode("camera");
    } catch {
      toast({ title: "Camera unavailable", description: "Try uploading a photo instead.", variant: "destructive" });
    }
  }, [facingMode, stopStream]);

  const flipCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }, [facingMode, startCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
      setMode("preview");
      stopStream();
    }, "image/jpeg", 0.92);
  }, [stopStream]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setCapturedBlob(file);
      setMode("preview");
      stopStream();
    };
    reader.readAsDataURL(file);
  }, [stopStream]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setMode("idle");
  }, []);

  const extractData = useCallback(async () => {
    if (!capturedBlob) return;
    setMode("extracting");

    try {
      // Convert blob to base64
      const arrayBuffer = await capturedBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      uint8Array.forEach((byte) => { binary += String.fromCharCode(byte); });
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("extract-invoice", {
        body: {
          imageBase64: base64,
          mimeType: capturedBlob.type || "image/jpeg",
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      setMode("done");

      setTimeout(() => {
        onDataExtracted(data.data as ExtractedInvoiceData);
        setOpen(false);
        // Reset state
        setCapturedImage(null);
        setCapturedBlob(null);
        setMode("idle");
      }, 800);

    } catch (err: unknown) {
      toast({ title: "Extraction failed", description: (err as Error).message, variant: "destructive" });
      setMode("preview");
    }
  }, [capturedBlob, onDataExtracted]);

  const handleOpenChange = useCallback((val: boolean) => {
    if (!val) {
      stopStream();
      setCapturedImage(null);
      setCapturedBlob(null);
      setMode("idle");
    }
    setOpen(val);
  }, [stopStream]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scan className="h-4 w-4" /> Scan Bill
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-4 w-4 text-primary" />
            Scan Bill to Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", mode === "idle" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</span>
            <span>Capture</span>
            <div className="flex-1 h-px bg-border" />
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", mode === "preview" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</span>
            <span>Review</span>
            <div className="flex-1 h-px bg-border" />
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", mode === "extracting" || mode === "done" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>3</span>
            <span>Extract</span>
          </div>

          {/* Idle: choose source */}
          {mode === "idle" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Take a photo of a printed or handwritten bill. AI will extract the invoice details automatically.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startCamera()}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Open Camera</span>
                  <span className="text-xs text-muted-foreground text-center">Point at the bill</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Upload Photo</span>
                  <span className="text-xs text-muted-foreground text-center">From gallery or files</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {/* Camera viewfinder */}
          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/50 rounded-lg" />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Frame the entire bill
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={flipCamera} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Flip
                </Button>
                <Button onClick={capture} className="gradient-primary text-primary-foreground flex-1 gap-2">
                  <Camera className="h-4 w-4" /> Capture
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> File
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          )}

          {/* Preview */}
          {(mode === "preview" || mode === "extracting" || mode === "done") && capturedImage && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                <img src={capturedImage} alt="Bill to scan" className="w-full object-contain max-h-64" />
                {mode === "extracting" && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm font-medium">AI is reading the bill…</p>
                    <p className="text-xs text-muted-foreground">Extracting invoice details</p>
                  </div>
                )}
                {mode === "done" && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <p className="text-sm font-medium text-success">Details extracted!</p>
                    <p className="text-xs text-muted-foreground">Opening invoice form…</p>
                  </div>
                )}
              </div>

              {mode === "preview" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={retake} className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={extractData} className="flex-1 gradient-primary text-primary-foreground gap-2">
                    <Scan className="h-4 w-4" /> Extract & Fill Form
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
