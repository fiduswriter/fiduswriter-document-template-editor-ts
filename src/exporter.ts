import download from "downloadjs";

import { createSlug } from "@fiduswriter/document/exporter/tools/file";
import { ZipFileCreator } from "fwtoolkit/file/zip";

import type {
  DocumentTemplateApi,
  HttpTemplateFile,
  TemplateExportResponse,
  TextTemplateFile,
} from "./types.js";

export class DocumentTemplateExporter {
  id: number;
  documentTemplateApi: DocumentTemplateApi;
  download: boolean;
  token: string | false;

  zipFileName: string | false;
  docVersion: string | false;
  textFiles: TextTemplateFile[];
  httpFiles: HttpTemplateFile[];

  constructor(
    id: number,
    documentTemplateApi: DocumentTemplateApi,
    download = true,
    token: string | false = false,
  ) {
    this.id = id;
    this.documentTemplateApi = documentTemplateApi;
    this.download = download;
    this.token = token;

    this.zipFileName = false;
    this.docVersion = false;
    this.textFiles = [];
    this.httpFiles = [];
  }

  init() {
    return this.documentTemplateApi
      .getTemplate(this.id, this.token || undefined)
      .then((json: TemplateExportResponse) => {
        this.docVersion = json.doc_version;
        this.zipFileName = `${createSlug(json.title)}.fidustemplate`;
        this.textFiles.push({
          filename: "template.json",
          contents: JSON.stringify(json.content),
        });
        const exportTemplates: Array<{
          file: string;
          file_type: string;
          title: string;
        }> = [];
        json.export_templates.forEach((template) => {
          const filename = `exporttemplates/${template.fields.template_file.split("/").slice(-1)[0]}`;
          this.httpFiles.push({
            filename,
            url: template.fields.template_file,
          });
          exportTemplates.push({
            file: filename,
            file_type: template.fields.file_type,
            title: template.fields.title,
          });
        });
        this.textFiles.push({
          filename: "exporttemplates.json",
          contents: JSON.stringify(exportTemplates),
        });
        const documentStyles: Array<{
          contents: string;
          slug: string;
          title: string;
          files: string[];
        }> = [];
        json.document_styles.forEach((docStyle) => {
          const style: {
            contents: string;
            slug: string;
            title: string;
            files: string[];
          } = {
            contents: docStyle.fields.contents,
            slug: docStyle.fields.slug,
            title: docStyle.fields.title,
            files: [],
          };
          docStyle.fields.documentstylefile_set.forEach((docstyleFile) => {
            const filename = `documentstyles/${docstyleFile[1]}`;
            this.httpFiles.push({
              filename,
              url: docstyleFile[0],
            });
            style.files.push(filename);
          });
          documentStyles.push(style);
        });
        this.textFiles.push({
          filename: "documentstyles.json",
          contents: JSON.stringify(documentStyles),
        });
        if (this.download) {
          return this.createZip();
        }
        return Promise.resolve();
      });
  }

  createZip() {
    this.textFiles.push({
      filename: "filetype-version",
      contents: this.docVersion as string,
    });
    const zipper = new ZipFileCreator(
      this.textFiles,
      this.httpFiles,
      undefined,
      "application/vnd.fiduswriter.template+zip",
    );
    return zipper
      .init()
      .then((blob) =>
        download(
          blob,
          this.zipFileName as string,
          "application/vnd.fiduswriter.template+zip",
        ),
      );
  }
}
