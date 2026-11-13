// Every sovereign country (plus a few commonly-visited territories) a customer can apply to.
export type Region =
  | "Africa"
  | "Asia"
  | "Europe"
  | "Middle East"
  | "North America"
  | "South America"
  | "Central America & Caribbean"
  | "Oceania";

export type Country = { code: string; name: string; region: Region };

const raw: [string, string, Region][] = [
  ["AF", "Afghanistan", "Asia"], ["AL", "Albania", "Europe"], ["DZ", "Algeria", "Africa"],
  ["AD", "Andorra", "Europe"], ["AO", "Angola", "Africa"], ["AG", "Antigua and Barbuda", "Central America & Caribbean"],
  ["AR", "Argentina", "South America"], ["AM", "Armenia", "Asia"], ["AU", "Australia", "Oceania"],
  ["AT", "Austria", "Europe"], ["AZ", "Azerbaijan", "Asia"], ["BS", "Bahamas", "Central America & Caribbean"],
  ["BH", "Bahrain", "Middle East"], ["BD", "Bangladesh", "Asia"], ["BB", "Barbados", "Central America & Caribbean"],
  ["BY", "Belarus", "Europe"], ["BE", "Belgium", "Europe"], ["BZ", "Belize", "Central America & Caribbean"],
  ["BJ", "Benin", "Africa"], ["BT", "Bhutan", "Asia"], ["BO", "Bolivia", "South America"],
  ["BA", "Bosnia and Herzegovina", "Europe"], ["BW", "Botswana", "Africa"], ["BR", "Brazil", "South America"],
  ["BN", "Brunei", "Asia"], ["BG", "Bulgaria", "Europe"], ["BF", "Burkina Faso", "Africa"],
  ["BI", "Burundi", "Africa"], ["CV", "Cabo Verde", "Africa"], ["KH", "Cambodia", "Asia"],
  ["CM", "Cameroon", "Africa"], ["CA", "Canada", "North America"], ["CF", "Central African Republic", "Africa"],
  ["TD", "Chad", "Africa"], ["CL", "Chile", "South America"], ["CN", "China", "Asia"],
  ["CO", "Colombia", "South America"], ["KM", "Comoros", "Africa"], ["CG", "Congo", "Africa"],
  ["CD", "Congo (DR)", "Africa"], ["CR", "Costa Rica", "Central America & Caribbean"], ["CI", "Côte d'Ivoire", "Africa"],
  ["HR", "Croatia", "Europe"], ["CU", "Cuba", "Central America & Caribbean"], ["CY", "Cyprus", "Europe"],
  ["CZ", "Czechia", "Europe"], ["DK", "Denmark", "Europe"], ["DJ", "Djibouti", "Africa"],
  ["DM", "Dominica", "Central America & Caribbean"], ["DO", "Dominican Republic", "Central America & Caribbean"], ["EC", "Ecuador", "South America"],
  ["EG", "Egypt", "Middle East"], ["SV", "El Salvador", "Central America & Caribbean"], ["GQ", "Equatorial Guinea", "Africa"],
  ["ER", "Eritrea", "Africa"], ["EE", "Estonia", "Europe"], ["SZ", "Eswatini", "Africa"],
  ["ET", "Ethiopia", "Africa"], ["FJ", "Fiji", "Oceania"], ["FI", "Finland", "Europe"],
  ["FR", "France", "Europe"], ["GA", "Gabon", "Africa"], ["GM", "Gambia", "Africa"],
  ["GE", "Georgia", "Asia"], ["DE", "Germany", "Europe"], ["GH", "Ghana", "Africa"],
  ["GR", "Greece", "Europe"], ["GD", "Grenada", "Central America & Caribbean"], ["GT", "Guatemala", "Central America & Caribbean"],
  ["GN", "Guinea", "Africa"], ["GW", "Guinea-Bissau", "Africa"], ["GY", "Guyana", "South America"],
  ["HT", "Haiti", "Central America & Caribbean"], ["HN", "Honduras", "Central America & Caribbean"], ["HK", "Hong Kong", "Asia"],
  ["HU", "Hungary", "Europe"], ["IS", "Iceland", "Europe"], ["IN", "India", "Asia"],
  ["ID", "Indonesia", "Asia"], ["IR", "Iran", "Middle East"], ["IQ", "Iraq", "Middle East"],
  ["IE", "Ireland", "Europe"], ["IL", "Israel", "Middle East"], ["IT", "Italy", "Europe"],
  ["JM", "Jamaica", "Central America & Caribbean"], ["JP", "Japan", "Asia"], ["JO", "Jordan", "Middle East"],
  ["KZ", "Kazakhstan", "Asia"], ["KE", "Kenya", "Africa"], ["KI", "Kiribati", "Oceania"],
  ["XK", "Kosovo", "Europe"], ["KW", "Kuwait", "Middle East"], ["KG", "Kyrgyzstan", "Asia"],
  ["LA", "Laos", "Asia"], ["LV", "Latvia", "Europe"], ["LB", "Lebanon", "Middle East"],
  ["LS", "Lesotho", "Africa"], ["LR", "Liberia", "Africa"], ["LY", "Libya", "Africa"],
  ["LI", "Liechtenstein", "Europe"], ["LT", "Lithuania", "Europe"], ["LU", "Luxembourg", "Europe"],
  ["MO", "Macao", "Asia"], ["MG", "Madagascar", "Africa"], ["MW", "Malawi", "Africa"],
  ["MY", "Malaysia", "Asia"], ["MV", "Maldives", "Asia"], ["ML", "Mali", "Africa"],
  ["MT", "Malta", "Europe"], ["MH", "Marshall Islands", "Oceania"], ["MR", "Mauritania", "Africa"],
  ["MU", "Mauritius", "Africa"], ["MX", "Mexico", "North America"], ["FM", "Micronesia", "Oceania"],
  ["MD", "Moldova", "Europe"], ["MC", "Monaco", "Europe"], ["MN", "Mongolia", "Asia"],
  ["ME", "Montenegro", "Europe"], ["MA", "Morocco", "Africa"], ["MZ", "Mozambique", "Africa"],
  ["MM", "Myanmar", "Asia"], ["NA", "Namibia", "Africa"], ["NR", "Nauru", "Oceania"],
  ["NP", "Nepal", "Asia"], ["NL", "Netherlands", "Europe"], ["NZ", "New Zealand", "Oceania"],
  ["NI", "Nicaragua", "Central America & Caribbean"], ["NE", "Niger", "Africa"], ["NG", "Nigeria", "Africa"],
  ["KP", "North Korea", "Asia"], ["MK", "North Macedonia", "Europe"], ["NO", "Norway", "Europe"],
  ["OM", "Oman", "Middle East"], ["PK", "Pakistan", "Asia"], ["PW", "Palau", "Oceania"],
  ["PS", "Palestine", "Middle East"], ["PA", "Panama", "Central America & Caribbean"], ["PG", "Papua New Guinea", "Oceania"],
  ["PY", "Paraguay", "South America"], ["PE", "Peru", "South America"], ["PH", "Philippines", "Asia"],
  ["PL", "Poland", "Europe"], ["PT", "Portugal", "Europe"], ["QA", "Qatar", "Middle East"],
  ["RO", "Romania", "Europe"], ["RU", "Russia", "Europe"], ["RW", "Rwanda", "Africa"],
  ["KN", "Saint Kitts and Nevis", "Central America & Caribbean"], ["LC", "Saint Lucia", "Central America & Caribbean"], ["VC", "Saint Vincent and the Grenadines", "Central America & Caribbean"],
  ["WS", "Samoa", "Oceania"], ["SM", "San Marino", "Europe"], ["ST", "São Tomé and Príncipe", "Africa"],
  ["SA", "Saudi Arabia", "Middle East"], ["SN", "Senegal", "Africa"], ["RS", "Serbia", "Europe"],
  ["SC", "Seychelles", "Africa"], ["SL", "Sierra Leone", "Africa"], ["SG", "Singapore", "Asia"],
  ["SK", "Slovakia", "Europe"], ["SI", "Slovenia", "Europe"], ["SB", "Solomon Islands", "Oceania"],
  ["SO", "Somalia", "Africa"], ["ZA", "South Africa", "Africa"], ["KR", "South Korea", "Asia"],
  ["SS", "South Sudan", "Africa"], ["ES", "Spain", "Europe"], ["LK", "Sri Lanka", "Asia"],
  ["SD", "Sudan", "Africa"], ["SR", "Suriname", "South America"], ["SE", "Sweden", "Europe"],
  ["CH", "Switzerland", "Europe"], ["SY", "Syria", "Middle East"], ["TW", "Taiwan", "Asia"],
  ["TJ", "Tajikistan", "Asia"], ["TZ", "Tanzania", "Africa"], ["TH", "Thailand", "Asia"],
  ["TL", "Timor-Leste", "Asia"], ["TG", "Togo", "Africa"], ["TO", "Tonga", "Oceania"],
  ["TT", "Trinidad and Tobago", "Central America & Caribbean"], ["TN", "Tunisia", "Africa"], ["TR", "Türkiye", "Europe"],
  ["TM", "Turkmenistan", "Asia"], ["TV", "Tuvalu", "Oceania"], ["UG", "Uganda", "Africa"],
  ["UA", "Ukraine", "Europe"], ["AE", "United Arab Emirates", "Middle East"], ["GB", "United Kingdom", "Europe"],
  ["US", "United States", "North America"], ["UY", "Uruguay", "South America"], ["UZ", "Uzbekistan", "Asia"],
  ["VU", "Vanuatu", "Oceania"], ["VA", "Vatican City", "Europe"], ["VE", "Venezuela", "South America"],
  ["VN", "Vietnam", "Asia"], ["YE", "Yemen", "Middle East"], ["ZM", "Zambia", "Africa"],
  ["ZW", "Zimbabwe", "Africa"],
];

export const COUNTRIES: Country[] = raw.map(([code, name, region]) => ({ code, name, region }));

export const REGIONS: Region[] = [
  "Europe", "North America", "Oceania", "Asia", "Middle East", "Africa",
  "South America", "Central America & Caribbean",
];

/** Schengen Area members (one shared short-stay visa). */
export const SCHENGEN = new Set([
  "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IT", "LV",
  "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
]);

export function flag(code: string) {
  if (code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function getCountry(code: string | undefined | null) {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}
