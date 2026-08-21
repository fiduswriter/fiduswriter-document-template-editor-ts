import { CSL } from "@fiduswriter/document/citeproc-plus";
import {
  ensureCSS,
  escapeText,
  findTarget,
  gettext,
  staticUrl,
  whenReady,
} from "fwtoolkit";

import { DocumentTemplateDesigner } from "./designer.js";
import type {
  DocumentStyle,
  DocumentTemplateApi,
  ExportTemplate,
  TemplateExtras,
} from "./types.js";

export class DocumentTemplateAdmin {
  objectTools: HTMLElement | false;
  contentTextarea: HTMLTextAreaElement | false;
  templateDesigner: DocumentTemplateDesigner | false;
  templateExtras: TemplateExtras | false;
  citationStyles: Record<string, string> | false;
  id: number;
  titleInput!: HTMLInputElement;
  titleBlock!: HTMLElement;
  contentImportIdInput!: HTMLInputElement;
  contentImportIdBlock!: HTMLElement;
  contentBlock!: HTMLElement;
  templateDesignerBlock!: HTMLElement;
  documentTemplateApi: DocumentTemplateApi;

  constructor(documentTemplateApi: DocumentTemplateApi) {
    this.objectTools = false;
    this.contentTextarea = false;
    this.templateDesigner = false;
    this.templateExtras = false;
    this.citationStyles = false;
    this.documentTemplateApi = documentTemplateApi;
    const locationParts = window.location.href.split("/");
    let id = Number.parseInt(locationParts[locationParts.length - 3]);
    if (isNaN(id)) {
      id = 0;
    }
    this.id = id;
  }

  init() {
    if (
      window.location.search.length &&
      window.location.search.includes("debug=true")
    ) {
      return;
    }
    ensureCSS([
      staticUrl("css/colors.css"),
      staticUrl("css/document_template_admin.css"),
      staticUrl("css/admin.css"),
      staticUrl("css/fwtoolkit/dialog.css"),
      staticUrl("css/fwtoolkit/buttons.css"),
    ]);
    const csl = new CSL();
    const initialTasks: Array<Promise<unknown>> = [
      whenReady(),
      csl.getStyles().then((styles) => (this.citationStyles = styles)),
    ];
    if (this.id) {
      initialTasks.push(
        this.documentTemplateApi
          .getTemplateExtras({ id: this.id })
          .then((json) => (this.templateExtras = json)),
      );
    }

    Promise.all(initialTasks).then(() => {
      this.objectTools = document.querySelector(
        "ul.object-tools",
      ) as HTMLElement;
      if (!this.objectTools) {
        const mainContent = document.querySelector(
          "#content-main",
        ) as HTMLElement;
        mainContent.insertAdjacentHTML(
          "afterbegin",
          '<ul class="object-tools"></ul>',
        );
        this.objectTools = document.querySelector(
          "ul.object-tools",
        ) as HTMLElement;
      }
      this.titleInput = document.querySelector("#id_title") as HTMLInputElement;
      this.titleBlock = document.querySelector(
        "div.field-title",
      ) as HTMLElement;
      this.contentTextarea = document.querySelector(
        "textarea[name=content]",
      ) as HTMLTextAreaElement;
      this.contentImportIdInput = document.querySelector(
        "#id_import_id",
      ) as HTMLInputElement;
      this.contentImportIdBlock = document.querySelector(
        "div.field-import_id",
      ) as HTMLElement;
      this.contentBlock = document.querySelector(
        "div.field-content",
      ) as HTMLElement;
      this.modifyDOM();
      this.initDesigner();
      this.bind();
    });
  }

  initDesigner() {
    this.templateDesigner = new DocumentTemplateDesigner(
      this.id,
      this.titleInput.value,
      JSON.parse((this.contentTextarea as HTMLTextAreaElement).value),
      ((this.templateExtras as TemplateExtras).document_styles ||
        []) as DocumentStyle[],
      this.citationStyles as Record<string, string>,
      ((this.templateExtras as TemplateExtras).export_templates ||
        []) as ExportTemplate[],
      document.getElementById("template-editor") as HTMLElement,
      this.documentTemplateApi,
    );
    this.templateDesigner.init();
  }

  modifyDOM() {
    this.contentBlock.style.display = "none";
    this.contentImportIdBlock.style.display = "none";
    this.titleBlock.style.display = "none";
    (this.objectTools as HTMLElement).insertAdjacentHTML(
      "beforeend",
      `<li>
                <span class="link" id="toggle-editor">${gettext("Source/Editor")}</span>
            </li>`,
    );
    this.titleBlock.insertAdjacentHTML(
      "beforebegin",
      `<div class="form-row template-editor">
                <ul class="fw-errorlist"></ul>
                <div id="template-editor"></div>
            </div>`,
    );

    this.templateDesignerBlock = document.querySelector(
      "div.template-editor",
    ) as HTMLElement;
  }

  setCurrentValue() {
    const { valid, value, errors, import_id, title } = (
      this.templateDesigner as DocumentTemplateDesigner
    ).getCurrentValue();
    (this.contentTextarea as HTMLTextAreaElement).value = JSON.stringify(value);
    this.contentImportIdInput.value = import_id;
    this.titleInput.value = title;
    this.showErrors(errors);
    return valid;
  }

  showErrors(errors: Record<string, string>) {
    this.templateDesignerBlock.querySelector("ul.fw-errorlist")!.innerHTML =
      Object.values(errors)
        .map((error) => `<li>${escapeText(error)}</li>`)
        .join("");
  }

  bind() {
    document.body.addEventListener("click", (event) => {
      const el: { target?: HTMLElement } = {};
      switch (true) {
        case findTarget(event, "#toggle-editor", el):
          event.preventDefault();
          if (this.contentBlock.style.display === "none") {
            this.contentBlock.style.display = "";
            this.contentImportIdBlock.style.display = "";
            this.titleBlock.style.display = "";
            this.setCurrentValue();
            (this.templateDesigner as DocumentTemplateDesigner).close();
            this.templateDesigner = false;
            this.templateDesignerBlock.style.display = "none";
          } else {
            this.contentBlock.style.display = "none";
            this.contentImportIdBlock.style.display = "none";
            this.titleBlock.style.display = "none";
            this.templateDesignerBlock.style.display = "";
            this.initDesigner();
          }
          break;
        case findTarget(event, "div.submit-row input[type=submit]", el):
          if (
            this.contentBlock.style.display === "none" &&
            !this.setCurrentValue()
          ) {
            event.preventDefault();
          }
          break;
        default:
          break;
      }
    });
  }
}
