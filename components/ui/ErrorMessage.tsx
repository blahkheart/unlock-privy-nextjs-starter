import { ReactNode } from "react";

interface ErrorMessageProps {
  children: ReactNode;
  className?: string;
}

/**
 * Reusable error message component with consistent styling
 * Handles text overflow properly with word breaking
 */
export function ErrorMessage({ children, className }: ErrorMessageProps) {
  return (
    <div
      className={className}
      style={{
        padding: "0.75rem",
        backgroundColor: "#fee2e2",
        border: "1px solid #fecaca",
        borderRadius: "4px",
        color: "#991b1b",
        fontSize: "0.875rem",
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}
    >
      {children}
    </div>
  );
}
