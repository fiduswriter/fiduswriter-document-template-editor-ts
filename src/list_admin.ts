import {
    ensureCSS,
    escapeText,
    findTarget,
    gettext,
    staticUrl,
    whenReady
} from "fwtoolkit"

import type { DocumentTemplateApi } from "./types.js"
import { DocumentTemplateExporter } from "./exporter.js"
import { DocumentTemplateImporter } from "./importer.js"

export class DocumentTemplateListAdmin {
    settings: Record<string, unknown>
    documentTemplateApi: DocumentTemplateApi
    objectTools: HTMLElement | false
    actionDropdown: HTMLSelectElement | false
    templateDesignerBlock!: HTMLElement

    constructor(
        settings: Record<string, unknown>,
        documentTemplateApi: DocumentTemplateApi
    ) {
        this.settings = settings
        this.documentTemplateApi = documentTemplateApi
        this.objectTools = false
        this.actionDropdown = false
    }

    init() {
        if (
            window.location.search.length &&
            window.location.search.includes("debug=true")
        ) {
            return
        }
        ensureCSS([
            staticUrl("css/document_template_admin.css"),
            staticUrl("css/admin.css")
        ])

        whenReady().then(() => {
            this.objectTools = document.querySelector(
                "ul.object-tools"
            ) as HTMLElement
            this.actionDropdown = document.querySelector(
                'select[name="action"]'
            ) as HTMLSelectElement
            this.modifyDOM()
            this.bind()
        })
    }

    modifyDOM() {
        if (this.objectTools) {
            this.objectTools.insertAdjacentHTML(
                "beforeend",
                `<li>
                    <span class="link" id="upload-template">${gettext("Upload FIDUSTEMPLATE")}</span>
                </li>`
            )
        }
        if (this.actionDropdown) {
            this.actionDropdown.insertAdjacentHTML(
                "beforeend",
                `<option value="download">${gettext("Download selected as FIDUSTEMPLATE")}</option>`
            )
        }
    }

    showErrors(errors: Record<string, string>) {
        this.templateDesignerBlock.querySelector("ul.fw-errorlist")!.innerHTML =
            Object.values(errors)
                .map(error => `<li>${escapeText(error)}</li>`)
                .join("")
    }

    bind() {
        document.body.addEventListener("click", event => {
            const el: { target?: HTMLElement } = {}
            switch (true) {
                case findTarget(event, "#upload-template", el): {
                    event.preventDefault()
                    const fileSelector = document.createElement("input")
                    fileSelector.id = "fidus-template-uploader"
                    fileSelector.setAttribute("type", "file")
                    fileSelector.setAttribute("multiple", "")
                    fileSelector.setAttribute("accept", ".fidustemplate")
                    document.body.appendChild(fileSelector)
                    fileSelector.click()
                    fileSelector.addEventListener("change", () => {
                        const files = Array.from(
                            fileSelector.files || []
                        ).filter(file => {
                            //TODO: This is an arbitrary size. What should be done with huge import files?
                            if (
                                (file as File & { length?: number }).length ===
                                    0 ||
                                file.size > 104857600
                            ) {
                                return false
                            }
                            return true
                        })
                        Promise.all(
                            files.map(file => {
                                const importer = new DocumentTemplateImporter(
                                    file,
                                    this.documentTemplateApi
                                )
                                return importer.init()
                            })
                        ).then(() => window.location.reload())
                    })
                    break
                }
                case findTarget(
                    event,
                    "button[type=submit], input[type=submit]",
                    el
                ):
                    if (
                        (this.actionDropdown as HTMLSelectElement).value ===
                        "download"
                    ) {
                        event.preventDefault()
                        const ids = Array.from(
                            document.querySelectorAll(
                                '#result_list tr.selected input[type="checkbox"], #result_list tr.fw-selected input[type="checkbox"]'
                            )
                        ).map(el =>
                            Number.parseInt((el as HTMLInputElement).value)
                        )
                        ids.forEach(id => {
                            const exporter = new DocumentTemplateExporter(
                                id,
                                this.documentTemplateApi
                            )
                            exporter.init()
                        })
                    }
                    break
                default:
                    break
            }
        })
    }
}
