import {
  MAX_FW_DOCUMENT_VERSION,
  MIN_FW_DOCUMENT_VERSION,
} from "@fiduswriter/document/importer/native";
import { FW_DOCUMENT_VERSION } from "@fiduswriter/document/schema/index";
import { escapeText, gettext } from "fwtoolkit";

import { updateTemplateFile } from "./update.js";
import type {
  BinaryTemplateFile,
  DocumentTemplateApi,
  ImportedTemplate,
  TextTemplateFile,
} from "./types.js";

const TEXT_FILENAMES = [
  "mimetype",
  "filetype-version",
  "template.json",
  "exporttemplates.json",
  "documentstyles.json",
];

export class DocumentTemplateImporter {
  file: File;
  documentTemplateApi: DocumentTemplateApi;

  textFiles: TextTemplateFile[];
  otherFiles: BinaryTemplateFile[];
  ok: boolean;
  statusText: string;
  docTemplate:
    { id: number; title: string; added: number; updated: number } | false;

  constructor(file: File, documentTemplateApi: DocumentTemplateApi) {
    this.file = file;
    this.documentTemplateApi = documentTemplateApi;

    this.textFiles = [];
    this.otherFiles = [];
    this.ok = false;
    this.statusText = "";
    this.docTemplate = false;
  }

  init() {
    return new Promise<DocumentTemplateImporter>((resolve) => {
      // use a BlobReader to read the zip from a Blob object
      const reader = new window.FileReader();
      reader.onloadend = () => {
        if (
          reader.result &&
          typeof reader.result === "string" &&
          reader.result.length > 60 &&
          reader.result.substring(0, 2) === "PK"
        ) {
          this.initZipFileRead().then(() => resolve(this));
        } else {
          this.statusText = gettext(
            "The uploaded file does not appear to be a Fidus Writer Template file.",
          );
          resolve(this);
        }
      };
      reader.readAsText(this.file);
    });
  }

  initZipFileRead() {
    // Extract all the files that can be found in every fidus-file (not images)
    return import("jszip")
      .then(({ default: JSZip }) => new JSZip())
      .then((zipfs) => zipfs.loadAsync(this.file))
      .then((zipfs) => {
        const filenames: string[] = [],
          p: Array<Promise<void>> = [];
        let validFile = true;

        zipfs.forEach((filename) => filenames.push(filename));

        TEXT_FILENAMES.forEach((filename) => {
          if (filenames.indexOf(filename) === -1) {
            validFile = false;
          }
        });
        if (!validFile) {
          this.statusText = gettext(
            "The uploaded file does not appear to be a Fidus Writer file.",
          );
          return;
        }

        filenames
          .filter((filename) => !filename.endsWith("/"))
          .forEach((filename) => {
            p.push(
              new Promise<void>((resolve) => {
                let fileType: "string" | "blob";
                if (
                  ["mimetype", "filetype-version"].includes(filename) ||
                  filename.endsWith(".json")
                ) {
                  fileType = "string";
                } else {
                  fileType = "blob";
                }
                zipfs.files[filename].async(fileType).then((content) => {
                  if (fileType === "string") {
                    this.textFiles.push({
                      filename,
                      contents: content as string,
                    });
                  } else {
                    this.otherFiles.push({
                      filename,
                      content: content as Blob,
                    });
                  }
                  resolve();
                });
              }),
            );
          });
        return Promise.all(p).then(() => this.processFidusTemplateFile());
      });
  }

  processFidusTemplateFile() {
    const filetypeVersion = Number.parseFloat(
        this.textFiles.find((file) => file.filename === "filetype-version")!
          .contents,
      ),
      mimeType = this.textFiles.find(
        (file) => file.filename === "mimetype",
      )!.contents;
    if (
      (mimeType === "application/fidustemplate+zip" ||
        mimeType === "application/vnd.fiduswriter.template+zip") &&
      filetypeVersion >= MIN_FW_DOCUMENT_VERSION &&
      filetypeVersion <= MAX_FW_DOCUMENT_VERSION
    ) {
      const template = JSON.parse(
        this.textFiles.find((file) => file.filename === "template.json")!
          .contents,
      );
      const { title, content, exportTemplates, documentStyles } =
        updateTemplateFile(
          template.attrs.template,
          template,
          JSON.parse(
            this.textFiles.find(
              (file) => file.filename === "exporttemplates.json",
            )!.contents,
          ),
          JSON.parse(
            this.textFiles.find(
              (file) => file.filename === "documentstyles.json",
            )!.contents,
          ),
          filetypeVersion,
        );
      return this.documentTemplateApi
        .createTemplate(
          {
            title,
            content,
            import_id: content.attrs!.import_id,
            export_templates: exportTemplates,
            document_styles: documentStyles,
          },
          {
            files: this.otherFiles.map(
              ({ filename, content }) => new File([content], filename),
            ),
          },
        )
        .then((json: ImportedTemplate) => {
          this.ok = true;
          this.docTemplate = {
            id: json.id,
            title: json.title,
            added: json.added,
            updated: json.updated,
          };
          this.statusText = `${escapeText(title)} ${gettext("successfully imported.")}`;
          return this;
        });
    } else {
      // The file is not a Fidus Writer file.
      this.statusText =
        gettext(
          "The uploaded file does not appear to be of the version used on this server: ",
        ) + FW_DOCUMENT_VERSION;
      return this;
    }
  }
}
