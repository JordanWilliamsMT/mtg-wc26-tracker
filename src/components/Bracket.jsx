import React, { useState } from 'react'
import { GitBranch } from 'lucide-react'

const ROUNDS = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']

function getTeamForSlot(fixtures, round, slotIndex) {
  const roundFixtures = fixtures
    .filter(f => f.round?.includes(round.split(' ')[0]) ||
      (round === 'Round of 32' && f.round?.includes('32')) ||
      (round === 'Round of 16' && f.round?.includes('16')) ||
      (round === 'Quarter-finals' && f.round?.includes('Quarter')) ||
      (round === 'Semi-finals' && f.round?.includes('Semi')) ||
      (round === 'Final' && f.round?.includes('Final') && !f.round?.includes('Semi'))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const match = roundFixtures[Math.floor(slotIndex / 2)]
  if (!match) return null

  const isHome = slotIndex % 2 === 0
  const finished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN'
  const won = finished && (
    isHome ? match.homeScore > match.awayScore : match.awayScore > match.homeScore
  )
  const lost = finished && (
    isHome ? match.homeScore < match.awayScore : match.awayScore < match.homeScore
  )

  return {
    name: isHome ? match.homeTeam : match.awayTeam,
    score: isHome ? match.homeScore : match.awayScore,
    oppScore: isHome ? match.awayScore : match.homeScore,
    won,
    lost,
    finished,
    tbd: isHome ? match.homeTeam === 'TBD' : match.awayTeam === 'TBD',
  }
}

function TeamSlot({ team }) {
  if (!team) return (
    <div style={{ padding:'8px 12px', background:'var(--navy-4)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', fontSize:12, color:'var(--muted)' }}>
      TBD
    </div>
  )
  return (
    <div style={{
      padding:'8px 12px', borderRadius:'var(--radius-sm)',
      background: team.won ? 'rgba(179,240,0,0.08)' : team.lost ? 'rgba(255,68,68,0.06)' : 'var(--navy-4)',
      border: `1px solid ${team.won ? 'var(--border-lime)' : team.lost ? 'rgba(255,68,68,0.2)' : 'var(--border)'}`,
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
      minWidth: 160,
    }}>
      <span style={{
        fontSize:12, fontWeight: team.won ? 600 : 400,
        color: team.won ? 'var(--white)' : team.lost ? 'var(--muted)' : 'var(--off-white)',
        textDecoration: team.lost ? 'line-through' : 'none',
      }}>
        {team.name || 'TBD'}
      </span>
      {team.finished && team.score !== null && (
        <span style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:600, color: team.won ? 'var(--lime)' : 'var(--muted)' }}>
          {team.score}
        </span>
      )}
    </div>
  )
}

function MatchPair({ homeTeam, awayTeam }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <TeamSlot team={homeTeam} />
      <TeamSlot team={awayTeam} />
    </div>
  )
}

export function Bracket({ fixtures }) {
  // Filter to knockout rounds only
  const knockoutFixtures = fixtures.filter(f =>
    !f.round?.toLowerCase().includes('group')
  )

  const slotsPerRound = { 'Round of 32': 32, 'Round of 16': 16, 'Quarter-finals': 8, 'Semi-finals': 4, 'Final': 2 }

  const [activeRound, setActiveRound] = useState('Round of 32')

  // Find which rounds have data
  const availableRounds = ROUNDS.filter(r => {
    const count = knockoutFixtures.filter(f =>
      f.round?.includes(r.split(' ')[0]) ||
      (r === 'Round of 32' && f.round?.includes('32')) ||
      (r === 'Round of 16' && f.round?.includes('16')) ||
      (r === 'Quarter-finals' && f.round?.includes('Quarter')) ||
      (r === 'Semi-finals' && f.round?.includes('Semi')) ||
      (r === 'Final' && f.round?.includes('Final') && !f.round?.includes('Semi'))
    ).length
    return count > 0
  })

  const displayRound = availableRounds.includes(activeRound) ? activeRound : (availableRounds[0] || 'Round of 32')
  const slots = slotsPerRound[displayRound] || 16
  const matchCount = slots / 2

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 14px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <GitBranch size={14} color="var(--lime)" />
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:2, color:'var(--lime)' }}>BRACKET</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {ROUNDS.map(r => (
            <button key={r} onClick={() => setActiveRound(r)} style={{
              padding:'4px 12px', borderRadius:20, fontSize:11,
              background: displayRound === r ? 'var(--lime)' : 'var(--navy-4)',
              color: displayRound === r ? 'var(--navy)' : availableRounds.includes(r) ? 'var(--off-white)' : 'var(--muted)',
              border:`1px solid ${displayRound === r ? 'var(--lime)' : 'var(--border)'}`,
              fontWeight: displayRound === r ? 600 : 400,
              opacity: !availableRounds.includes(r) && displayRound !== r ? 0.5 : 1,
            }}>{r}</button>
          ))}
        </div>
      </div>

      {knockoutFixtures.length === 0 ? (
        <div style={{ padding:'3rem 20px', textAlign:'center', color:'var(--muted)' }}>
          <GitBranch size={36} strokeWidth={1} style={{ marginBottom:12, display:'block', margin:'0 auto 12px' }} />
          <p>Knockout bracket appears once the group stage is complete</p>
        </div>
      ) : (
        <div style={{ padding:'16px 20px', overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(matchCount, 4)}, 1fr)`, gap:12, minWidth: matchCount > 4 ? matchCount * 185 : 'auto' }}>
            {Array.from({ length: matchCount }, (_, i) => {
              const homeTeam = getTeamForSlot(knockoutFixtures, displayRound, i * 2)
              const awayTeam = getTeamForSlot(knockoutFixtures, displayRound, i * 2 + 1)
              return (
                <div key={i} style={{ background:'var(--navy-3)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'var(--muted)', marginBottom:8, textAlign:'center', letterSpacing:0.5, textTransform:'uppercase' }}>
                    Match {i + 1}
                  </div>
                  <MatchPair homeTeam={homeTeam} awayTeam={awayTeam} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
