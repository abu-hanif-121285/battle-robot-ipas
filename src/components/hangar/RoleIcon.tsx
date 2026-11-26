import { Shield, Swords, Crosshair, Plus, Orbit, Flame, Snowflake, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';
export const ROLE_ICONS: Record<string, LucideIcon> = { Tank: Shield, Assassin: Swords, Marksman: Crosshair, Support: Plus, Mage: Orbit, Fighter: Flame, Control: Snowflake, Defender: ShieldCheck };
export default function RoleIcon({ role, size = 15 }: { role: string; size?: number }) { const Icon = ROLE_ICONS[role] || Zap; return <Icon size={size} strokeWidth={1.8} aria-hidden="true"/>; }
