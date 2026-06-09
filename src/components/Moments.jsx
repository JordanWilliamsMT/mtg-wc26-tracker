import React from 'react'
import { Zap, TrendingUp } from 'lucide-react'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function momentIcon(type) {
  const icons = { eliminated: '💀', upset: '😱', advancing: '🔥', winner: '🏆', manual: '📢', goodGame: '⚽' }
  return icons[type] || '⚽'
}

function OddsTicker({ odds }) {
  if (!odds || !Object.keys(odds).length) return null

  const sorted = Object.entries(odds)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 16)

  // Duplicate for seamless loop
  const items = [...sorted, ...sorted]

  return (
    <div style={{ borderBottom:'1px solid var(--border)', background:'var(--navy-2)', overflow:'hidden', padding:'8px 0' }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ flexShrink:0, padding:'0 14px', display:'flex', alignItems:'center', gap:6, borderRight:'1px solid var(--border)' }}>
          <TrendingUp size={12} color="var(--lime)" />
          <span style={{ fontSize:10, color:'var(--lime)', fontWeight:600, letterSpacing:1, textTransform:'uppercase', whiteSpace:'nowrap' }}>Live odds</span>
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{
            display:'flex', gap:0,
            animation:`ticker ${sorted.length * 3}s linear infinite`,
            width:'max-content',
          }}>
            {items.map(([team, pct], i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'0 20px', borderRight:'1px solid var(--border)', whiteSpace:'nowrap', flexShrink:0 }}>
                <span style={{ fontSize:12, color:'var(--off-white)' }}>{team}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color:'var(--lime)' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Moments({ moments, odds }) {
  return (
    <div>
      <OddsTicker odds={odds} />

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'16px 20px 14px', borderBottom:'1px solid var(--border)' }}>
        <Zap size={14} color="var(--lime)" />
        <span style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:2, color:'var(--lime)' }}>MOMENTS</span>
      </div>

      {moments.length === 0 ? (
        <div style={{ padding:'3rem 20px', textAlign:'center', color:'var(--muted)' }}>
          <Zap size={36} strokeWidth={1} style={{ marginBottom:12, display:'block', margin:'0 auto 12px' }} />
          <p>Moments will appear here as the tournament unfolds</p>
          <p style={{ fontSize:12, marginTop:6 }}>Upsets, eliminations, advancing teams — all auto-generated with full banter</p>
        </div>
      ) : (
        <div style={{ padding:'8px 20px' }}>
          {moments.map(m => (
            <div key={m.id} className="slide-up" style={{
              display:'flex', gap:14, padding:'14px 0',
              borderBottom:'1px solid var(--border)',
            }}>
              <div style={{ fontSize:24, lineHeight:1, flexShrink:0, paddingTop:2 }}>
                {momentIcon(m.type)}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, lineHeight:1.6, color:'var(--off-white)' }}>{m.text}</p>
                <span style={{ fontSize:11, color:'var(--muted)', marginTop:4, display:'block' }}>
                  {timeAgo(m.timestamp)}
                  {m.type === 'manual' && <span style={{ marginLeft:8, background:'var(--navy-4)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 6px', fontSize:10 }}>admin</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
