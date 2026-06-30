export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function Home() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'vous';

  const userId = user?.id;
  const [{ count: boxCount }, { data: wsRow }] = await Promise.all([
    supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('user_id', userId ?? ''),
    supabaseAdmin.from('warmup_settings').select('id').eq('user_id', userId ?? '').limit(1).single(),
  ]);

  const hasBoxes    = (boxCount ?? 0) > 0;
  const hasSettings = !!wsRow;
  const isActive    = hasBoxes && hasSettings;

  function StepDone({ label }: { label: string }) {
    return (
      <div style={{ background: '#EAF6EF', border: '1px solid #CDE9D9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
          <i className="ph ph-check-circle" style={{ fontSize: '24px', color: '#2FA572' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2FA572' }}>Terminé</span>
        </div>
        <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#1E4634', lineHeight: 1.3, flex: 1 }}>{label}</div>
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', width: '100%', background: '#fff', border: '1px solid #BFE3CF', color: '#1E7A52', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px' }}>
          <i className="ph ph-check" style={{ fontSize: '16px' }} />Fait
        </div>
      </div>
    );
  }

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>
          Bon retour, {firstName}
        </h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>
          Voici où en est votre chauffe aujourd&apos;hui.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>

        {/* Step 1 — Email vérifié (toujours fait si connecté) */}
        <StepDone label={'Vérifiez votre\nadresse email'.replace('\n', String.fromCharCode(10))} />

        {/* Step 2 — Boîte email */}
        {hasBoxes ? (
          <div style={{ background: '#EAF6EF', border: '1px solid #CDE9D9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <i className="ph ph-check-circle" style={{ fontSize: '24px', color: '#2FA572' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2FA572' }}>Terminé</span>
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#1E4634', lineHeight: 1.3, flex: 1 }}>
              {boxCount} boîte{(boxCount ?? 0) > 1 ? 's' : ''} connectée{(boxCount ?? 0) > 1 ? 's' : ''}
            </div>
            <Link href="/connect" style={{ marginTop: '14px', width: '100%', background: '#fff', border: '1px solid #BFE3CF', color: '#1E7A52', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxSizing: 'border-box' }}>
              <i className="ph ph-plus" style={{ fontSize: '16px' }} />Ajouter une autre boîte
            </Link>
          </div>
        ) : (
          <div style={{ background: '#FDF1E5', border: '1px solid #F4D9BC', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E5853C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px' }}>2</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B5611F' }}>À faire</span>
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#6E3E14', lineHeight: 1.3, flex: 1 }}>Connectez votre<br />boîte email</div>
            <Link href="/connect" style={{ marginTop: '14px', width: '100%', background: '#E5853C', border: 'none', color: '#fff', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', boxShadow: '0 2px 6px rgba(207,118,46,0.3)', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Connecter ma boîte
            </Link>
          </div>
        )}

        {/* Step 3 — Configuration chauffe */}
        {hasSettings ? (
          <div style={{ background: '#EAF6EF', border: '1px solid #CDE9D9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <i className="ph ph-check-circle" style={{ fontSize: '24px', color: '#2FA572' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2FA572' }}>Terminé</span>
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#1E4634', lineHeight: 1.3, flex: 1 }}>Chauffe<br />configurée</div>
            <Link href="/warmup" style={{ marginTop: '14px', width: '100%', background: '#fff', border: '1px solid #BFE3CF', color: '#1E7A52', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Modifier les paramètres
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F1ECE4', color: '#A89F94', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px' }}>3</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B0A89D' }}>En attente</span>
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#2C2824', lineHeight: 1.3, flex: 1 }}>Configurez<br />la chauffe</div>
            <Link href="/warmup" style={{ marginTop: '14px', width: '100%', background: '#fff', border: '1px solid #E0DACE', color: '#3A332C', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Définir les paramètres
            </Link>
          </div>
        )}

        {/* Step 4 — Lancer la chauffe */}
        {isActive ? (
          <div style={{ background: '#EAF6EF', border: '1px solid #CDE9D9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <i className="ph ph-check-circle" style={{ fontSize: '24px', color: '#2FA572' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2FA572' }}>Active</span>
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#1E4634', lineHeight: 1.3, flex: 1 }}>Chauffe<br />en cours</div>
            <Link href="/dashboard" style={{ marginTop: '14px', width: '100%', background: '#2FA572', border: 'none', color: '#fff', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxSizing: 'border-box' }}>
              <i className="ph ph-chart-line-up" style={{ fontSize: '16px' }} />Voir le tableau de bord
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '188px', opacity: 0.72 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '13px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F1ECE4', color: '#A89F94', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px' }}>4</span>
              <i className="ph ph-lock-simple" style={{ fontSize: '15px', color: '#BBB2A6' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15.5px', color: '#2C2824', lineHeight: 1.3, flex: 1 }}>Lancez<br />la chauffe</div>
            <button disabled style={{ marginTop: '14px', width: '100%', background: '#F4EFE7', border: '1px solid transparent', color: '#B0A89D', borderRadius: '11px', padding: '11px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', cursor: 'not-allowed' }}>
              Démarrer
            </button>
          </div>
        )}
      </div>

      {/* Concept + Support */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '26px 28px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#C09A6B', marginBottom: '7px' }}>En coulisses</div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '19px', color: '#241F1B', letterSpacing: '-0.01em' }}>La chauffe progressive, expliquée</h3>
            </div>
            <svg viewBox="0 0 120 46" width="120" height="46" style={{ flexShrink: 0 }}>
              <polyline points="4,40 24,36 44,30 64,22 84,13 104,7 116,6" fill="none" stroke="#E5853C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="116" cy="6" r="3.5" fill="#E5853C" />
            </svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { icon: 'ph-shuffle', title: '1 · Matchmaking', desc: "Votre boîte est associée à un réseau de comptes réels qui s'échangent des emails de façon aléatoire." },
              { icon: 'ph-paper-plane-tilt', title: '2 · Envoi naturel', desc: "Chaque jour, un volume croissant d'emails au contenu généré est envoyé, espacé dans le temps." },
              { icon: 'ph-lifebuoy', title: '3 · Sauvetage', desc: "Un email tombé en spam est déplacé en boîte principale puis marqué comme lu, automatiquement." },
            ].map(c => (
              <div key={c.title}>
                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#FDF1E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <i className={`ph ${c.icon}`} style={{ fontSize: '21px', color: '#E5853C' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '14.5px', color: '#2C2824', marginBottom: '6px' }}>{c.title}</div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13px', color: '#857C71', lineHeight: 1.55 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '26px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '17px', color: '#241F1B' }}>Besoin d&apos;aide ?</h3>
            <i className="ph ph-question" style={{ fontSize: '21px', color: '#C9C1B4' }} />
          </div>
          <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13.5px', color: '#857C71', lineHeight: 1.55, flex: 1 }}>
            Une question sur la délivrabilité ou la configuration ? Notre équipe répond en moins de 2 h.
          </p>
          <button style={{ width: '100%', background: '#241F1B', border: 'none', color: '#fff', borderRadius: '11px', padding: '12px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', marginBottom: '9px' }}>
            Contacter le support
          </button>
          <button style={{ width: '100%', background: 'transparent', border: 'none', color: '#857C71', borderRadius: '11px', padding: '8px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            Voir la documentation <i className="ph ph-arrow-up-right" style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>
    </>
  );
}
