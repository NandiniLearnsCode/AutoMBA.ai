import { Check, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";

interface ChatActionProps {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  approved?: boolean;
  rejected?: boolean;
}

/**
 * Kaisey-styled action buttons for approve/reject actions
 * Pill-shaped, compact design that fits inside message bubbles
 */
export function ChatAction({ onApprove, onReject, disabled, approved, rejected }: ChatActionProps) {
  if (approved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-2">
        <Check className="w-3.5 h-3.5" />
        <span>Approved</span>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-2">
        <X className="w-3.5 h-3.5" />
        <span>Declined</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
      <Button
        size="sm"
        onClick={onApprove}
        disabled={disabled}
        className={cn(
          "h-7 px-3 text-xs font-medium rounded-full",
          "bg-green-500 hover:bg-green-600 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200"
        )}
      >
        <Check className="w-3 h-3 mr-1.5" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onReject}
        disabled={disabled}
        className={cn(
          "h-7 px-3 text-xs font-medium rounded-full",
          "border-border hover:bg-muted",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200"
        )}
      >
        <X className="w-3 h-3 mr-1.5" />
        Decline
      </Button>
    </div>
  );
}
