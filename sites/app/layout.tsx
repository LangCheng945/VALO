import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'VALO · 地圖訓練場', description: 'Ascent / Haven / Summit / Abyss 戰術訓練場' };
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="zh-TW"><body>{children}</body></html>;
}
