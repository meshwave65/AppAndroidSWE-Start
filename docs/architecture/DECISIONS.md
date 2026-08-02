# ARCHITECTURAL DECISIONS

**Project:** Sofia Web Extractor (SWE)

---

# Purpose

This document records important architectural decisions and the rationale behind them.

---

## 2026-08-02

### Decision

The GitHub repository becomes the single source of truth.

### Motivation

Avoid divergence between development environments.

### Consequences

- Development happens in GitHub Codespaces.
- The local machine is no longer the primary development environment.
- Every relevant change must be committed to Git.

---

## 2026-08-02

### Decision

Supabase is adopted as the reference backend.

### Motivation

Rapid deployment and simplified infrastructure.

### Consequences

The product architecture remains provider-independent.

Future versions may support additional backends.

---

# Change History

## Version 1.0

Initial document.