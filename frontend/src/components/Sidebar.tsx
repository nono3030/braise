'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Accueil', icon: 'ph-house' },
  { href: '/dashboard', label: 'Tableau de bord', icon: 'ph-chart-line-up' },
  { href: '/boxes', label: 'Mes boîtes', icon: 'ph-stack' },
  { href: '/warmup', label: 'Chauffe', icon: 'ph-fire' },
  { href: '/connect', label: 'Connexion email', icon: 'ph-plugs' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const w = collapsed ? '78px' : '264px';

  return (
    <aside style={{ width: w, flexShrink: 0, background: '#fff', borderRight: '1px solid #ECE7E0', display: 'flex', flexDirection: 'column', padding: '18px 14px', transition: 'width 0.2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px 4px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
          {/* Logo */}
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#E5853C', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2.5px', paddingBottom: '9px', flexShrink: 0, boxShadow: '0 2px 6px rgba(207,118,46,0.35)' }}>
            <span style={{ width: '4px', height: '8px', background: '#fff', borderRadius: '1.5px', opacity: 0.65 }} />
            <span style={{ width: '4px', height: '12.5px', background: '#fff', borderRadius: '1.5px', opacity: 0.82 }} />
            <span style={{ width: '4px', height: '17px', background: '#fff', borderRadius: '1.5px' }} />
          </div>
          {!collapsed && <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: '#241F1B', whiteSpace: 'nowrap' }}>Braise</span>}
        </div>
        <button onClick={() => setCollapsed(c => !c)} style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', color: '#A89F94', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={collapsed ? 'ph ph-arrow-line-right' : 'ph ph-arrow-line-left'} style={{ fontSize: '18px' }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: '#FAF7F2', border: '1px solid #EFEAE2', borderRadius: '11px', padding: collapsed ? '10px 0' : '10px 12px', justifyContent: collapsed ? 'center' : undefined }}>
        <i className="ph ph-magnifying-glass" style={{ fontSize: '17px', color: '#A89F94', flexShrink: 0 }} />
        {!collapsed && <>
          <input placeholder="Rechercher…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-jakarta)', fontSize: '13px', fontWeight: 500, color: '#2C2824', minWidth: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: '#B7AEA3', background: '#fff', border: '1px solid #EAE4DB', borderRadius: '5px', padding: '2px 5px', flexShrink: 0 }}>⌘K</span>
        </>}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '18px' }}>
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', borderRadius: '11px', padding: '10px 12px', fontFamily: 'var(--font-jakarta)', fontSize: '14px', fontWeight: 600, textDecoration: 'none', background: active ? '#FBEEE0' : 'transparent', color: active ? '#B5611F' : '#6B635A', justifyContent: collapsed ? 'center' : undefined }}>
              <i className={`ph ${item.icon}`} style={{ fontSize: '20px', flexShrink: 0, color: active ? '#E5853C' : '#A89F94' }} />
              {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #EFEAE2', paddingTop: '14px', display: 'flex', alignItems: 'center', gap: '11px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'linear-gradient(135deg,#3B3530,#2C2824)', color: '#F4D9BE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta)', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>AM</div>
        {!collapsed && <div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13.5px', fontWeight: 600, color: '#2C2824', whiteSpace: 'nowrap' }}>Arnaud Mercier</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11.5px', fontWeight: 500, color: '#A89F94', whiteSpace: 'nowrap' }}>Plan Pro · 3 boîtes</div>
        </div>}
      </div>
    </aside>
  );
}
