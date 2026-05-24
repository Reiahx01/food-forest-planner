import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';

/**
 * Self-hosted brand fonts via `next/font/google`.
 *
 * Why self-hosted via next/font: no runtime request to Google Fonts. Vault
 * lesson (yaya OG-image incident): declaring a font that doesn't cover a
 * rendered glyph causes a runtime Google Fonts fetch that can return 400,
 * killing static-page generation. next/font bundles + subsets at build time,
 * eliminating that failure mode.
 *
 * Variable names mirror the CSS custom properties exposed in `app/globals.css`
 * @theme. Parity enforced by `app/brand/tokens-parity.test.ts` (font slot)
 * and `app/brand/fonts.test.ts` (structure).
 */

export const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const body = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const fontVariables = `${display.variable} ${body.variable} ${mono.variable}`;
