import { heatColor, heatColorAlpha, heatLabel } from "@/lib/heat";

/**
 * Heat readout — la firma dell'app. Numero in mono + barra color-mappata.
 * Il `pulse` (solo sull'evento piu' caldo) anima il glow.
 */
export function HeatReadout({
  score,
  size = "md",
  pulse = false,
}: {
  score: number;
  size?: "md" | "lg";
  pulse?: boolean;
}): React.ReactElement {
  const color = heatColor(score);
  const isLg = size === "lg";
  return (
    <div
      className="inline-flex items-center gap-2"
      aria-label={`Hype ${score} su 100, ${heatLabel(score)}`}
    >
      <span
        className={`relative inline-flex items-center justify-center rounded-full font-mono font-bold tabular-nums ${
          isLg ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm"
        }`}
        style={{
          color,
          boxShadow: `0 0 0 1.5px ${color}, 0 0 18px ${heatColorAlpha(score, pulse ? 0.55 : 0.3)}`,
        }}
      >
        {pulse && (
          <span
            className="absolute inset-0 rounded-full motion-safe:animate-heat-pulse"
            style={{ boxShadow: `0 0 22px ${heatColorAlpha(score, 0.6)}` }}
            aria-hidden
          />
        )}
        {score}
      </span>
      {isLg && (
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color }}>
          {heatLabel(score)}
        </span>
      )}
    </div>
  );
}
