/** The app icon: lines of text being written, with a caret at the end. Flat, white on the icon. */
export function SpeedGlyph({ className }: { className?: string; strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="3.2" y="4.6" width="17.6" height="3.4" rx="1.7" />
      <rect x="3.2" y="10.3" width="12.4" height="3.4" rx="1.7" />
      <rect x="3.2" y="16" width="6.6" height="3.4" rx="1.7" />
      <rect x="12.4" y="15" width="3" height="5.4" rx="1.5" />
    </svg>
  );
}
