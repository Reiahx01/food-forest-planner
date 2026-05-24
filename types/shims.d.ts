// Ambient declarations for npm packages that don't ship their own types.
// Kept minimal — these modules are only consumed by ESLint config and config
// tests, so an `any`-shaped shim is intentional rather than a real type port.

declare module 'eslint-plugin-jsx-a11y';
declare module '@next/eslint-plugin-next';
