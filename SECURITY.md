# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (latest) | ✅ |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Email **security@linguadapt.io** with:

1. A clear description of the vulnerability.
2. Steps to reproduce (proof-of-concept if possible).
3. Potential impact.

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days** for critical issues.

## Scope

Items in scope for responsible disclosure:
- Authentication bypass
- SQL / NoSQL injection
- Cross-site scripting (XSS)
- Insecure direct object references (IDOR)
- API key or secret exposure
- Proctoring data leakage
- Licence, exam-code or billing record issues

## Out of Scope

- Denial-of-service attacks
- Issues in third-party libraries (please report upstream)
- Social-engineering attacks

## Security Best Practices for Operators

- Store all secrets in environment variables; never commit them to source control.
- Rotate `SECRET_ENCRYPTION_KEY` via `SECRET_ENCRYPTION_KEY_PREVIOUS` if it may have been exposed.
- Run database migrations in a network-isolated environment before deploying.
- Enable Prisma query logging only in development; never in production.
- Use HTTPS exclusively in production (enforced automatically on Render and Fly.io).
