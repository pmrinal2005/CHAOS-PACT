import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Crosshair,
  FileSearch,
  Globe,
  LockKeyhole,
  Monitor,
  Smartphone,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { platformNames } from "@/lib/types";
import { duration, stamp, useWorkspace, type Run } from "./workspace";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="logo">
      <svg width="33" height="36" viewBox="0 0 36 40" aria-hidden="true">
        <path
          d="M19 2 34 10.5 27 14.5 19 10 8.5 16v10l9.7 5.7v7.1L2 29.5v-18z"
          fill="currentColor"
        />
        <path
          d="m21 13 12 7v10l-12 7v-7l6-3.7v-3.6l-6-3.5-7 4.2v-7z"
          fill="currentColor"
        />
      </svg>
      {!small && (
        <span>
          CHAOS<span className="logo-dash">-</span>PACT
        </span>
      )}
    </span>
  );
}
export function Dot({
  color = "green",
  pulse = false,
}: {
  color?: string;
  pulse?: boolean;
}) {
  return <i className={`dot ${color} ${pulse ? "pulse" : ""}`} />;
}
export function Tag({
  children,
  color = "muted",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function IconButton({
  icon: Icon,
  label,
  onClick,
  className = "",
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={16} />
    </button>
  );
}
export function PanelHeading({
  icon: Icon,
  children,
  action,
  color = "gold",
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  color?: string;
}) {
  return (
    <div className="panel-heading">
      <div className="panel-name">
        <Icon size={17} className={color} />
        <h2>{children}</h2>
      </div>
      {action}
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
  terrain = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  terrain?: boolean;
}) {
  return (
    <header className={`page-head ${terrain ? "terrain-head" : ""}`}>
      <div className="page-head-copy">
        <div className="eyebrow gold">
          <span className="eyebrow-line" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="head-actions">{action}</div>}
    </header>
  );
}
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`toggle ${value ? "on" : ""}`}
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
    >
      <span />
    </button>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstInput = ref.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([type=file]),textarea",
    );
    (firstInput || ref.current)?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <div>
            {eyebrow && <div className="eyebrow gold">{eyebrow}</div>}
            <h2 id={id}>{title}</h2>
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
export function Gauge({
  value,
  limit,
  large = false,
}: {
  value: number;
  limit: number;
  large?: boolean;
}) {
  const p = Math.min(1, value / limit);
  const rad = (a: number) => (a * Math.PI) / 180;
  const xy = (a: number, r: number) => [
    100 + r * Math.cos(rad(a)),
    100 + r * Math.sin(rad(a)),
  ];
  const arc = (a: number, b: number, r: number) => {
    const s = xy(a, r);
    const e = xy(b, r);
    return `M${s[0]},${s[1]} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e[0]},${e[1]}`;
  };
  return (
    <div className={`gauge ${large ? "large" : ""}`}>
      <svg
        viewBox="0 0 200 171"
        role="img"
        aria-label={`${value.toLocaleString()} of ${limit.toLocaleString()} execution credits remaining`}
      >
        <path
          d={arc(145, 395, 82)}
          fill="none"
          stroke="#2b2d2e"
          strokeWidth="9"
        />
        <path
          className="gauge-fill"
          d={arc(145, 145 + 250 * p, 82)}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="9"
        />
        {Array.from({ length: 39 }, (_, i) => {
          const a = 145 + (i * 250) / 38;
          const s = xy(a, 67);
          const e = xy(a, i % 4 === 0 ? 74 : 71);
          return (
            <line
              key={i}
              x1={s[0]}
              y1={s[1]}
              x2={e[0]}
              y2={e[1]}
              stroke={i / 38 < p ? "#b19359" : "#464747"}
              strokeWidth="1.3"
            />
          );
        })}
        <text x="100" y="101" textAnchor="middle" className="gauge-number">
          {value.toLocaleString()}
        </text>
        <text x="100" y="120" textAnchor="middle" className="gauge-label">
          REMAINING
        </text>
        <text x="100" y="151" textAnchor="middle" className="gauge-total">
          / {limit.toLocaleString()}
        </text>
      </svg>
    </div>
  );
}
export function Empty({
  title = "No results found",
  description = "Try a different search or filter.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <FileSearch size={29} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Tabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          role="tab"
          aria-selected={item === active}
          className={item === active ? "selected" : ""}
          key={item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function Accord({
  title,
  icon: Icon,
  children,
  open = true,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="accordion" open={open}>
      <summary>
        <Icon size={15} className="gold" />
        {title}
        <ChevronDown size={14} />
      </summary>
      <div className="accordion-content">{children}</div>
    </details>
  );
}
export const statusColor = (s: string) =>
  s === "passed"
    ? "green"
    : s === "failed" || s === "error"
      ? "red"
      : s === "healed"
        ? "cyan"
        : "gold";
export const isMobile = (platform: string) => platform !== "desktop_web";
export function RunTable({
  runs,
  compact = false,
}: {
  runs: Run[];
  compact?: boolean;
}) {
  const { go } = useWorkspace();
  if (!runs.length)
    return (
      <Empty
        title="No executions here yet"
        description="Trigger a Kane CLI run or adjust the active filters."
      />
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Run / started</th>
            <th>Surface</th>
            {!compact && <th>Platform</th>}
            <th>Exit code</th>
            <th>Duration</th>
            {!compact && <th>Credits</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>
                <button
                  onClick={() => go("theater", { id: r.id })}
                  className="run-link mono"
                  title={r.name}
                >
                  {r.label}
                </button>
                <small>{stamp(r.at)} UTC</small>
              </td>
              <td>
                <span className="inline-icon mono">
                  <Terminal size={13} />
                  {r.surface}
                </span>
              </td>
              {!compact && (
                <td>
                  <span className="inline-icon">
                    {isMobile(r.platform) ? <Smartphone size={13} /> : <Monitor size={13} />}{" "}
                    {platformNames[r.platform] || r.platform}
                  </span>
                </td>
              )}
              <td>
                <span className={`exit-code ${statusColor(r.display)}`}>
                  {r.exitCode ?? "~"}
                </span>
                {r.resultCode && <Tag color="gold">{r.resultCode}</Tag>}
              </td>
              <td className="mono">{r.completedAt ? duration(r.duration) : "live"}</td>
              {!compact && <td className="mono">{r.credits ? r.credits.toFixed(1) : "0"}</td>}
              <td>
                {r.hasEvidence ? (
                  <button
                    className="text-button small"
                    onClick={() => go("evidence", { id: r.id })}
                  >
                    Evidence <ArrowUpRight size={12} />
                  </button>
                ) : (
                  <span className="muted small-note">No pack</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/** A captured browser frame from a sealed evidence pack, or an honest blank. */
export function EvidenceFrame({
  src,
  url,
  alt,
  small = false,
  mobile = false,
  note = "No screenshot in this pack",
}: {
  src?: string | null;
  url?: string | null;
  alt: string;
  small?: boolean;
  mobile?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`browser-preview evidence-frame ${small ? "mini" : ""} ${mobile ? "phone-preview" : ""}`}
    >
      <div className="browser-chrome">
        <span className="browser-lights">
          <i />
          <i />
          <i />
        </span>
        <span>
          <LockKeyhole size={9} /> {url ? url.replace(/^https?:\/\//, "").slice(0, 60) : "captured frame"}
        </span>
        <Globe size={10} />
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="evidence-shot" src={src} alt={alt} loading="lazy" />
      ) : (
        <div className="evidence-blank">
          <Crosshair size={small ? 14 : 22} />
          {!small && <span>{note}</span>}
        </div>
      )}
    </div>
  );
}
export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <div className="check-line">
      <Check size={13} />
      {children}
    </div>
  );
}
