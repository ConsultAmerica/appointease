import Image from "next/image";
import type { ComponentProps } from "react";

type AppointmentImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
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
  className = "",
  imageClassName = "h-full w-full object-cover",
  sizes = "(max-width: 768px) 100vw, 50vw",
  children,
}: AppointmentImageProps) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={imageClassName}
      />
      {children}
    </div>
  );
}
