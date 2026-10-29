import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'VALO · Ascent', description: 'Ascent 戰術訓練場' };
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="zh-TW"><body>{children}</body></html>;
}
