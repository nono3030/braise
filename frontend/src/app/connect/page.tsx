import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';
import { encrypt } from '@/lib/encryption';

export default function Connect() {
  async function connectAccount(formData: FormData) {
    'use server';

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const theme = (formData.get('theme') as string) || null;

    if (!email || !password) return;

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const encryptedPassword = encrypt(password);

    const { error } = await supabaseAdmin
      .from('accounts')
      .insert({ email, app_password_encrypted: encryptedPassword, theme, user_id: user.id });

    if (error) throw new Error(error.message);

    redirect('/dashboard');
  }

  return (
    <>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '27px', letterSpacing: '-0.02em', color: '#241F1B' }}>Connexion email</h1>
        <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14.5px', color: '#857C71' }}>Ajoutez une boîte email à réchauffer via mot de passe d&apos;application.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Form */}
        <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '16px', padding: '30px 32px', boxShadow: '0 1px 2px rgba(40,28,16,0.04)' }}>
          <h2 style={{ margin: '0 0 22px', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '18px', color: '#241F1B' }}>Paramètres de connexion</h2>

          <form action={connectAccount}>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>
                Adresse email
              </label>
              <input
                type="email"
                name="email"
                placeholder="votre.adresse@exemple.com"
                required
                style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '11px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* First name + Last name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>Prénom</label>
                <input
                  type="text"
                  name="first_name"
                  placeholder="Jean"
                  style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '11px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>Nom</label>
                <input
                  type="text"
                  name="last_name"
                  placeholder="Dupont"
                  style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '11px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Provider */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>Fournisseur</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: 'Gmail', icon: 'ph-google-logo' },
                  { label: 'Outlook', icon: 'ph-microsoft-outlook-logo' },
                  { label: 'Autre', icon: 'ph-envelope' },
                ].map((provider, idx) => (
                  <button
                    key={provider.label}
                    type="button"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '10px 14px',
                      borderRadius: '11px',
                      fontFamily: 'var(--font-jakarta)',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      background: idx === 0 ? '#FBEEE0' : '#FAF7F2',
                      border: idx === 0 ? '1px solid #F4D9BC' : '1px solid #E6E1D9',
                      color: idx === 0 ? '#B5611F' : '#6B635A',
                    }}
                  >
                    <i className={`ph ${provider.icon}`} style={{ fontSize: '16px' }} />
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thématique */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>
                Thématique <span style={{ color: '#A89F94', fontWeight: 500 }}>(optionnel)</span>
              </label>
              <input
                type="text"
                name="theme"
                placeholder="Ex : SaaS de gestion RH, Agence SEO e-commerce, Consultant freelance…"
                style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '11px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ margin: '7px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94', lineHeight: 1.5 }}>
                L&apos;IA utilisera ce contexte pour rédiger des emails cohérents avec votre secteur.
              </p>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>
                Mot de passe d&apos;application
              </label>
              <div style={{ position: 'relative' }}>
                <i className="ph ph-key" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', color: '#A89F94' }} />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••••••••••"
                  required
                  style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '11px 14px 11px 42px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <p style={{ margin: '9px 0 0', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12px', color: '#A89F94', lineHeight: 1.5 }}>
                Générez un mot de passe d&apos;application dans les paramètres de sécurité de votre compte Gmail ou Outlook. Vos identifiants sont chiffrés AES-256 avant stockage.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                style={{ flex: 1, background: '#fff', border: '1px solid #E0DACE', color: '#3A332C', borderRadius: '11px', padding: '12px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <i className="ph ph-plugs-connected" style={{ fontSize: '16px', color: '#A89F94' }} />
                Tester la connexion
              </button>
              <button
                type="submit"
                style={{ flex: 1, background: '#E5853C', border: 'none', color: '#fff', borderRadius: '11px', padding: '12px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(207,118,46,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <i className="ph ph-plugs" style={{ fontSize: '16px' }} />
                Connecter
              </button>
            </div>
          </form>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Security card */}
          <div style={{ background: '#EAF6EF', border: '1px solid #CDE9D9', borderRadius: '16px', padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2FA572', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ph ph-shield-check" style={{ fontSize: '18px', color: '#fff' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15px', color: '#1E4634' }}>Connexion sécurisée</div>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                'Chiffrement AES-256 de vos identifiants',
                'Accès en lecture seule via IMAP',
                'Aucun accès à vos emails personnels',
                'Révocation à tout moment',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '12.5px', color: '#2A5F40', lineHeight: 1.45 }}>
                  <i className="ph ph-check-circle" style={{ fontSize: '15px', color: '#2FA572', flexShrink: 0, marginTop: '1px' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* SMTP/IMAP card */}
          <div style={{ background: '#241F1B', borderRadius: '16px', padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <i className="ph ph-detective" style={{ fontSize: '17px', color: '#C09A6B' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#C09A6B' }}>Serveurs détectés</span>
            </div>
            {[
              { label: 'SMTP', host: 'smtp.gmail.com', port: '587' },
              { label: 'IMAP', host: 'imap.gmail.com', port: '993' },
            ].map(srv => (
              <div key={srv.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '11px', color: '#8B7E72', marginBottom: '3px' }}>{srv.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '12.5px', color: '#E8DDD4' }}>{srv.host}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: '#E5853C', background: 'rgba(229,133,60,0.12)', padding: '3px 9px', borderRadius: '6px' }}>{srv.port}</span>
              </div>
            ))}
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2FA572', display: 'block', boxShadow: '0 0 6px rgba(47,165,114,0.5)' }} />
              <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: '#7A9F8A' }}>Auto-détection activée · Gmail</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
