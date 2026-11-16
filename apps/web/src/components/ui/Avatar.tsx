import { colorForUser, initials } from "../../lib/colors";
import { cn } from "../../lib/cn";

const SIZES = { xs: "h-6 w-6 text-xs", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };

export function Avatar({
  id,
  name,
  size = "md",
  online,
  ring,
  className,
  title = name,
}: {
  id: string;
  name: string;
  title?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        title={title}
        style={{ backgroundColor: colorForUser(id) }}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-full font-semibold text-black/75",
          SIZES[size],
          ring && "ring-2 ring-main",
        )}
      >
        {initials(name)}
      </span>
      {online !== undefined && (
        <span
          title={online ? "online" : "offline"}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-surface",
            online ? "bg-ok" : "bg-faint",
          )}
        />
      )}
    </span>
  );
}
