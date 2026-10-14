// Small inline spinner shown in place of the "←" arrow on a directory-table
// row while its navigation is pending (see lib/hooks/use-row-navigation.ts).
export function RowSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`inline-block h-3.5 w-3.5 animate-spin text-(--color-brand) ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
