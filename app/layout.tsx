import type { Metadata } from 'next';
import './globals.css';
import { ArenaProvider } from './lib/ArenaProvider';
import { Shell } from './components/Shell';

export const metadata: Metadata = {
  title: 'FORSETI — Delegated Authority. Global Integrity.',
  description:
    'Cross-rail delegation-authority defense for agentic payments. Every metric shown is produced by an executable pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 antialiased">
        <ArenaProvider>
          <Shell>{children}</Shell>
        </ArenaProvider>
      </body>
    </html>
  );
}
