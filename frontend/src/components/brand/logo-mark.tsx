import type { SVGProps } from "react";

/**
 * Keystone Arch mark.
 * - The two halves use `currentColor`, so set the text colour on the element
 *   (or a parent) to recolour it for light/dark surfaces.
 * - The keystone uses the CSS variable `--logo-key` (falls back to muted teal).
 * Decorative by default; pass `title` when the mark appears without a wordmark.
 */
type LogoMarkProps = SVGProps<SVGSVGElement> & { title?: string };

export function LogoMark({ title, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      <g transform="translate(0 -3)">
        <path
          fill="currentColor"
          d="M6 58V38A26 26 0 0 1 29 12.17V26.38A12 12 0 0 0 20 38V58Z"
        />
        <path
          fill="currentColor"
          d="M58 58V38A26 26 0 0 0 35 12.17V26.38A12 12 0 0 1 44 38V58Z"
        />
        <path
          fill="var(--logo-key, #3E8E8A)"
          d="M29 12.17A26 26 0 0 1 35 12.17V26.38A12 12 0 0 0 29 26.38Z"
        />
      </g>
    </svg>
  );
}
