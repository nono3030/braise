'use client';
import { useState, useMemo } from 'react';
import { saveWarmupSettings } from './actions';

type DomainAge = 'new' | 'aged';

const PRESETS: Record<DomainAge, { startVol: number; increment: number; maxVol: number }> = {
  new:  { startVol: 2,  increment: 1, maxVol: 40 },
  aged: { startVol: 4,  increment: 2, maxVol: 80 },
};

interface WarmupSettings {
  start_vol: number;
  increment: number;
  max_vol: number;
  weekend: boolean;
}

function rampData(startVol: number, increment: number, maxVol: number): number[] {
  return Array.from({ length: 30 }, (_, i) => Math.min(startVol + increment * i, maxVol));
}

function buildPaths(points: number[], maxVol: number, w = 560, h = 220, pl = 16, pr = 16, pt = 20, pb = 36) {
  const iw = w - pl - pr;
  const ih = h - pt - pb;
  const yMax = maxVol * 1.1 || 10;
  const x = (i: number) => pl + (i / 29) * iw;
  const y = (v: number) => pt + ih - (v / yMax) * ih;
  let line = '';
  points.forEach((v, i) => {
    line += (i ? ` L ${x(i).toFixed(1)},${y(v).toFixed(1)}` : `M ${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  });
  const area = line + ` L ${x(29).toFixed(1)},${(pt + ih).toFixed(1)} L ${pl},${(pt + ih).toFixed(1)} Z`;
  const plateauDay = points.findIndex(v => v >= maxVol);
  return { line, area, x, y, pb: pt + ih, plateauDay };
}

export default function WarmupClient({ initialSettings }: { initialSettings: WarmupSettings | null }) {
  const [domainAge, setDomainAge] = useState<DomainAge>('new');
  const [startVol, setStartVol]   = useState(initialSettings?.start_vol ?? PRESETS.new.startVol);
  const [increment, setIncrement] = useState(initialSettings?.increment ?? PRESETS.new.increment);
  const [maxVol, setMaxVol]       = useState(initialSettings?.max_vol ?? PRESETS.new.maxVol);
  const [weekend, setWeekend]     = useState(initialSettings?.weekend ?? false);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);

  function applyPreset(age: DomainAge) {
    const p = PRESETS[age];
    setDomainAge(age);
    setStartVol(p.startVol);
    setIncrement(p.increment);
    setMaxVol(p.maxVol);
  }

  const points = useMemo(() => rampData(startVol, increment, maxVol), [startVol, increment, maxVol]);
  const { line, area, x, y, pb: baseY, plateauDay } = useMemo(
    () => buildPaths(points, maxVol),
    [points, maxVol]
  );

  async function handleSave() {
    setSaving(true);
    await saveWarmupSettings({ start_vol: startVol, increment, max_vol: maxVol, weekend });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const labelStyle = { display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '10px' };
  const valueStyle = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: '#E5853C' };
  const inputRange = { width: '100%', accentColor: '#E5853C', cursor: 'pointer' };

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>Chauffe</h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>Paramétrez la montée en charge progressive de votre boîte.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.18fr', gap: '20px', alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '28px 30px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {/* Domain age */}
          <div>
            <label style={labelStyle}>Âge du domaine</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['new', 'aged'] as DomainAge[]).map(age => (
                <button
                  key={age}
                  type="button"
                  onClick={() => applyPreset(age)}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    borderRadius: '11px',
                    fontFamily: 'var(--font-jakarta)',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: domainAge === age ? '#FBEEE0' : '#FAF7F2',
                    border: domainAge === age ? '1px solid #F4D9BC' : '1px solid #E6E1D9',
                    color: domainAge === age ? '#B5611F' : '#6B635A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <i className={age === 'new' ? 'ph ph-seedling' : 'ph ph-tree'} style={{ fontSize: '17px' }} />
                  {age === 'new' ? 'Nouveau (< 6 mois)' : 'Mature (> 6 mois)'}
                </button>
              ))}
            </div>
          </div>

          {/* Volume J1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Volume au jour 1</label>
              <span style={valueStyle}>{startVol} email{startVol > 1 ? 's' : ''}/j</span>
            </div>
            <input type="range" min={1} max={10} value={startVol} onChange={e => setStartVol(Number(e.target.value))} style={inputRange} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#B0A89D', marginTop: '5px' }}>
              <span>1</span><span>10</span>
            </div>
          </div>

          {/* Increment */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Incrément quotidien</label>
              <span style={valueStyle}>+{increment}/j</span>
            </div>
            <input type="range" min={1} max={5} value={increment} onChange={e => setIncrement(Number(e.target.value))} style={inputRange} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#B0A89D', marginTop: '5px' }}>
              <span>+1</span><span>+5</span>
            </div>
          </div>

          {/* Max */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Limite maximale</label>
              <span style={valueStyle}>{maxVol} emails/j</span>
            </div>
            <input type="range" min={10} max={150} step={5} value={maxVol} onChange={e => setMaxVol(Number(e.target.value))} style={inputRange} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#B0A89D', marginTop: '5px' }}>
              <span>10</span><span>150</span>
            </div>
          </div>

          {/* Weekend toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #F4EFE7' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', color: '#2C2824', marginBottom: '3px' }}>Envoyer le week-end</div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94' }}>Réduit le volume de 40% le samedi &amp; dimanche</div>
            </div>
            <button
              type="button"
              onClick={() => setWeekend((w: boolean) => !w)}
              style={{ width: '44px', height: '26px', borderRadius: '999px', background: weekend ? '#E5853C' : '#E6E1D9', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: '3px', left: weekend ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)', transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              background: saved ? '#2FA572' : '#E5853C',
              border: 'none',
              color: '#fff',
              borderRadius: '11px',
              padding: '13px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 600,
              fontSize: '14.5px',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: `0 2px 8px ${saved ? 'rgba(47,165,114,0.3)' : 'rgba(207,118,46,0.3)'}`,
              transition: 'background 0.25s, box-shadow 0.25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <i className={saved ? 'ph ph-check-circle' : saving ? 'ph ph-spinner' : 'ph ph-floppy-disk'} style={{ fontSize: '17px' }} />
            {saved ? 'Paramètres enregistrés !' : saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Chart card */}
          <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#C09A6B', marginBottom: '6px' }}>Aperçu en direct</div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '17px', color: '#241F1B', letterSpacing: '-0.01em' }}>Rampe d&apos;envoi sur 30 jours</h3>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: '#E5853C', background: '#FDF1E5', border: '1px solid #F4D9BC', padding: '4px 10px', borderRadius: '7px' }}>
                J1 → {maxVol}/j
              </span>
            </div>

            <svg viewBox="0 0 560 220" width="100%" style={{ display: 'block', height: 'auto' }}>
              <defs>
                <linearGradient id="gradWarmup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5853C" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#E5853C" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const yy = (20 + (220 - 36 - 20) * (1 - t)).toFixed(1);
                const val = Math.round(maxVol * 1.1 * t);
                return (
                  <g key={i}>
                    <line x1="16" y1={yy} x2="544" y2={yy} stroke="#F4EFE7" strokeWidth="1" />
                    <text x="11" y={Number(yy) + 4} textAnchor="end" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#C9C1B4' }}>{val}</text>
                  </g>
                );
              })}

              <path d={area} fill="url(#gradWarmup)" />
              <path d={line} fill="none" stroke="#E5853C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

              {plateauDay >= 0 && (
                <>
                  <line x1={x(plateauDay).toFixed(1)} y1="20" x2={x(plateauDay).toFixed(1)} y2={baseY.toFixed(1)} stroke="#E5853C" strokeWidth="1.5" strokeDasharray="3 4" />
                  <text x={Number(x(plateauDay).toFixed(1)) + 5} y="34" style={{ fontFamily: 'JetBrains Mono', fontSize: '9.5px', fill: '#C77A2E', fontWeight: 700 }}>J{plateauDay + 1}</text>
                </>
              )}

              <circle cx={x(29).toFixed(1)} cy={y(points[29]).toFixed(1)} r="4" fill="#E5853C" stroke="#fff" strokeWidth="2" />

              {[0, 14, 29].map(i => (
                <text key={i} x={x(i).toFixed(1)} y={(baseY + 22).toFixed(1)} textAnchor={i === 0 ? 'start' : i === 29 ? 'end' : 'middle'} style={{ fontFamily: 'JetBrains Mono', fontSize: '9.5px', fill: '#B0A89D' }}>
                  J{i + 1}
                </text>
              ))}
            </svg>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
            {[
              { icon: 'ph-paper-plane-tilt', label: 'Vol. jour 1', value: `${startVol}`, sub: 'emails/j' },
              { icon: 'ph-flag-checkered', label: 'Plafond atteint', value: plateauDay >= 0 ? `J ${plateauDay + 1}` : '> J30', sub: `à ${maxVol}/j` },
              { icon: 'ph-arrow-fat-line-up', label: 'Maximum', value: `${maxVol}`, sub: 'emails/j' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '13px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
                <i className={`ph ${s.icon}`} style={{ fontSize: '20px', color: '#E5853C', display: 'block', marginBottom: '10px' }} />
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#A89F94', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '22px', color: '#241F1B', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', color: '#C9C1B4' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FDF8F3', border: '1px solid #F0E6D6', borderRadius: '13px', padding: '14px 16px', display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
            <i className="ph ph-info" style={{ fontSize: '17px', color: '#C09A6B', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12.5px', color: '#8A7A68', lineHeight: 1.55 }}>
              L&apos;algorithme introduit des délais aléatoires entre les envois (2–18 min) et réduit automatiquement le volume la nuit (22h–8h) pour reproduire un comportement humain naturel.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
