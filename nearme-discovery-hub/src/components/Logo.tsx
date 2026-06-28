import { useId } from "react";
import { Link } from "react-router-dom";

type MarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function AroundYouMark({ size = 32, className, title = "AroundYou" }: MarkProps) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="22" y1="8" x2="98" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A82F0" />
          <stop offset="1" stopColor="#0B57D0" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${id})`} />
      <circle cx="60" cy="60" r="43" stroke="#FFFFFF" strokeOpacity="0.42" strokeWidth="4" />
      <path d="M60 13 L72.5 47.5 L107 60 L72.5 72.5 L60 107 L47.5 72.5 L13 60 L47.5 47.5 Z" fill="#FFFFFF" />
      <path d="M60 13 L72.5 47.5 L47.5 47.5 Z" fill="#EA4335" />
      <circle cx="60" cy="60" r="11" fill="#0B57D0" />
      <circle cx="60" cy="60" r="5.5" fill="#EA4335" />
    </svg>
  );
}

type LogoProps = MarkProps & {
  withWordmark?: boolean;
};

export function Logo({ size = 34, withWordmark = true, className }: LogoProps) {
  return (
    <Link
      to="/"
      className={"inline-flex items-center gap-2.5 no-underline " + (className ?? "")}
    >
      <AroundYouMark size={size} />
      {withWordmark && (
        <span
          className="font-bold tracking-tight text-foreground"
          style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: size * 0.6 }}
        >
          Around<span className="text-primary">You</span>
        </span>
      )}
    </Link>
  );
}

export default Logo;
