# ARCHITECTURE

**Project:** Sofia Web Extractor (SWE)

**Version:** 1.0

---

# High-Level Architecture

```

Android / Browser

↓

React + Vite

↓

FastAPI Backend

↓

Supabase

├── Authentication

├── Database

└── Storage

↓

Extractor Engine

↓

Knowledge Repository

```

---

# Design Principles

- Modular architecture
- Independent components
- Replaceable backend
- Provider-agnostic infrastructure

Supabase is the reference backend, not a mandatory dependency.

---

# Future Modules

SOFIA Curator

↓

SOFIA Vectorizer

↓

Knowledge Intelligence

---

# Change History

## Version 1.0

Initial document.
