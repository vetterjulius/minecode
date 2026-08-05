import React from 'react';
import './globals.css';

export const metadata = {
  title: 'B2B SaaS Reference Application',
  description: 'Generated with Minecode',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
