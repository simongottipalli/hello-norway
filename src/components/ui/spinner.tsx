import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <span role="status" aria-label="Loading" className="inline-flex">
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size],
          className,
        )}
        aria-hidden="true"
      />
    </span>
  );
}
