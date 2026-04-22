export function LogoMark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "onBlue";
}) {
  const bg = variant === "onBlue" ? "fill-white" : "fill-teal-700";
  const fg = variant === "onBlue" ? "fill-teal-700" : "fill-white";
  const check = variant === "onBlue" ? "fill-emerald-600" : "fill-emerald-300";
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="40" height="40" rx="10" className={bg} />
      <path
        d="M12 14h16v2H12v-2zm0 6h10v2H12v-2zm8 6h8v2h-8v-2z"
        className={fg}
        opacity="0.9"
      />
      <path d="M26 12l4 4-8 8-4-4 8-8z" className={check} />
    </svg>
  );
}
