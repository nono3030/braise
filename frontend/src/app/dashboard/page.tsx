export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function Dashboard() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: accountCount },
    { count: emailCount30d },
    { count: spamCount },
    { count: inboxCount },
    { count: notFoundCount },
    { count: resolvedCount },
    { data: recentInteractions },
    { data: interactions30d },
    { data: firstAccount },
    { count: rescuedCount },
    { count: flaggedCount },
    { count: replyCount },
  ] = await Promise.all([
    supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()).neq('status_detected', 'pending'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('status_detected', 'Spam'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('status_detected', 'Inbox'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('status_detected', 'NotFound'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).neq('status_detected', 'pending'),
    supabaseAdmin.from('interactions').select('sender:accounts!sender_id(email), receiver:accounts!receiver_id(email), status_detected, created_at').neq('status_detected', 'pending').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('interactions').select('status_detected, created_at').gte('created_at', thirtyDaysAgo.toISOString()).neq('status_detected', 'pending'),
    supabaseAdmin.from('accounts').select('created_at').order('created_at', { ascending: true }).limit(1),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).not('source_folder', 'ilike', '%inbox%').not('source_folder', 'is', null).neq('status_detected', 'pending'),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('was_flagged', true),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).eq('reply_sent', true),
  ]);

  // Score de délivrabilité = % inbox sur toutes les interactions résolues
  const resolved = resolvedCount ?? 0;
  const inbox = inboxCount ?? 0;
  const spam = spamCount ?? 0;
  const notFound = notFoundCount ?? 0;
  const score = resolved > 0 ? Math.round((inbox / resolved) * 100) : 0;
  const spamRate = resolved > 0 ? Math.round((spam / resolved) * 100) : 0;

  // Jour de chauffe = jours depuis la création du premier compte
  const warmupDay = firstAccount?.[0]?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(firstAccount[0].created_at).getTime()) / 86_400_000) + 1)
    : 1;
  const warmupProgress = Math.min(warmupDay / 30, 1);

  // Graphe délivrabilité : taux inbox par jour sur 30 jours
  const dailyMap: Record<string, { inbox: number; total: number }> = {};
  interactions30d?.forEach(row => {
    const day = row.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { inbox: 0, total: 0 };
    dailyMap[day].total++;
    if (row.status_detected === 'Inbox') dailyMap[day].inbox++;
  });

  let lastRate = score; // départ = score global
  const delivPoints: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = dailyMap[key];
    if (day && day.total > 0) lastRate = Math.round((day.inbox / day.total) * 100);
    delivPoints.push(lastRate);
  }

  // Chemin SVG du graphe
  const gW = 680, gH = 240, gPL = 14, gPR = 14, gPT = 16, gPB = 40;
  const iw = gW - gPL - gPR, ih = gH - gPT - gPB;
  const gX = (i: number) => gPL + (i / 29) * iw;
  const gY = (v: number) => gPT + ih - (v / 100) * ih;
  let delivLine = '';
  delivPoints.forEach((v, i) => {
    delivLine += (i ? ` L ${gX(i).toFixed(1)} ${gY(v).toFixed(1)}` : `M ${gX(i).toFixed(1)} ${gY(v).toFixed(1)}`);
  });
  const delivArea = delivLine + ` L ${gX(29).toFixed(1)} ${(gPT + ih).toFixed(1)} L ${gPL} ${(gPT + ih).toFixed(1)} Z`;
  const lastX = gX(29), lastY = gY(delivPoints[29]);
  const goalY = gY(90); // ligne objectif 90%

  // Donut avec vrais ratios
  const circ54 = 2 * Math.PI * 54;
  const total30 = (emailCount30d ?? 0) || 1; // évite /0
  const donutData = [
    { color: '#E5853C', count: inbox, label: 'Boîte principale' },
    { color: '#E15B47', count: spam,  label: 'Spam' },
    { color: '#ECE7E0', count: notFound, label: 'Non trouvé' },
  ];
  let offsetAcc = 0;
  const donutSegs = donutData.map(s => {
    const pct = resolved > 0 ? s.count / resolved : 0;
    const dash = `${pct * circ54} ${circ54}`;
    const offset = -offsetAcc;
    offsetAcc += pct * circ54;
    return { ...s, pct, dash, offset: offset.toFixed(1), pctLabel: resolved > 0 ? `${Math.round(pct * 100)}%` : '—' };
  });

  // Ring score
  const circ30 = 2 * Math.PI * 30;
  const scoreDash = `${(score / 100) * circ30} ${circ30}`;
  const ringColor = score >= 85 ? '#2FA572' : score >= 60 ? '#E5853C' : '#E15B47';

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>Tableau de bord</h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>Performance de délivrabilité · {accountCount ?? 0} boîte{(accountCount ?? 0) > 1 ? 's' : ''} connectée{(accountCount ?? 0) > 1 ? 's' : ''}</p>
      </header>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Score ring */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
            <svg viewBox="0 0 74 74" width="74" height="74">
              <circle cx="37" cy="37" r="30" fill="none" stroke="#F1ECE4" strokeWidth="8" />
              <circle cx="37" cy="37" r="30" fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={scoreDash} transform="rotate(-90 37 37)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '18px', color: '#241F1B' }}>
              {resolved > 0 ? `${score}%` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '5px' }}>Score de délivrabilité</div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#A89F94' }}>
              Basé sur {resolved} interaction{resolved > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Emails 30j */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Emails envoyés · 30 j</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>
            {(emailCount30d ?? 0).toLocaleString('fr-FR')}
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94', marginTop: '8px' }}>
            {inbox} inbox · {spam} spam · {notFound} introuvable{notFound > 1 ? 's' : ''}
          </div>
        </div>

        {/* Jour de chauffe */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Jour de chauffe</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>{warmupDay}</div>
          <div style={{ height: '6px', background: '#F1ECE4', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.round(warmupProgress * 100)}%`, height: '100%', background: '#E5853C', borderRadius: '999px' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#A89F94', marginTop: '7px' }}>
            Montée en charge · 30 j
          </div>
        </div>

        {/* Spam rate */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', color: '#857C71', marginBottom: '10px' }}>Atterrissage en spam</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '30px', color: '#241F1B', letterSpacing: '-0.02em' }}>
            {resolved > 0 ? `${spamRate}%` : '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94', marginTop: '8px' }}>
            {spam} email{spam > 1 ? 's' : ''} sur {resolved} résolu{resolved > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Signaux d'engagement */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '16px' }}>
        {[
          { icon: 'ph-arrow-u-up-left', label: 'Sortis du spam / onglets', value: rescuedCount ?? 0, color: '#2FA572', bg: '#EAF6EF', desc: 'emails déplacés vers la boîte principale' },
          { icon: 'ph-star',            label: 'Marqués importants',        value: flaggedCount ?? 0, color: '#E5853C', bg: '#FDF1E5', desc: 'signal fort envoyé à Gmail' },
          { icon: 'ph-arrow-bend-up-left', label: 'Threads créés',         value: replyCount ?? 0,   color: '#6E84D6', bg: '#ECEFFE', desc: 'réponses générées et envoyées' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ph ${s.icon}`} style={{ fontSize: '22px', color: s.color }} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '24px', color: '#241F1B', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', color: '#B0A89D', marginTop: '3px' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Graphe délivrabilité */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '16.5px', color: '#241F1B' }}>Délivrabilité sur 30 jours</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71' }}>
                <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: '#E5853C', display: 'inline-block' }} />% inbox
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71' }}>
                <span style={{ width: '14px', height: 0, borderTop: '2px dashed #C9C1B4', display: 'block' }} />Objectif 90%
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${gW} ${gH}`} width="100%" style={{ display: 'block', height: 'auto', marginTop: '10px' }}>
            <defs>
              <linearGradient id="gradDeliv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E5853C" stopOpacity="0.18" />
                <stop offset="1" stopColor="#E5853C" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Gridlines 0/50/100 */}
            <line x1={gPL} y1={gY(100).toFixed(1)} x2={gW - gPR} y2={gY(100).toFixed(1)} stroke="#F4EFE7" strokeWidth="1" />
            <line x1={gPL} y1={gY(50).toFixed(1)}  x2={gW - gPR} y2={gY(50).toFixed(1)}  stroke="#F4EFE7" strokeWidth="1" />
            <line x1={gPL} y1={gY(0).toFixed(1)}   x2={gW - gPR} y2={gY(0).toFixed(1)}   stroke="#F4EFE7" strokeWidth="1" />
            {/* Objectif 90% */}
            <line x1={gPL} y1={goalY.toFixed(1)} x2={gW - gPR} y2={goalY.toFixed(1)} stroke="#D8CFC2" strokeWidth="1.5" strokeDasharray="4 5" />
            <text x={gW - gPR + 4} y={goalY + 4} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#C9C1B4' }}>90%</text>
            {/* Labels Y */}
            <text x={gPL - 2} y={gY(100) + 4} textAnchor="end" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#C9C1B4' }}>100</text>
            <text x={gPL - 2} y={gY(50) + 4}  textAnchor="end" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#C9C1B4' }}>50</text>
            <text x={gPL - 2} y={gY(0) + 4}   textAnchor="end" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#C9C1B4' }}>0</text>
            {/* Area + line */}
            <path d={delivArea} fill="url(#gradDeliv)" />
            <path d={delivLine} fill="none" stroke="#E5853C" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastX} cy={lastY} r="4.5" fill="#E5853C" stroke="#fff" strokeWidth="2.5" />
            {/* X labels */}
            <text x={gPL}       y={gH - 6} style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '10px', fill: '#B0A89D' }}>il y a 30 j</text>
            <text x={gW / 2}    y={gH - 6} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '10px', fill: '#B0A89D' }}>il y a 15 j</text>
            <text x={gW - gPR}  y={gH - 6} textAnchor="end"    style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '10px', fill: '#B0A89D' }}>aujourd&apos;hui</text>
          </svg>
        </div>

        {/* Donut */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '16.5px', color: '#241F1B' }}>Répartition des emails</h3>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12.5px', color: '#9A9085' }}>Où atterrissent vos envois.</p>
          <div style={{ position: 'relative', width: '150px', height: '150px', margin: '6px auto 18px' }}>
            <svg viewBox="0 0 140 140" width="150" height="150">
              <g transform="rotate(-90 70 70)">
                {resolved === 0 ? (
                  <circle cx="70" cy="70" r="54" fill="none" stroke="#F1ECE4" strokeWidth="17" />
                ) : donutSegs.map((seg, i) => (
                  <circle key={i} cx="70" cy="70" r="54" fill="none" stroke={seg.color} strokeWidth="17"
                    strokeDasharray={seg.dash} strokeDashoffset={seg.offset} />
                ))}
              </g>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '26px', color: '#241F1B', letterSpacing: '-0.02em' }}>
                {resolved > 0 ? `${score}%` : '—'}
              </div>
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
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '11.5px', color: '#B0A89D' }}>{resolved} interaction{resolved > 1 ? 's' : ''} au total</span>
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
                {['Expéditeur', 'Destinataire', 'Statut', 'Quand'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 3 ? 'right' : 'left', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B0A89D', paddingBottom: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInteractions.map((row, i) => {
                const badge = row.status_detected === 'Inbox'
                  ? { bg: '#EAF6EF', color: '#1E7A52', dot: '#2FA572' }
                  : row.status_detected === 'Spam'
                  ? { bg: '#FDECEA', color: '#C0392B', dot: '#E15B47' }
                  : { bg: '#F4EFE7', color: '#857C71', dot: '#C9C1B4' };
                const when = new Date(row.created_at);
                const isToday = new Date().toDateString() === when.toDateString();
                const whenLabel = isToday
                  ? when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : when.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                return (
                  <tr key={i} style={{ borderTop: '1px solid #F4EFE7' }}>
                    <td style={{ padding: '13px 0', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#2C2824' }}>
                      {(row.sender as any)?.email ?? '—'}
                    </td>
                    <td style={{ padding: '13px 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13px', color: '#6B635A' }}>
                      {(row.receiver as any)?.email ?? '—'}
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: badge.bg, color: badge.color, borderRadius: '999px', padding: '3px 9px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badge.dot, display: 'block' }} />
                        {row.status_detected}
                      </span>
                    </td>
                    <td style={{ padding: '13px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '12.5px', color: '#A89F94' }}>
                      {whenLabel}
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
