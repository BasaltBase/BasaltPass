// Fallback ambient module declarations for path aliases.
//
// In a correctly configured TS project, these aliases should resolve via tsconfig "paths".
// Some tooling (or editor diagnostic modes) may not pick up nested tsconfig.json files;
// these declarations prevent noisy "Cannot find module" errors in that case.

declare module '@/*'
declare module '@api/*'
declare module '@components/*'
declare module '@pages/*'
declare module '@utils/*'
declare module '@types/*'
declare module '@contexts/*'
