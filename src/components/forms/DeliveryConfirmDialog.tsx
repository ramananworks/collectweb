import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Send, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { hapticMedium, hapticSuccess, hapticHeavy } from "@/lib/haptics";
import { useCustomers } from "@/hooks/use-data";

interface DeliveryConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  customerName: string;
  customerId?: string;
}

// Must match RESEND_COOLDOWN_MS in supabase/functions/delivery-otp/index.ts
const RESEND_COOLDOWN_MS = 30 * 1000;

// supabase.functions.invoke() discards the response body whenever the edge
// function returns a non-2xx status — it only sets a generic FunctionsHttpError.
// The real message lives on error.context (the raw Response object).
async function extractFunctionErrorMessage(error: any, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return body?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return error?.message || fallback;
}

export function DeliveryConfirmDialog({
  open,
  onOpenChange,
  invoiceId,
  customerName,
  customerId,
}: DeliveryConfirmDialogProps) {
  const [step, setStep] = useState<"send" | "verify" | "done">("send");
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [captureGps, setCaptureGps] = useState(true);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const qc = useQueryClient();

  const { data: customers = [] } = useCustomers();
  const customer = customerId ? customers.find((c) => c.id === customerId) : null;
  const hasPhone = customer ? customer.phone?.trim().length > 0 : true; // default true if no customerId passed

  const resetState = useCallback(() => {
    setStep("send");
    setOtpValue("");
    setLoading(false);
    setMaskedPhone("");
    setTestOtp(null);
    setCooldownUntil(null);
    setSecondsLeft(0);
  }, []);

  // Live countdown for the resend cooldown
  useEffect(() => {
    if (!cooldownUntil) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setSecondsLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) {
        setCooldownUntil(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delivery-otp", {
        body: { action: "generate_otp", invoiceId },
      });
      if (error) {
        const message = await extractFunctionErrorMessage(error, "Failed to send OTP");
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      setMaskedPhone(data.customerPhone || "");
      setOtpValue("");
      if (data.otp) {
        setTestOtp(data.otp);
      }
      setStep("verify");
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      hapticMedium();
      toast.success(data.message || "OTP sent successfully");
    } catch (err: any) {
      hapticHeavy();
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setLoading(true);

    let location: { lat: number; lng: number } | null = null;

    // Capture GPS if enabled
    if (captureGps && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // GPS not available, continue without it
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("delivery-otp", {
        body: { action: "verify_otp", invoiceId, otpCode: otpValue, location },
      });
      if (error) {
        const message = await extractFunctionErrorMessage(error, "OTP verification failed");
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      setStep("done");
      hapticSuccess();
      toast.success("Delivery confirmed! ✅");
      qc.invalidateQueries({ queryKey: ["invoices"] });

      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    } catch (err: any) {
      hapticHeavy();
      const message = err.message || "OTP verification failed";
      toast.error(message);

      // Locked out (no active OTP / too many attempts) — bounce back to
      // the "send" step instead of leaving a dead OTP input on screen.
      const isLockedOut =
        message.includes("Too many incorrect attempts") ||
        message.includes("No active OTP found");
      if (isLockedOut) {
        setStep("send");
        setOtpValue("");
        setTestOtp(null);
        setCooldownUntil(null);
      } else {
        // Wrong digits but attempts remain — clear the input so the user
        // can retype cleanly, stay on the verify step.
        setOtpValue("");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendDisabled = loading || secondsLeft > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Delivery Confirmation
          </DialogTitle>
          <DialogDescription>
            Verify delivery to <span className="font-semibold">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        {step === "send" && (
          <div className="space-y-4 pt-2">
            {!hasPhone ? (
              <>
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">
                    <span className="font-semibold">{customerName}</span> has no phone number registered. Please update the customer profile with a valid phone number before confirming delivery.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  An OTP will be sent to the customer's registered mobile number. Ask the shopkeeper for the OTP to confirm delivery.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="captureGps"
                    checked={captureGps}
                    onChange={(e) => setCaptureGps(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="captureGps" className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Capture delivery location
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="gradient-primary text-primary-foreground gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send OTP
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              OTP sent to <span className="font-medium">{maskedPhone}</span>. Enter the 6-digit code below.
            </p>
            {testOtp && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
                ⚠️ SMS not configured. Test OTP: <span className="font-mono font-bold">{testOtp}</span>
              </div>
            )}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={handleSendOtp} disabled={resendDisabled}>
                {secondsLeft > 0 ? `Resend OTP (${secondsLeft}s)` : "Resend OTP"}
              </Button>
              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otpValue.length !== 6}
                className="gradient-primary text-primary-foreground gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify & Confirm
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <p className="text-lg font-semibold text-success">Delivery Confirmed!</p>
            <p className="text-sm text-muted-foreground text-center">
              Invoice delivery to {customerName} has been verified.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}