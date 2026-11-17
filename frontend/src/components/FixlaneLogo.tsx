const HEX_HOLE = 'M23.7 10.5 22.1 13.3H18.9L17.3 10.5l1.6-2.8h3.2Z';
const WRENCH_HANDLE = 'M16.6 15.2 13.4 18.4Q11.4 20.4 13.6 22.4 14.8 24.1 16.6 24.1';
const LANE_DASH = 'M22.4 24.1H24.8';

export interface FixlaneLogoProps {
  size?: number;
  className?: string;
}

export function FixlaneLogo({ size = 28, className }: FixlaneLogoProps): JSX.Element {
  return (
    <svg
      className={className ? `fixlane-logo ${className}` : 'fixlane-logo'}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      focusable="false"
    >
      <title>Fixlane</title>
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        fill="var(--logo-badge)"
        stroke="var(--logo-ring)"
      />
      <circle cx="20.5" cy="10.5" r="6.1" fill="var(--logo-mark)" />
      <path d={HEX_HOLE} fill="var(--logo-badge)" />
      <path
        d={WRENCH_HANDLE}
        fill="none"
        stroke="var(--logo-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={LANE_DASH}
        fill="none"
        stroke="var(--logo-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
