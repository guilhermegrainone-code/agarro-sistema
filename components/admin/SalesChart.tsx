import { formatPriceCents } from "@/lib/format";

type Point = { key: string; label: string; valueCents: number; count: number };

/**
 * Gráfico de barras de série única (receita por dia), em SVG puro — cor da marca,
 * grade discreta, tooltip por barra ao passar o mouse. Sem legenda: o título já diz o que é.
 */
export function SalesChart({ data, title }: { data: Point[]; title: string }) {
  const width = 720;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...data.map((d) => d.valueCents), 1);
  // Teto "bonito" para a grade: 1, 2, 5 × 10^n
  const niceMax = niceCeil(max);
  const ticks = [0, niceMax / 2, niceMax];

  const gap = 2;
  const barW = Math.max(2, plotW / data.length - gap);
  const y = (v: number) => pad.top + plotH - (v / niceMax) * plotH;

  const labelEvery = data.length > 14 ? Math.ceil(data.length / 6) : 1;

  return (
    <figure className="px-5 py-4">
      <figcaption className="mb-3 text-sm text-graphite">{title}</figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[480px] w-full"
          role="img"
          aria-label={title}
        >
          <style>{`
            .bar-group .tip { opacity: 0; pointer-events: none; transition: opacity .12s; }
            .bar-group:hover .tip { opacity: 1; }
            .bar-group:hover .bar { fill: #7A1E43; }
          `}</style>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                stroke="#DCC5C9"
                strokeWidth={t === 0 ? 1 : 0.75}
                strokeDasharray={t === 0 ? undefined : "2 3"}
              />
              <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#9B4A63">
                {compactBRL(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = pad.left + i * (plotW / data.length) + gap / 2;
            const h = d.valueCents > 0 ? Math.max(2, y(0) - y(d.valueCents)) : 0;
            const tipX = Math.min(Math.max(x + barW / 2, pad.left + 70), width - pad.right - 70);
            return (
              <g key={d.key} className="bar-group">
                {/* alvo de hover maior que a barra */}
                <rect x={x - gap / 2} y={pad.top} width={barW + gap} height={plotH} fill="transparent" />
                <rect
                  className="bar"
                  x={x}
                  y={y(0) - h}
                  width={barW}
                  height={h}
                  fill="#9B4A63"
                  opacity={d.valueCents > 0 ? 1 : 0}
                />
                {i % labelEvery === 0 && (
                  <text
                    x={x + barW / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9B4A63"
                  >
                    {d.label}
                  </text>
                )}
                <g className="tip">
                  <rect x={tipX - 68} y={pad.top} width={136} height={34} fill="#7A1E43" />
                  <text x={tipX} y={pad.top + 14} textAnchor="middle" fontSize="10" fill="#EFE3D8">
                    {d.label} · {d.count} {d.count === 1 ? "venda" : "vendas"}
                  </text>
                  <text x={tipX} y={pad.top + 27} textAnchor="middle" fontSize="11" fill="#EFE3D8" fontWeight="600">
                    {formatPriceCents(d.valueCents)}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

function niceCeil(cents: number): number {
  const reais = cents / 100;
  const pow = Math.pow(10, Math.floor(Math.log10(reais)));
  const n = reais / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow * 100;
}

function compactBRL(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
