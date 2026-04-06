# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x-alpha | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in Dominion, please report it responsibly:

1. **Open a GitHub Issue** with the label `security` at [Dominion Issues](https://github.com/Virus250188/Dominion_Public/issues)
2. **Or email directly:** Include "Dominion Security" in the subject line

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

## What Counts as a Security Issue

- Authentication bypass or session hijacking
- Credential exposure (API keys, passwords leaking to the client)
- Encryption flaws in stored secrets
- Path traversal or arbitrary file access via plugin upload
- Cross-site scripting (XSS) or injection attacks

## Security Features

Dominion implements AES-256-GCM encryption for stored credentials, server-side API proxying (secrets never reach the browser), JWT session management via Auth.js, and rate limiting on auth endpoints.
