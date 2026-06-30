"use client";

import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "right";
  className?: string;
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[63] flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl lg:hidden",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

export function SheetHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border px-4 py-3", className)}>
      {children}
    </div>
  );
}

export function SheetBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("min-h-0 flex-1 overflow-hidden", className)}>{children}</div>;
}
