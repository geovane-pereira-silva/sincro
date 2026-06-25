import { cn } from "@/lib/utils";

/** Squircle "S" mark do SINCRO. */
export function SincroMark({
  size = 64,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-ponto-entrada",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
      }}
    >
      <span
        className="font-extrabold leading-none"
        style={{ fontSize: size * 0.56 }}
      >
        S
      </span>
    </div>
  );
}
