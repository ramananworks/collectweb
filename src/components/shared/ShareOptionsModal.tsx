import { MessageCircle, Mail, Smartphone, FileText, X } from "lucide-react";
import {
  ShareSummaryData,
  generateShareText,
  shareViaWhatsApp,
  shareViaEmail,
  shareViaSMS,
  generateSummaryPDF,
  downloadPDF,
} from "@/lib/share-utils";
import { toast } from "@/hooks/use-toast";

interface ShareOptionsModalProps {
  open: boolean;
  onClose: () => void;
  data: ShareSummaryData;
}

const options = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, bg: "bg-green-100", color: "text-green-600" },
  { key: "email", label: "Email", icon: Mail, bg: "bg-blue-100", color: "text-blue-600" },
  { key: "sms", label: "SMS", icon: Smartphone, bg: "bg-gray-100", color: "text-gray-600" },
  { key: "pdf", label: "Download PDF", icon: FileText, bg: "bg-red-100", color: "text-red-600" },
] as const;

export default function ShareOptionsModal({ open, onClose, data }: ShareOptionsModalProps) {
  if (!open) return null;

  const handleAction = async (key: string) => {
    const text = generateShareText(data);

    if (key === "pdf") {
      const blob = generateSummaryPDF(data);
      const date = new Date().toISOString().split("T")[0];
      downloadPDF(blob, `collection-summary-${date}.pdf`);
      toast({ title: "PDF Downloaded", description: "Summary saved successfully" });
      onClose();
      return;
    }

    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text,
          url: "https://money-mate-co.lovable.app",
        });
        onClose();
        return;
      } catch (e) {
        // User cancelled or API failed — fall through to direct links
        if ((e as DOMException)?.name === "AbortError") { onClose(); return; }
      }
    }

    // Fallback to direct links
    switch (key) {
      case "whatsapp":
        shareViaWhatsApp(text);
        break;
      case "email":
        shareViaEmail(data.title, text);
        break;
      case "sms":
        shareViaSMS(text);
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:w-auto sm:min-w-[340px] sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">Share Summary</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleAction(opt.key)}
              className="flex flex-col items-center p-4 rounded-xl hover:shadow-md active:scale-95 transition-all duration-200 border border-border"
            >
              <div className={`w-12 h-12 rounded-full ${opt.bg} flex items-center justify-center`}>
                <opt.icon className={`h-5 w-5 ${opt.color}`} />
              </div>
              <span className="text-sm font-medium mt-2 text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
