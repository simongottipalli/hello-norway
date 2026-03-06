"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full max-w-lg">{children}</div>
    </div>
  );
}

type DialogContentProps = {
  children: React.ReactNode;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

export function DialogContent({ children, className, "aria-labelledby": ariaLabelledBy = "dialog-title", "aria-describedby": ariaDescribedBy = "dialog-description" }: DialogContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Set initial focus to the dialog content
    if (contentRef.current) {
      contentRef.current.focus();
    }

    // Trap focus within the dialog
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = contentRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, []);

  return (
    <div
      ref={contentRef}
      className={cn(
        "bg-card rounded-lg shadow-lg p-6 mx-4 space-y-4",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

type DialogHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

type DialogTitleProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function DialogTitle({ children, className, id = "dialog-title" }: DialogTitleProps) {
  return (
    <h2 id={id} className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
}

type DialogDescriptionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function DialogDescription({ children, className, id = "dialog-description" }: DialogDescriptionProps) {
  return (
    <p id={id} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

type DialogFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      {children}
    </div>
  );
}
