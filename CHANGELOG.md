# Changelog

## 1.0.0 — 2026-08-14

First open-source release.

- Restructured from a single-file bundle into contributable ES-module source
  (`src/calc-core.js` + React components), precompiled with esbuild.
- Ships production React 18 — ~200 KB total, down from a 1.6 MB self-extracting
  bundle with in-browser Babel.
- Calculator, Readme, and Glossary tabs; three architecture patterns; scaling
  curve with inspection; scenario comparison; saved plans with JSON import/export.
- `npm run build` emits both a hostable `dist/` and a self-contained
  single-file standalone HTML (release artifact).
