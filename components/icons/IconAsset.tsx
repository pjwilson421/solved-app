import { cn } from "@/lib/utils";
import type { IconPath } from "./icon-paths";

type IconAssetProps = {
  src: IconPath | string;
  size?: number;
  className?: string;
  title?: string;
};

/**
 * Renders a 24×24 artboard SVG from /public/icons at the requested display size.
 */
export function IconAsset({
  src,
  size = 24,
  className,
  title,
}: IconAssetProps) {
  const style = { width: size, height: size } as const;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={24}
        height={24}
        className="block max-h-none max-w-none select-none opacity-100 filter-none"
        style={style}
        draggable={false}
      />
    </span>
  );
}
