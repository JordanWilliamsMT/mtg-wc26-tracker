// World Cup 2026 — 48 qualified teams
// Top 22 = FIFA ranking favourites for the sweepstake pool
// Bottom 22 = lower-ranked qualifiers
// Charity 4 = not in sweepstake, winnings go to charity

export const TOP_TEAMS = [
  { name: 'Argentina',   flag: '🇦🇷' },
  { name: 'France',      flag: '🇫🇷' },
  { name: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Brazil',      flag: '🇧🇷' },
  { name: 'Spain',       flag: '🇪🇸' },
  { name: 'Portugal',    flag: '🇵🇹' },
  { name: 'Germany',     flag: '🇩🇪' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Colombia',    flag: '🇨🇴' },
  { name: 'Uruguay',     flag: '🇺🇾' },
  { name: 'Belgium',     flag: '🇧🇪' },
  { name: 'Mexico',      flag: '🇲🇽' },
  { name: 'USA',         flag: '🇺🇸' },
  { name: 'Croatia',     flag: '🇭🇷' },
  { name: 'Morocco',     flag: '🇲🇦' },
  { name: 'Japan',       flag: '🇯🇵' },
  { name: 'Senegal',     flag: '🇸🇳' },
  { name: 'Italy',       flag: '🇮🇹' },
  { name: 'Ecuador',     flag: '🇪🇨' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Canada',      flag: '🇨🇦' },
]

export const BOTTOM_TEAMS = [
  { name: 'Serbia',        flag: '🇷🇸' },
  { name: 'Denmark',       flag: '🇩🇰' },
  { name: 'Austria',       flag: '🇦🇹' },
  { name: 'Turkey',        flag: '🇹🇷' },
  { name: 'Ukraine',       flag: '🇺🇦' },
  { name: 'Chile',         flag: '🇨🇱' },
  { name: 'Peru',          flag: '🇵🇪' },
  { name: 'Venezuela',     flag: '🇻🇪' },
  { name: 'Paraguay',      flag: '🇵🇾' },
  { name: 'Bolivia',       flag: '🇧🇴' },
  { name: 'Costa Rica',    flag: '🇨🇷' },
  { name: 'Honduras',      flag: '🇭🇳' },
  { name: 'Panama',        flag: '🇵🇦' },
  { name: 'Jamaica',       flag: '🇯🇲' },
  { name: 'Algeria',       flag: '🇩🇿' },
  { name: 'Nigeria',       flag: '🇳🇬' },
  { name: 'Ivory Coast',   flag: '🇨🇮' },
  { name: 'Cameroon',      flag: '🇨🇲' },
  { name: 'South Africa',  flag: '🇿🇦' },
  { name: 'Australia',     flag: '🇦🇺' },
  { name: 'New Zealand',   flag: '🇳🇿' },
  { name: 'Saudi Arabia',  flag: '🇸🇦' },
]

export const CHARITY_TEAMS = [
  { name: 'Iran',         flag: '🇮🇷' },
  { name: 'Tunisia',      flag: '🇹🇳' },
  { name: 'Ghana',        flag: '🇬🇭' },
  { name: 'El Salvador',  flag: '🇸🇻' },
]

export const ALL_SWEEPSTAKE_TEAMS = [...TOP_TEAMS, ...BOTTOM_TEAMS]

// Map from common API name variants → our canonical names
// API-Football sometimes uses different spellings
export const TEAM_NAME_MAP = {
  'United States':        'USA',
  'US':                   'USA',
  'Korea Republic':       'South Korea',
  'Republic of Korea':    'South Korea',
  'England':              'England',
  'Ivory Coast':          'Ivory Coast',
  "Côte d'Ivoire":        'Ivory Coast',
  'Cote d\'Ivoire':       'Ivory Coast',
  'Bosnia':               'Bosnia & Herzegovina',
}

export function normaliseTeamName(name) {
  return TEAM_NAME_MAP[name] || name
}

export function getTeamMeta(name) {
  return ALL_SWEEPSTAKE_TEAMS.find(t => t.name === normaliseTeamName(name))
    || CHARITY_TEAMS.find(t => t.name === normaliseTeamName(name))
    || { name, flag: '🏳️' }
}
