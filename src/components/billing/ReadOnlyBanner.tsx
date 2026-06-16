import { Lock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export default function ReadOnlyBanner() {
  const { isReadOnly, isOwner, plan, seats, loading } = useSubscription();
  const location = useLocation();
  if (loading || !isReadOnly) return null;
  if (location.pathname === "/settings/billing") return null;

  const reason =
    plan === "free"
      ? `Free plan supports 1 user; your team has ${seats}.`
      : "Your Pro subscription is inactive or has expired.";

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 text-destructive px-4 py-2 text-sm flex items-center gap-2">
      <Lock className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        <strong>Read-only mode.</strong> {reason} You can view data but cannot add or edit anything until billing is active.
      </span>
      {isOwner ? (
        <Link
          to="/settings/billing"
          className="underline font-semibold whitespace-nowrap"
        >
          Manage billing
        </Link>
      ) : (
        <span className="opacity-80 whitespace-nowrap">Contact your owner.</span>
      )}
    </div>
  );
}
