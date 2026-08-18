# AGENTS.md — @fiduswriter/document-template-editor

## Project overview

`@fiduswriter/document-template-editor` is a TypeScript library that implements
the Fidus Writer document template designer and editor. It provides a visual
template designer, template extraction from existing documents, adjustment of
documents to conform to templates, and template import/export.

- Package name: `@fiduswriter/document-template-editor`
- License: `AGPL-3.0`
- Repository: `https://git.fiduswriter.org/fiduswriter/fiduswriter-document-template-editor-ts.git`
- Author: Johannes Wilm

## Scope

Code in this repository should be limited to:

- Template designer (`src/designer.ts`).
- Template extraction from documents (`src/extract_template.ts`).
- Document adjustment to templates (`src/fix_doc.ts`).
- Template import/export (`src/importer.ts`, `src/exporter.ts`).
- Template admin UI (`src/change_admin.ts`, `src/list_admin.ts`).
- Template help schema (`src/schema.ts`).
- Template utilities (`src/tools.ts`, `src/update.ts`).

Do **not** put in this repository:

- Generic UI primitives (those belong in `fwtoolkit`).
- Document model code (use `@fiduswriter/document`).
- Bibliography manager UI (use `@fiduswriter/bibliography-manager`).

## Technology stack

- **Language:** TypeScript 6.0+.
- **Module system:** ESM (`"type": "module"`).
- **Build tool:** `tsc` only; no bundler is used.
- **Test runner:** Jest with `ts-jest` and `--experimental-vm-modules`.

## Directory layout

```
.
├── src/                  # TypeScript source files
│   ├── index.ts          # Public barrel export
│   ├── designer.ts       # Visual template designer
│   ├── extract_template.ts
│   ├── fix_doc.ts
│   ├── exporter.ts
│   ├── importer.ts
│   ├── change_admin.ts
│   ├── list_admin.ts
│   ├── schema.ts
│   ├── tools.ts
│   ├── templates.ts
│   ├── types.ts
│   └── update.ts
├── dist/                 # Compiled JS, .d.ts and source maps (generated)
├── test/                 # Jest tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Build and test commands

This package uses `pnpm`. Do not use `npm install`; it will create a
`package-lock.json` that is not tracked.

```bash
pnpm install          # Install dependencies
pnpm run build        # Compile TypeScript to dist/
pnpm run typecheck    # Check types without emitting
pnpm test             # Run test suite
pnpm run lint         # Lint with ESLint
pnpm run format:check # Check formatting with Prettier
```

## Backend communication

The package must remain backend-agnostic. It does **not** contain any
hard-coded `/api/...` URLs. All server communication goes through the
injected `DocumentTemplateApi` connector defined in `src/types.ts`.

The host app (e.g. `fiduswriter/`) creates an implementation of this
interface and passes it to the admin/dialog/exporter/importer classes.
The Django implementation lives in
`fiduswriter/fiduswriter/base/static/js/modules/api_adapters/index.js`.

When adding a new backend operation:

1. Add the method signature to `DocumentTemplateApi` in `src/types.ts` with
   a concrete response type (extend `src/types.ts` rather than using
   `Promise<unknown>`).
2. Implement the method in the host app's adapter.
3. Call it through the injected connector; never import `postJson`/`getJson`
   for Django-specific endpoints in this package.

## Consumers

- `fiduswriter/` (the main Fidus Writer Django app).
- `@fiduswriter/document` for the document model.
