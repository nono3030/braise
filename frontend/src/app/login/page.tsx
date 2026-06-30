'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = mode === 'signin'
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '36px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#E5853C', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', paddingBottom: '10px', boxShadow: '0 4px 12px rgba(207,118,46,0.35)' }}>
                        <span style={{ width: '5px', height: '9px', background: '#fff', borderRadius: '2px', opacity: 0.65 }} />
                        <span style={{ width: '5px', height: '14px', background: '#fff', borderRadius: '2px', opacity: 0.82 }} />
                        <span style={{ width: '5px', height: '20px', background: '#fff', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em', color: '#241F1B' }}>Braise</span>
                </div>

                {/* Card */}
                <div style={{ background: '#fff', border: '1px solid #ECE7E0', borderRadius: '20px', padding: '36px', boxShadow: '0 2px 8px rgba(40,28,16,0.06)' }}>
                    <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '22px', color: '#241F1B', textAlign: 'center' }}>
                        {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
                    </h1>
                    <p style={{ margin: '0 0 28px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13.5px', color: '#A89F94', textAlign: 'center' }}>
                        {mode === 'signin' ? 'Accédez à votre espace Braise' : 'Commencez à réchauffer vos emails'}
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>
                                Adresse email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="votre@email.com"
                                required
                                style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '12px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '22px' }}>
                            <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: '#3A332C', marginBottom: '7px' }}>
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{ width: '100%', background: '#FAF7F2', border: '1px solid #E6E1D9', borderRadius: '11px', padding: '12px 14px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '14px', color: '#2C2824', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {error && (
                            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13px', color: '#B91C1C' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', background: loading ? '#C9956A' : '#E5853C', border: 'none', color: '#fff', borderRadius: '12px', padding: '13px', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(207,118,46,0.3)', transition: 'background 0.15s' }}
                        >
                            {loading ? 'Chargement…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '13.5px', color: '#A89F94' }}>
                        {mode === 'signin' ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
                        <button
                            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#E5853C', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', padding: 0 }}
                        >
                            {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
