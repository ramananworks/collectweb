import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, RotateCcw, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BillCameraCaptureProps {
  invoiceId: string;
  invoiceNumber: string;
  existingImageUrl?: string | null;
  onImageSaved: (url: string) => void;
}

type CaptureMode = "idle" | "camera" | "preview";

export default function BillCameraCapture({
  invoiceId,
  invoiceNumber,
  existingImageUrl,
  onImageSaved,
}: BillCameraCaptureProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch {
      toast({ title: "Camera unavailable", description: "Could not access camera. Try uploading a file instead.", variant: "destructive" });
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
    };
    reader.readAsDataURL(file);
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }, [startCamera]);

  const save = useCallback(async () => {
    if (!capturedBlob) return;
    setUploading(true);
    try {
      const ext = capturedBlob.type === "image/jpeg" ? "jpg" : "png";
      const path = `invoices/${invoiceId}/bill_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("bill-images")
        .upload(path, capturedBlob, { upsert: true, contentType: capturedBlob.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("bill-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("invoices")
        .update({ bill_image_url: publicUrl })
        .eq("id", invoiceId);

      if (dbError) throw dbError;

      onImageSaved(publicUrl);
      toast({ title: "Bill image saved", description: `Attached to invoice ${invoiceNumber}` });
      setOpen(false);
      setMode("idle");
      setCapturedImage(null);
      setCapturedBlob(null);
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [capturedBlob, invoiceId, invoiceNumber, onImageSaved]);

  const handleOpenChange = useCallback((val: boolean) => {
    if (!val) {
      stopStream();
      setMode("idle");
      setCapturedImage(null);
      setCapturedBlob(null);
    }
    setOpen(val);
  }, [stopStream]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-xs", existingImageUrl && "border-success text-success hover:text-success")}
        >
          {existingImageUrl ? (
            <><ImageIcon className="h-3.5 w-3.5" /> View Bill</>
          ) : (
            <><Camera className="h-3.5 w-3.5" /> Attach Bill</>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Capture Bill — {invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Existing image preview */}
          {existingImageUrl && mode === "idle" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Current bill image</p>
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={existingImageUrl} alt="Existing bill" className="w-full object-contain max-h-64" />
              </div>
              <p className="text-xs text-muted-foreground text-center">You can replace this image by capturing or uploading a new one.</p>
            </div>
          )}

          {/* Idle state – choose action */}
          {mode === "idle" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startCamera()}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Open Camera</span>
                <span className="text-xs text-muted-foreground text-center">Point at the printed bill</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Upload File</span>
                <span className="text-xs text-muted-foreground text-center">Choose from gallery or files</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {/* Camera viewfinder */}
          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Alignment overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/40 rounded-lg" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
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

          {/* Preview captured image */}
          {mode === "preview" && capturedImage && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Review before saving</p>
              <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
                <img src={capturedImage} alt="Captured bill" className="w-full object-contain max-h-72" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={retake} className="flex-1 gap-2">
                  <X className="h-4 w-4" /> Retake
                </Button>
                <Button
                  onClick={save}
                  disabled={uploading}
                  className="flex-1 gradient-primary text-primary-foreground gap-2"
                >
                  {uploading ? (
                    <><span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><Check className="h-4 w-4" /> Save to Invoice</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
