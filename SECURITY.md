# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities. Instead, use
GitHub's private reporting ("Security" tab → "Report a vulnerability") or email
**info@vadami.ai** with details and reproduction steps.

You can expect an acknowledgment within a few days. Please allow time for a fix
before any public disclosure.

## Scope

This is a fully client-side tool: no server, no accounts, no network calls at
runtime (fonts aside), and all data (saved plans) stays in your browser's
localStorage. The most relevant risks are supply-chain (npm dependencies, build
pipeline) and XSS via imported plan JSON — reports in those areas are especially
welcome.

## Supported versions

Only the latest release is supported with security fixes.
