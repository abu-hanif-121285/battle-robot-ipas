import type { Metadata } from 'next';
import Hangar from '@/components/hangar/Hangar';
export const metadata: Metadata = { title: 'Hero Hangar — Robot Legends', description: 'Koleksi sepuluh hero robot. Kenali role, lihat model 3D, dan bawa hero pilihanmu ke Battle of Knowledge.' };
export default function HeroesPage() { return <Hangar/>; }
