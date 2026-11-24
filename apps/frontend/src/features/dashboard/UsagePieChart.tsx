import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface UsagePoint {
  /** Statement date as the API sends it (ISO date or date-time). */
  date: string;
  usage: number;
}

// Categorical slots in fixed order (validated reference palette). Never cycled:
// past MAX_SLICES the oldest statements fold into one "Earlier" slice.
const SLICE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const MAX_SLICES = SLICE_COLORS.length;
const ANIMATION_MS = 900;
const SIZE = 220;
const RADIUS = 100;
const CENTER = SIZE / 2;

interface Slice {
  key: string;
  label: string;
  usage: number;
  share: number;
  color: string;
}

function formatStatementDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

const usageFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

function buildSlices(points: UsagePoint[]): Slice[] {
  const sorted = points.filter((point) => point.usage > 0).sort((a, b) => b.date.localeCompare(a.date));
  const total = sorted.reduce((sum, point) => sum + point.usage, 0);
  if (!total) return [];
  const shown = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted;
  const folded = sorted.slice(shown.length);
  // Oldest first, so the pie reads clockwise in time from 12 o'clock.
  const slices: Array<Omit<Slice, "color">> = shown.reverse().map((point, index) => ({
    key: `${point.date}-${index}`,
    label: formatStatementDate(point.date),
    usage: point.usage,
    share: point.usage / total
  }));
  if (folded.length) {
    const usage = folded.reduce((sum, point) => sum + point.usage, 0);
    slices.unshift({ key: "earlier", label: `Earlier (${folded.length} statements)`, usage, share: usage / total });
  }
  return slices.map((slice, index) => ({ ...slice, color: SLICE_COLORS[index] }));
}

function arcPath(start: number, end: number, radius: number) {
  // A lone slice is a full circle, which one SVG arc cannot draw.
  if (end - start >= Math.PI * 2 - 1e-6) {
    return `M ${CENTER} ${CENTER - radius} A ${radius} ${radius} 0 1 1 ${CENTER - 0.01} ${CENTER - radius} Z`;
  }
  const point = (angle: number) => [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
}

/** 0→1 eased progress that restarts whenever `trigger` changes; jumps to 1 for reduced motion. */
function useEntranceProgress(trigger: unknown) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - started) / ANIMATION_MS, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [trigger]);
  return progress;
}

const MAX_MONTHS = 24;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BAR_COLOR = SLICE_COLORS[0];
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

interface MonthBar {
  key: string;
  label: string;
  year: number;
  month: number;
  usage: number;
  statements: number;
}

/** Usage summed per statement month, every month from first to last shown (gaps stay empty), latest MAX_MONTHS only. */
function buildMonths(points: UsagePoint[], keepNonPositive = false): MonthBar[] {
  const byMonth = new Map<string, { usage: number; statements: number }>();
  for (const point of points) {
    const match = /^(\d{4})-(\d{2})/.exec(point.date);
    if (!match || !Number.isFinite(point.usage) || (!keepNonPositive && point.usage <= 0)) continue;
    const entry = byMonth.get(`${match[1]}-${match[2]}`) ?? { usage: 0, statements: 0 };
    entry.usage += point.usage;
    entry.statements += 1;
    byMonth.set(`${match[1]}-${match[2]}`, entry);
  }
  const keys = [...byMonth.keys()].sort();
  if (!keys.length) return [];
  const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);
  const [firstYear, firstMonth] = keys[0].split("-").map(Number);
  const span = Math.min((lastYear - firstYear) * 12 + (lastMonth - firstMonth) + 1, MAX_MONTHS);
  return Array.from({ length: span }, (_, index) => {
    const offset = lastYear * 12 + (lastMonth - 1) - (span - 1 - index);
    const year = Math.floor(offset / 12);
    const month = offset % 12;
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const entry = byMonth.get(key);
    return { key, label: `${MONTH_NAMES[month]} ${year}`, year, month, usage: entry?.usage ?? 0, statements: entry?.statements ?? 0 };
  });
}

/** Clean axis maximum and tick step (1, 2 or 5 × 10ⁿ) for 4–5 ticks. */
function niceScale(max: number) {
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? rough;
  return { step, top: Math.ceil(max / step) * step };
}

const BAR_WIDTH = 520;
const BAR_HEIGHT = 240;
const PLOT = { left: 48, right: 8, top: 12, bottom: 34 };

/** Animated column chart of total usage per statement month. Single series, so no legend box. */
export function UsageBarChart({ points, title = "Total Usage by Month" }: { points: UsagePoint[]; title?: string }) {
  const months = useMemo(() => buildMonths(points), [points]);
  const progress = useEntranceProgress(months);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!months.length) return null;

  const { step, top } = niceScale(Math.max(...months.map((month) => month.usage)));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const tickFormat = top >= 10_000 ? compactFormat : usageFormat;
  const plotWidth = BAR_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = BAR_HEIGHT - PLOT.top - PLOT.bottom;
  const band = plotWidth / months.length;
  const barWidth = Math.max(Math.min(band - 2, 28), 2);
  const y = (value: number) => PLOT.top + plotHeight - (value / top) * plotHeight;
  const labelEvery = Math.ceil(months.length / 12);
  const active = months.find((month) => month.key === hovered) ?? null;

  return (
    <figure className="usage-chart usage-bar" aria-label={title}>
      <figcaption className="usage-pie-title">{title}</figcaption>
      <div ref={wrapRef} className="usage-pie-plot usage-bar-plot" onMouseLeave={() => { setHovered(null); setTooltip(null); }}>
        <svg viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`} width="100%" role="img"
          aria-label={`${title}: ${months.map((month) => `${month.label} ${usageFormat.format(month.usage)}`).join(", ")}`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="usage-bar-grid" x1={PLOT.left} x2={BAR_WIDTH - PLOT.right} y1={y(tick)} y2={y(tick)} />
              <text className="usage-bar-axis" x={PLOT.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{tickFormat.format(tick)}</text>
            </g>
          ))}
          {months.map((month, index) => {
            const x = PLOT.left + index * band + (band - barWidth) / 2;
            const height = (month.usage / top) * plotHeight * progress;
            const radius = Math.min(4, barWidth / 2, height);
            const base = PLOT.top + plotHeight;
            return (
              <g key={month.key}>
                {height > 0 ? (
                  <path
                    className="usage-bar-mark"
                    fill={BAR_COLOR}
                    opacity={hovered && hovered !== month.key ? 0.55 : 1}
                    // Rounded data end (top), square at the baseline.
                    d={`M ${x} ${base} V ${base - height + radius} Q ${x} ${base - height} ${x + radius} ${base - height} H ${x + barWidth - radius} Q ${x + barWidth} ${base - height} ${x + barWidth} ${base - height + radius} V ${base} Z`}
                  />
                ) : null}
                {/* Full-height hit target, wider than the bar. */}
                <rect
                  x={PLOT.left + index * band} y={PLOT.top} width={band} height={plotHeight} fill="transparent"
                  onMouseMove={(event) => {
                    const box = wrapRef.current?.getBoundingClientRect();
                    if (box) setTooltip({ x: event.clientX - box.left, y: event.clientY - box.top });
                    setHovered(month.key);
                  }}
                />
                {index % labelEvery === 0 || index === months.length - 1 ? (
                  <text className="usage-bar-axis" x={PLOT.left + index * band + band / 2} y={BAR_HEIGHT - PLOT.bottom + 14} textAnchor="middle">
                    {MONTH_NAMES[month.month]}
                    {month.month === 0 || index === 0 ? <tspan x={PLOT.left + index * band + band / 2} dy="1.2em">{month.year}</tspan> : null}
                  </text>
                ) : null}
              </g>
            );
          })}
          <line className="usage-bar-baseline" x1={PLOT.left} x2={BAR_WIDTH - PLOT.right} y1={PLOT.top + plotHeight} y2={PLOT.top + plotHeight} />
        </svg>
        {active && tooltip ? (
          <div className="usage-pie-tooltip" style={tooltipPosition(tooltip, wrapRef.current)} role="status">
            <strong>{active.label}</strong>
            <span>Total usage: {active.statements ? usageFormat.format(active.usage) : "No statement"}</span>
            {active.statements > 1 ? <span>{active.statements} statements</span> : null}
          </div>
        ) : null}
      </div>
    </figure>
  );
}

const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const wholeCurrencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Animated line of total invoice cost per statement month. Months with no statement break the line. */
export function InvoiceCostLineChart({ points, title = "Total Invoice Cost by Month" }: { points: UsagePoint[]; title?: string }) {
  const months = useMemo(() => buildMonths(points, true), [points]);
  const progress = useEntranceProgress(months);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // useId returns ":r0:"-style ids; strip the colons so url(#id) always resolves.
  const clipId = `cost-line-${useId().replace(/:/g, "")}`;

  const billed = months.filter((month) => month.statements > 0);
  if (!billed.length) return null;

  // Axis always includes 0; it extends below 0 only when a month is a net credit.
  const maxValue = Math.max(0, ...billed.map((month) => month.usage));
  const minValue = Math.min(0, ...billed.map((month) => month.usage));
  const { step } = niceScale(Math.max(maxValue - minValue, 1));
  const top = Math.ceil(maxValue / step) * step || step;
  const bottom = Math.floor(minValue / step) * step;
  const ticks = Array.from({ length: Math.round((top - bottom) / step) + 1 }, (_, index) => bottom + index * step);
  const tickFormat = Math.max(Math.abs(top), Math.abs(bottom)) >= 10_000 ? compactCurrencyFormat : wholeCurrencyFormat;
  const plotWidth = BAR_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = BAR_HEIGHT - PLOT.top - PLOT.bottom;
  const band = plotWidth / months.length;
  const x = (index: number) => PLOT.left + index * band + band / 2;
  const y = (value: number) => PLOT.top + ((top - value) / (top - bottom)) * plotHeight;
  const labelEvery = Math.ceil(months.length / 12);

  // One sub-path per run of consecutive billed months.
  let path = "";
  months.forEach((month, index) => {
    if (!month.statements) return;
    const joined = index > 0 && months[index - 1].statements > 0;
    path += `${joined ? "L" : "M"} ${x(index)} ${y(month.usage)} `;
  });
  const activeIndex = months.findIndex((month) => month.key === hovered);
  const active = activeIndex >= 0 ? months[activeIndex] : null;

  return (
    <figure className="usage-chart usage-bar usage-line" aria-label={title}>
      <figcaption className="usage-pie-title">{title}</figcaption>
      <div ref={wrapRef} className="usage-pie-plot usage-bar-plot" onMouseLeave={() => { setHovered(null); setTooltip(null); }}>
        <svg viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`} width="100%" role="img"
          aria-label={`${title}: ${billed.map((month) => `${month.label} ${currencyFormat.format(month.usage)}`).join(", ")}`}>
          <defs>
            {/* Draws the line in from left to right. */}
            <clipPath id={clipId}>
              <rect x={0} y={0} width={PLOT.left + plotWidth * progress + 6} height={BAR_HEIGHT} />
            </clipPath>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className={tick === 0 ? "usage-bar-baseline" : "usage-bar-grid"} x1={PLOT.left} x2={BAR_WIDTH - PLOT.right} y1={y(tick)} y2={y(tick)} />
              <text className="usage-bar-axis" x={PLOT.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{tickFormat.format(tick)}</text>
            </g>
          ))}
          {active?.statements ? <line className="usage-line-crosshair" x1={x(activeIndex)} x2={x(activeIndex)} y1={PLOT.top} y2={PLOT.top + plotHeight} /> : null}
          <g clipPath={`url(#${clipId})`}>
            <path className="usage-line-path" d={path} stroke={BAR_COLOR} />
            {months.map((month, index) => month.statements ? (
              <circle
                key={month.key}
                className="usage-line-marker"
                cx={x(index)} cy={y(month.usage)}
                r={hovered === month.key ? 5 : 3.5}
                fill={BAR_COLOR}
              />
            ) : null)}
          </g>
          {months.map((month, index) => (
            <g key={month.key}>
              <rect
                x={PLOT.left + index * band} y={PLOT.top} width={band} height={plotHeight} fill="transparent"
                onMouseMove={(event) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (box) setTooltip({ x: event.clientX - box.left, y: event.clientY - box.top });
                  setHovered(month.key);
                }}
              />
              {index % labelEvery === 0 || index === months.length - 1 ? (
                <text className="usage-bar-axis" x={x(index)} y={BAR_HEIGHT - PLOT.bottom + 14} textAnchor="middle">
                  {MONTH_NAMES[month.month]}
                  {month.month === 0 || index === 0 ? <tspan x={x(index)} dy="1.2em">{month.year}</tspan> : null}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        {active && tooltip ? (
          <div className="usage-pie-tooltip" style={tooltipPosition(tooltip, wrapRef.current)} role="status">
            <strong>{active.label}</strong>
            <span>Total invoice cost: {active.statements ? currencyFormat.format(active.usage) : "No statement"}</span>
            {active.statements > 1 ? <span>{active.statements} statements</span> : null}
          </div>
        ) : null}
      </div>
    </figure>
  );
}

/** Animated pie of total usage per statement date, with a legend that doubles as the data table. */
export function UsagePieChart({ points, title = "Total Usage by Statement Date" }: { points: UsagePoint[]; title?: string }) {
  const slices = useMemo(() => buildSlices(points), [points]);
  const total = useMemo(() => slices.reduce((sum, slice) => sum + slice.usage, 0), [slices]);
  // Sweep the slices in whenever the data changes.
  const progress = useEntranceProgress(slices);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!slices.length) return null;

  let angle = 0;
  const sweep = Math.PI * 2 * progress;
  const arcs = slices.map((slice) => {
    const start = angle;
    angle += slice.share * sweep;
    return { slice, start, end: angle };
  });
  const active = slices.find((slice) => slice.key === hovered) ?? null;

  return (
    <figure className="usage-pie" aria-label={title}>
      <figcaption className="usage-pie-title">{title}</figcaption>
      <div className="usage-pie-body">
        <div
          ref={wrapRef}
          className="usage-pie-plot"
          onMouseLeave={() => { setHovered(null); setTooltip(null); }}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`${title}: ${slices.map((slice) => `${slice.label} ${usageFormat.format(slice.usage)}`).join(", ")}`}>
            {arcs.map(({ slice, start, end }) => end > start ? (
              <path
                key={slice.key}
                d={arcPath(start, end, hovered === slice.key ? RADIUS + 6 : RADIUS)}
                fill={slice.color}
                className="usage-pie-slice"
                opacity={hovered && hovered !== slice.key ? 0.55 : 1}
                onMouseMove={(event) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (box) setTooltip({ x: event.clientX - box.left, y: event.clientY - box.top });
                  setHovered(slice.key);
                }}
              />
            ) : null)}
          </svg>
          {active && tooltip ? (
            <div className="usage-pie-tooltip" style={tooltipPosition(tooltip, wrapRef.current)} role="status">
              <strong>{active.label}</strong>
              <span>Total usage: {usageFormat.format(active.usage)}</span>
              <span>{percentFormat.format(active.share)} of {usageFormat.format(total)}</span>
            </div>
          ) : null}
        </div>
        <table className="usage-pie-legend">
          <thead>
            <tr><th scope="col">Statement Date</th><th scope="col">Total Usage</th><th scope="col">Share</th></tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr
                key={slice.key}
                className={hovered === slice.key ? "active" : undefined}
                onMouseEnter={() => setHovered(slice.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <th scope="row"><span className="usage-pie-swatch" style={{ background: slice.color }} aria-hidden="true" />{slice.label}</th>
                <td>{usageFormat.format(slice.usage)}</td>
                <td>{percentFormat.format(slice.share)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row">Total</th><td>{usageFormat.format(total)}</td><td>100%</td></tr>
          </tfoot>
        </table>
      </div>
    </figure>
  );
}

/** Places the tooltip beside the pointer, flipping left/up near the plot's right/bottom edge. */
function tooltipPosition(point: { x: number; y: number }, plot: HTMLElement | null) {
  const width = plot?.clientWidth ?? 0;
  const height = plot?.clientHeight ?? 0;
  return {
    left: point.x > width - 180 ? undefined : point.x + 14,
    right: point.x > width - 180 ? width - point.x + 14 : undefined,
    top: point.y > height - 80 ? point.y - 74 : point.y + 14
  };
}
