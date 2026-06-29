import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';

export default async function Boxes() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: accounts },
    { count: emailCount30d },
    { data: interactions },
  ] = await Promise.all([
    supabaseAdmin.from('accounts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('interactions').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()).neq('status_detected', 'pending'),
    supabaseAdmin.from('interactions').select('sender_id, receiver_id, status_detected').gte('created_at', thirtyDaysAgo.toISOString()).neq('status_detected', 'pending'),
  ]);

  const activeCount = accounts?.filter(a => a.status === 'active').length ?? 0;
  const total = accounts?.length ?? 0;

  // Score par boîte : % inbox sur les interactions résolues où elle est sender ou receiver
  function scoreForAccount(accountId: string): number {
    const accountInteractions = interactions?.filter(
      r => r.sender_id === accountId || r.receiver_id === accountId
    ) ?? [];
    if (accountInteractions.length === 0) return 0;
    const inboxCount = accountInteractions.filter(r => r.status_detected === 'Inbox').length;
    return Math.round((inboxCount / accountInteractions.length) * 100);
  }

  // Score moyen global
  const resolved = interactions?.length ?? 0;
  const inboxTotal = interactions?.filter(r => r.status_detected === 'Inbox').length ?? 0;
  const avgScore = resolved > 0 ? Math.round((inboxTotal / resolved) * 100) : 0;

  const colors = ['#E5853C', '#2FA572', '#6E84D6', '#D95F8B', '#C09A6B'];
  const circ = 2 * Math.PI * 23;

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>Mes boîtes</h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>{total} boîte{total > 1 ? 's' : ''} connectée{total > 1 ? 's' : ''} au réseau Braise.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
        {accounts?.map((account, i) => {
          const initials = account.email.slice(0, 2).toUpperCase();
          const color = colors[i % colors.length];
          const score = scoreForAccount(account.id);
          const scoreDash = score > 0 ? `${(score / 100) * circ} ${circ}` : `0 ${circ}`;
          const ringColor = score >= 85 ? '#2FA572' : score >= 60 ? '#E5853C' : score > 0 ? '#E15B47' : '#E6E1D9';
          const isActive = account.status === 'active';

          return (
            <div key={account.id} style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '6px' }}>
                <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>{initials}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '14px', color: '#241F1B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.email}</div>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94' }}>Connectée</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '999px', background: isActive ? '#EAF6EF' : '#FBF3DE', color: isActive ? '#1E7A52' : '#9A7B1E', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', flexShrink: 0 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#2FA572' : '#D8A93B', display: 'block' }} />
                  {isActive ? 'Actif' : 'En pause'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', marginTop: '12px', borderTop: '1px solid #F4EFE7', borderBottom: '1px solid #F4EFE7' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                  <svg viewBox="0 0 60 60" width="60" height="60">
                    <circle cx="30" cy="30" r="23" fill="none" stroke="#F1ECE4" strokeWidth="6" />
                    <circle cx="30" cy="30" r="23" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={scoreDash} transform="rotate(-90 30 30)" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '14px', color: '#241F1B' }}>{score > 0 ? `${score}%` : '—'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#857C71' }}>Score de délivrabilité</div>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#A89F94', marginTop: '8px' }}>Limite · <b style={{ color: '#3A332C' }}>{account.max_daily_emails} emails/j</b></div>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11.5px', color: '#A89F94', marginTop: '3px' }}>Aujourd&apos;hui · <b style={{ color: '#3A332C' }}>{account.current_daily_emails} envoyés</b></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                <Link href="/dashboard" style={{ flex: 1, background: '#241F1B', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tableau de bord</Link>
                <Link href="/warmup" style={{ background: '#fff', border: '1px solid #E0DACE', color: '#3A332C', borderRadius: '10px', padding: '0 13px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                  <i className="ph ph-sliders-horizontal" style={{ fontSize: '16px' }} />
                </Link>
              </div>
            </div>
          );
        })}

        {/* Add box */}
        <Link href="/connect" style={{ background: '#FBF8F3', border: '1.5px dashed #DDD3C5', borderRadius: '16px', padding: '22px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '212px', color: '#9A9085', textDecoration: 'none' }}>
          <span style={{ width: '46px', height: '46px', borderRadius: '13px', background: '#fff', border: '1px solid #ECE7E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ph ph-plus" style={{ fontSize: '22px', color: '#E5853C' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13.5px' }}>Ajouter une boîte</span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11.5px', textAlign: 'center', maxWidth: '160px', lineHeight: 1.45 }}>Connectez une nouvelle adresse à réchauffer</span>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginTop: '16px' }}>
        {[
          { label: 'Boîtes actives', value: `${activeCount}`, sub: `/ ${total}` },
          { label: 'Score moyen du réseau', value: resolved > 0 ? `${avgScore}%` : '—', sub: '' },
          { label: 'Emails échangés · 30 j', value: `${emailCount30d ?? 0}`, sub: '' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#857C71', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '26px', color: '#241F1B' }}>
              {stat.value}
              {stat.sub && <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '14px', color: '#B0A89D' }}>{stat.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
