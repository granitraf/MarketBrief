import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';

export const metadata: Metadata = {
  title: 'MarketBrief',
  description: 'One-screen daily market dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <div className="min-h-dvh w-full">
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </div>
      </body>
    </html>
  );
}
