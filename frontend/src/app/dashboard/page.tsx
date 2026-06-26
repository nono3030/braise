import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function Dashboard() {
  // Fetch real data
  const today = new Date(); today.setHours(0,0,0,0);
  const [
    { count: accountCount },
    { count: todayCount },
    { count: spamCount },
    { count: inboxCount },
    { count: resolvedCount },
    { data: recentInteractions },
  ] = await Promise.all([
    supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('status_detected', 'Spam'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('status_detected', 'Inbox'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).neq('status_detected', 'pending'),
    supabaseAdmin.from('interactions').select('sender_id, receiver_id, status_detected, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const inboxRate = resolvedCount ? Math.round(((inboxCount ?? 0) / resolvedCount) * 100) : 0;
  void inboxRate; // used for future stats
  const score = 94; // static for now — will be derived from interactions
  const circ30 = 2 * Math.PI * 30;
  const scoreDash = `${(score / 100) * circ30} ${circ30}`;

  // Deliverability chart — mock data going from 72 to 94 over 30 days
  const delivPoints = Array.from({ length: 30 }, (_, i) => Math.min(72 + i * 0.73 + Math.sin(i) * 2, 97));
  const gDelivW = 680, gDelivH = 240, gPL = 14, gPR = 14, gPT = 16, gPB = 40;
  const iw = gDelivW - gPL - gPR, ih = gDelivH - gPT - gPB;
  const delivX = (i: number) => gPL + (i / 29) * iw;
  const delivY = (v: number) => gPT + ih - ((v - 60) / 40) * ih;
  let delivLine = '', delivArea = '';
  delivPoints.forEach((v, i) => {
    const x = delivX(i).toFixed(1), y = delivY(v).toFixed(1);
    delivLine += (i ? ` L ${x} ${y}` : `M ${x} ${y}`);
  });
  const lastX = delivX(29), lastY = delivY(delivPoints[29]);
  delivArea = delivLine + ` L ${delivX(29).toFixed(1)} ${(gDelivH - gPB).toFixed(1)} L ${gPL} ${(gDelivH - gPB).toFixed(1)} Z`;

  // Donut
  const circ54 = 2 * Math.PI * 54;
  const donut = [
    { color: '#E5853C', pct: 0.86, label: 'Boîte principale', pctLabel: '86%' },
    { color: '#E15B47', pct: 0.03, label: 'Spam', pctLabel: '3%' },
    { color: '#ECE7E0', pct: 0.11, label: 'Autre', pctLabel: '11%' },
  ];
  let offsetAcc = 0;
  const donutSegs = donut.map(s => {
    const dash = `${s.pct * circ54} ${circ54}`;
    const offset = -offsetAcc;
    offsetAcc += s.pct * circ54;
    return { ...s, dash, offset: offset.toFixed(1) };
  });

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>Tableau de bord</h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>Performance de délivrabilité en temps réel.</p>
      </header>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Score ring */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
            <svg viewBox="0 0 74 74" width="74" height="74">
              <circle cx="37" cy="37" r="30" fill="none" stroke="#F1ECE4" strokeWidth="8" />
              <circle cx="37" cy="37" r="30" fill="none" stroke="#2FA572" strokeWidth="8" strokeLinecap="round" strokeDasharray={scoreDash} transform="rotate(-90 37 37)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '18px', color: '#241F1B' }}>{score}%</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '5px' }}>Score de délivrabilité</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#1E7A52', background: '#EAF6EF', padding: '3px 8px', borderRadius: '999px' }}>
              <i className="ph ph-trend-up" style={{ fontSize: '13px' }} />+7 pts / 30 j
            </div>
          </div>
        </div>

        {/* Emails */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Emails envoyés · 30 j</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>{(todayCount ?? 0).toLocaleString('fr-FR')}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#1E7A52', marginTop: '8px' }}>
            <i className="ph ph-arrow-up-right" style={{ fontSize: '13px' }} />+18% vs. mois préc.
          </div>
        </div>

        {/* Jour */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Jour de chauffe</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>18</div>
          <div style={{ height: '6px', background: '#F1ECE4', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', background: '#E5853C', borderRadius: '999px' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#A89F94', marginTop: '7px' }}>Montée en charge · 30 j</div>
        </div>

        {/* Spam */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Atterrissage en spam</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>{spamCount ?? 0}%</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#1E7A52', marginTop: '8px' }}>
            <i className="ph ph-trend-down" style={{ fontSize: '13px' }} />-9 pts / 30 j
          </div>
        </div>
      </div>

      {/* Chart + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Deliverability line chart */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '16.5px', color: '#241F1B' }}>Délivrabilité sur 30 jours</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71' }}>
                <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: '#E5853C', display: 'inline-block' }} />% en boîte principale
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71' }}>
                <span style={{ width: '14px', height: 0, borderTop: '2px dashed #C9C1B4', display: 'block' }} />Objectif 90%
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${gDelivW} ${gDelivH}`} width="100%" style={{ display: 'block', height: 'auto', marginTop: '10px' }}>
            <defs>
              <linearGradient id="gradDeliv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E5853C" stopOpacity="0.18" />
                <stop offset="1" stopColor="#E5853C" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="14" y1="16" x2="666" y2="16" stroke="#F4EFE7" strokeWidth="1" />
            <line x1="14" y1="104" x2="666" y2="104" stroke="#F4EFE7" strokeWidth="1" />
            <line x1="14" y1="192" x2="666" y2="192" stroke="#F4EFE7" strokeWidth="1" />
            <line x1="14" y1="60" x2="666" y2="60" stroke="#D8CFC2" strokeWidth="1.5" strokeDasharray="4 5" />
            <path d={delivArea} fill="url(#gradDeliv)" />
            <path d={delivLine} fill="none" stroke="#E5853C" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastX} cy={lastY} r="4.5" fill="#E5853C" stroke="#fff" strokeWidth="2.5" />
            <text x="14" y="232" style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '11px', fill: '#B0A89D' }}>il y a 30 j</text>
            <text x="340" y="232" textAnchor="middle" style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '11px', fill: '#B0A89D' }}>il y a 15 j</text>
            <text x="666" y="232" textAnchor="end" style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '11px', fill: '#B0A89D' }}>aujourd&apos;hui</text>
          </svg>
        </div>

        {/* Donut */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '16.5px', color: '#241F1B' }}>Répartition des emails</h3>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12.5px', color: '#9A9085' }}>Où atterrissent vos envois.</p>
          <div style={{ position: 'relative', width: '150px', height: '150px', margin: '6px auto 18px' }}>
            <svg viewBox="0 0 140 140" width="150" height="150">
              <g transform="rotate(-90 70 70)">
                {donutSegs.map((seg, i) => (
                  <circle key={i} cx="70" cy="70" r="54" fill="none" stroke={seg.color} strokeWidth="17" strokeDasharray={seg.dash} strokeDashoffset={seg.offset} />
                ))}
              </g>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '26px', color: '#241F1B', letterSpacing: '-0.02em' }}>86%</div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', color: '#9A9085' }}>en boîte</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {donutSegs.map((seg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: seg.color, display: 'block' }} />
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#4A433C' }}>{seg.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: '#2C2824' }}>{seg.pctLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '16.5px', color: '#241F1B' }}>Activité récente</h3>
          <button style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#C77A2E', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            Tout voir <i className="ph ph-arrow-right" style={{ fontSize: '13px' }} />
          </button>
        </div>
        {(!recentInteractions || recentInteractions.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13.5px', color: '#B0A89D' }}>
            <i className="ph ph-clock-clockwise" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', color: '#DDD3C5' }} />
            Aucune activité récente. Les interactions apparaîtront ici une fois le warm-up démarré.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Expéditeur','Destinataire','Statut','Quand'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 3 ? 'right' : 'left', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B0A89D', paddingBottom: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInteractions.map((row, i) => {
                const badgeColor = row.status_detected === 'Inbox'
                  ? { bg: '#EAF6EF', color: '#1E7A52', dot: '#2FA572' }
                  : row.status_detected === 'Spam'
                  ? { bg: '#FDECEA', color: '#C0392B', dot: '#E15B47' }
                  : { bg: '#F4EFE7', color: '#857C71', dot: '#C9C1B4' };
                return (
                  <tr key={i} style={{ borderTop: '1px solid #F4EFE7' }}>
                    <td style={{ padding: '13px 0', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#2C2824' }}>{String(row.sender_id).slice(0,8)}…</td>
                    <td style={{ padding: '13px 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13px', color: '#6B635A' }}>{String(row.receiver_id).slice(0,8)}…</td>
                    <td style={{ padding: '13px 0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: badgeColor.bg, color: badgeColor.color, borderRadius: '999px', padding: '3px 9px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeColor.dot, display: 'block' }} />
                        {row.status_detected}
                      </span>
                    </td>
                    <td style={{ padding: '13px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '12.5px', color: '#A89F94' }}>
                      {new Date(row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
