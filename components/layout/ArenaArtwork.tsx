/** An original, lightweight isometric board illustration. */
export default function ArenaArtwork() {
  return <svg className="arena-artwork" viewBox="0 0 360 240" fill="none" aria-hidden="true">
    <path d="m25 146 153 78 157-80M25 165l153 78 157-80" stroke="currentColor" opacity=".12" />
    <g className="art-board"><path d="m34 118 144-74 144 74-144 76-144-76Z" fill="#1A4238" stroke="#568D7A" /><path d="m34 118 144 76 144-76v16l-144 76-144-76v-16Z" fill="#12372E" stroke="#568D7A" />
    <path d="m62 117 116-59 116 59-116 61-116-61Z" fill="#BEE8D7" />
    <path d="m73 116 40-21 40 21-40 21-40-21ZM202 116l40-21 40 21-40 21-40-21Z" fill="#438D73" /><path d="m138 83 40-20 40 20-40 21-40-21ZM138 150l40-20 40 20-40 21-40-21Z" fill="#86BDA5" />
    <path d="m158 117 20-11 20 11-20 11-20-11Z" fill="#12372E" /><path d="m116 116 62-32 63 32-63 33-62-33Z" stroke="#EDF8F2" strokeWidth="2" strokeDasharray="5 5" />
    <g className="art-token"><ellipse cx="113" cy="113" rx="12" ry="6" fill="#12372E" opacity=".2" /><path d="M104 107c1-8 4-9 4-16h10c0 7 3 8 4 16-4 5-14 5-18 0Z" fill="#183F33" /><circle cx="113" cy="87" r="8" fill="#275E49" /></g>
    <g><ellipse cx="241" cy="112" rx="12" ry="6" fill="#12372E" opacity=".2" /><path d="M232 106c1-8 4-9 4-16h10c0 7 3 8 4 16-4 5-14 5-18 0Z" fill="#F4D899" /><circle cx="241" cy="86" r="8" fill="#F9E6BA" /></g></g>
    <g className="art-dice"><rect x="251" y="25" width="44" height="44" rx="11" transform="rotate(15 251 25)" fill="#F4F7F0" /><g fill="#24503F"><circle cx="258" cy="40" r="3" /><circle cx="274" cy="44" r="3" /><circle cx="254" cy="56" r="3" /><circle cx="270" cy="60" r="3" /></g></g>
    <path d="M55 59v12m-6-6h12M304 187v10m-5-5h10" stroke="#9DCEB6" strokeWidth="1.5" /><circle cx="96" cy="40" r="3" stroke="#9DCEB6" />
  </svg>;
}
