import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WORM Vault Cryptographic Ledger Explorer',
  description: 'An open-source, database-enforced Write Once, Read Many (WORM) audit logging vault for PostgreSQL, featuring cryptographic SHA-256 hash-chaining.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased min-h-screen bg-[#020617]">
        {children}
      </body>
    </html>
  );
}
