// Official KKL-JNF logo, supplied by the client (public/kkl-logo.svg).
// The lockup is portrait-oriented (tree mark + diagonal stripes + wordmark
// stacked), so it's sized by height and left to flow its own width.
export function KklLogo({ className = "h-12 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/kkl-logo.svg"
      alt='קרן קימת לישראל – KKL-JNF'
      className={className}
    />
  );
}
