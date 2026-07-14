import type { Metadata } from 'next';
import { Poppins, Nunito, Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ variable: '--font-poppins', weight: ['400', '500', '600', '700'], subsets: ['latin'], display: 'swap' });
const nunito = Nunito({ variable: '--font-nunito', weight: ['400', '500', '600'], subsets: ['latin'], display: 'swap' });
const bricolage = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'], display: 'swap' });
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Harmony',
  description: 'Operations + AI workspace for Chord and 1702 Digital',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Harmony',
  },
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${nunito.variable} ${bricolage.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
