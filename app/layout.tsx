import type { Metadata } from 'next';
import { fontVariables } from '@/app/brand/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'food-forest-planner',
  description:
    'Plan your food forest on a map. Permaculture and syntropic agroforestry tooling for hobbyists and consultants.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-base text-text-primary">
        {children}
      </body>
    </html>
  );
}
