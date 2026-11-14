// Ilustração do dente translúcido com efeitos: halo de luz, órbitas e partículas.
// variant "dark" para fundos verdes escuros; "light" desenha um círculo verde atrás
// para o dente não sumir no fundo claro.

const particles = [
  { x: 12, y: 22, s: 6, d: 0 },
  { x: 84, y: 14, s: 4, d: 1.2 },
  { x: 92, y: 52, s: 7, d: 2.1 },
  { x: 6, y: 64, s: 5, d: 0.6 },
  { x: 74, y: 86, s: 4, d: 1.7 },
  { x: 24, y: 90, s: 3, d: 2.6 },
  { x: 50, y: 4, s: 3, d: 0.9 },
];

/** Elipse como path, para servir de trilho às partículas. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

export function ToothArt({ variant = "dark", className = "" }: { variant?: "dark" | "light"; className?: string }) {
  return (
    <div className={`tooth-art tooth-art-${variant} ${className}`} aria-hidden="true">
      {variant === "light" && <span className="tooth-disc" />}
      <span className="tooth-glow" />
      <svg className="tooth-orbits" viewBox="0 0 200 200" fill="none">
        <g transform="rotate(-24 100 104)">
          <path className="orbit orbit-a" d={ellipse(100, 104, 92, 34)} />
          <circle className="orbit-dot" r="2.6">
            <animateMotion dur="11s" repeatCount="indefinite" path={ellipse(100, 104, 92, 34)} />
          </circle>
        </g>
        <g transform="rotate(32 100 100)">
          <path className="orbit orbit-b" d={ellipse(100, 100, 84, 26)} />
          <circle className="orbit-dot" r="2">
            <animateMotion dur="15s" begin="-6s" repeatCount="indefinite" path={ellipse(100, 100, 84, 26)} />
          </circle>
        </g>
      </svg>
      {particles.map((p, i) => (
        <span
          key={i}
          className="spark"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }}
        />
      ))}
      <img className="tooth-img" src="/img/dente-vidro.webp" alt="" />
    </div>
  );
}
