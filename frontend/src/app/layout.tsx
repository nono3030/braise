import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { createSupabaseServer } from '@/lib/supabase-server';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Braise — Email Warm-up',
  description: "SaaS de Warm-up d'emails P2P",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = !user;

  return (
    <html lang="fr" className={`${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
      </head>
      <body>
        {isAuthPage ? (
          children
        ) : (
          <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: '#FAF7F2' }}>
            <Sidebar userEmail={user.email ?? ''} />
            <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
              <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '30px 38px 64px' }}>
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
