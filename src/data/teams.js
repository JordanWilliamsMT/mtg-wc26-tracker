export const TOP_TEAMS = [
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "England", flag: "🇬🇧" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "Qatar", flag: "🇶🇦" },
];

export const BOTTOM_TEAMS = [
  { name: "Japan", flag: "🇯🇵" },
  { name: "Bosnia", flag: "🇧🇦" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "DR Congo", flag: "🇨🇩" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Tunisia", flag: "🇹🇳" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Uzbekistan", flag: "🇺🇿" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Cape Verde", flag: "🇨🇻" },
  { name: "Iran", flag: "🇮🇷" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Algeria", flag: "🇩🇿" },
  { name: "Iraq", flag: "🇮🇶" },
];

export const CHARITY_TEAMS = [
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Curacao", flag: "🇨🇼" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Haiti", flag: "🇭🇹" },
];

export const ALL_SWEEPSTAKE_TEAMS = [...TOP_TEAMS, ...BOTTOM_TEAMS];

export const TEAM_NAME_MAP = {
  "United States": "United States",
  USA: "United States",
  US: "United States",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Bosnia & Herzegovina": "Bosnia",
  "Bosnia and Herzegovina": "Bosnia",
  "Congo DR": "DR Congo",
  "Democratic Republic of Congo": "DR Congo",
  "Korea Republic": "South Korea",
  "Czech Republic": "Czech Republic",
  Czechia: "Czech Republic",
  Türkiye: "Turkey",
  Qator: "Qatar",
};

export function normaliseTeamName(name) {
  return TEAM_NAME_MAP[name] || name;
}

export function getTeamMeta(name) {
  const normalised = normaliseTeamName(name);
  return (
    ALL_SWEEPSTAKE_TEAMS.find((t) => t.name === normalised) ||
    CHARITY_TEAMS.find((t) => t.name === normalised) || { name, flag: "🏳️" }
  );
}
