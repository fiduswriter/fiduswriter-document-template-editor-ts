<p align="center">
  <img src="https://git.fiduswriter.org/fiduswriter/fiduswriter-document-template-editor-ts/raw/branch/main/logo.svg" alt="@fiduswriter/document-template-editor" width="100" height="100">
</p>

<h1 align="center">@fiduswriter/document-template-editor</h1>

<p align="center">Document template designer and editor for Fidus Writer</p>

---

## What it does

Provides the full document template editing system for Fidus Writer. Includes
a visual template designer, template extraction from existing documents,
adjustment of documents to conform to templates, and template import/export.

## Exports

| Export                        | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `DocumentTemplateDesigner`    | Visual designer for creating and editing document templates |
| `extractTemplate`             | Extract a template from an existing Fidus Writer document   |
| `adjustDocToTemplate`         | Adjust a document's content to conform to a target template |
| `DocumentTemplateExporter`    | Export templates to `.fidustemplate` format                 |
| `DocumentTemplateImporter`    | Import templates from `.fidustemplate` format               |
| `DocumentTemplateAdmin`       | Admin UI for managing individual document templates         |
| `DocumentTemplateListAdmin`   | Admin UI for listing all document templates                 |
| `updateTemplateFile`          | Update an existing template file                            |
| `helpSchema`, `serializeHelp` | Schema definition and serializer for template help text     |

## Installation

```bash
npm install @fiduswriter/document-template-editor
```

## Usage

```ts
import {
  DocumentTemplateDesigner,
  extractTemplate,
  adjustDocToTemplate,
  DocumentTemplateExporter,
  DocumentTemplateImporter,
} from "@fiduswriter/document-template-editor";
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Check types without emitting
npm run lint         # Lint with ESLint
npm run format:check # Check formatting with Prettier
```

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
