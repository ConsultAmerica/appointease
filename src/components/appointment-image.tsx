import Image from "next/image";
import type { ComponentProps } from "react";

type AppointmentImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  fill?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
} & Pick<ComponentProps<"div">, "children">;

export function AppointmentImage({
  src,
  alt,
  width,
  height,
  priority = false,
  fill = false,
  className = "",
  imageClassName = "object-cover",
  sizes = "(max-width: 768px) 100vw, 50vw",
  children,
}: AppointmentImageProps) {
  return (
    <div className={`overflow-hidden ${fill ? "relative" : ""} ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        className={fill ? `h-full w-full ${imageClassName}` : `h-auto w-full ${imageClassName}`}
      />
      {children}
    </div>
  );
}
