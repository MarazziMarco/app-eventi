/**
 * Logo "Eventi": un pin di posizione che racchiude una fiamma (il concept Heat).
 * Il gradiente segue la rampa Heat (indaco -> ambra).
 */
export function Logo({ size = 28 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="heatLogo" x1="8" y1="29" x2="24" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B6CFF" />
          <stop offset="0.5" stopColor="#B14CFF" />
          <stop offset="0.78" stopColor="#FF3D7F" />
          <stop offset="1" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>
      {/* pin */}
      <path
        d="M16 2.5c-6.1 0-11 4.7-11 10.6 0 7.4 9.4 15.3 10.3 16.1.4.4 1 .4 1.4 0C17.6 28.4 27 20.5 27 13.1 27 7.2 22.1 2.5 16 2.5Z"
        fill="url(#heatLogo)"
      />
      {/* fiamma incavata */}
      <path
        d="M16 7.5c.9 1.7.4 3-.4 4.2-.8 1.2-1.1 2.5-.2 4 .3.5.1.7-.3.5-1.9-.9-3-2.6-3-4.6 0-1.1.5-2.3 1.4-3.2.2 1 .7 1.5 1.2 1.8.6-1 .9-1.9 1.3-2.7Z"
        fill="#0E0E13"
      />
      <circle cx="18.4" cy="13.6" r="1.4" fill="#0E0E13" />
    </svg>
  );
}
