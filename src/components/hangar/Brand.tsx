import Link from 'next/link';

export default function Brand() {
  return <Link href="/" className="rl-brand" aria-label="Robot Legends — kembali ke hangar">
    <svg width="46" height="45" viewBox="0 0 60 58" fill="none" aria-hidden="true">
      <defs><linearGradient id="wing" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c5edff"/><stop offset=".5" stopColor="#55bcf1"/><stop offset="1" stopColor="#28628c"/></linearGradient></defs>
      <path d="M1 8 18 12 19 20 6 15ZM4 19 19 23 20 29 9 25ZM9 29 21 32 21 38 13 34ZM59 8 42 12 41 20 54 15ZM56 19 41 23 40 29 51 25ZM51 29 39 32 39 38 47 34Z" fill="url(#wing)"/>
      <path d="m18 7 9 6 3-12 4 12 9-6-3 21-2 15-8 11-9-11-2-15z" fill="#172b42" stroke="#92cfe9" strokeWidth="1.3"/>
      <path d="m20 10 8 8 2 7 2-7 8-8-3 15-7 7-7-7z" fill="url(#wing)"/>
      <path d="m30 2 3 13-3 9-3-9Z" fill="#ffd171"/><path d="m21 24 8 6-6-2zm18 0-8 6 6-2z" fill="#86fbff"/>
      <path d="m22 32 5 5 3 12 3-12 5-5-2 10-6 9-6-9z" fill="#e9ba65"/><path d="m27 30 3 3 3-3-3 9z" fill="#c9e5f2"/>
    </svg>
    <span><strong>ROBOT LEGENDS</strong><small>BATTLE OF KNOWLEDGE</small></span>
  </Link>;
}
