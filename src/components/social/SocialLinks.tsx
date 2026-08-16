/**
 * The shop's social links, in the one place their marks are drawn.
 *
 * These are the first SVGs in the project — everything else uses a text glyph
 * (`⌕`, `♡`, `☰`), and neither Instagram nor Telegram has one. Both marks are
 * stroked at the same weight and inherit `currentColor`, so they read as one
 * system wherever they sit and follow the surrounding colour.
 */

type SocialLinksProps = {
  instagramUrl?: string;
  telegramUrl?: string;
  /**
   * The header's utility bar is already crowded, so it shows the marks alone and
   * names them for screen readers. Everywhere with room shows the name too.
   */
  showLabels?: boolean;
  className?: string;
};

function InstagramMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21.5 3.6 2.7 10.9l6.3 2.4 2.3 6.2z" />
      <path d="M21.5 3.6 9 13.3" />
    </svg>
  );
}

export function SocialLinks({
  instagramUrl,
  telegramUrl,
  showLabels = false,
  className,
}: SocialLinksProps) {
  if (!instagramUrl && !telegramUrl) return null;

  const links = [
    { url: instagramUrl, name: "Instagram", Mark: InstagramMark },
    { url: telegramUrl, name: "Telegram", Mark: TelegramMark },
  ].filter((link): link is { url: string; name: string; Mark: () => React.JSX.Element } =>
    Boolean(link.url)
  );

  return (
    <span className={["social-links", className].filter(Boolean).join(" ")}>
      {links.map(({ url, name, Mark }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noreferrer"
          // With a label beside it the text names the link; without one the mark
          // is decorative and the name has to come from here.
          aria-label={showLabels ? undefined : name}
        >
          <Mark />
          {showLabels ? <span>{name}</span> : null}
        </a>
      ))}
    </span>
  );
}
