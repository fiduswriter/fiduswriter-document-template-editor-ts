import { Dialog, escapeText, findTarget, gettext } from "fwtoolkit"

import type {
    DocumentStyle,
    DocumentTemplateApi,
    SaveDocumentStyleResponse
} from "./types.js"

export class DocumentStyleDialog {
    id: number
    style: DocumentStyle | undefined
    documentTemplateId: number
    allStyles: DocumentStyle[]
    refresh: () => void
    documentTemplateApi: DocumentTemplateApi

    addedFiles: File[]
    deletedFiles: string[]
    dialog!: Dialog

    constructor(
        id: number,
        style: DocumentStyle | undefined,
        documentTemplateId: number,
        allStyles: DocumentStyle[],
        refresh: () => void,
        documentTemplateApi: DocumentTemplateApi
    ) {
        this.id = id
        this.style = style
        this.documentTemplateId = documentTemplateId
        this.allStyles = allStyles
        this.refresh = refresh
        this.documentTemplateApi = documentTemplateApi

        this.addedFiles = []
        this.deletedFiles = []
    }

    init() {
        const buttons = [
            {
                text: gettext("Save"),
                classes: "fw-dark",
                click: () => {
                    const { title, slug, contents, errors } =
                        this.getCurrentValue()
                    if (errors.length) {
                        this.showErrors(errors)
                        return
                    }
                    this.save({ title, slug, contents })
                        .then((json: SaveDocumentStyleResponse) => {
                            const docStyle = json.doc_style[0]
                            const pk = docStyle.pk
                            const oldStyleIndex = this.allStyles.findIndex(
                                style => style.pk === pk
                            )
                            if (oldStyleIndex > -1) {
                                this.allStyles.splice(
                                    oldStyleIndex,
                                    1,
                                    docStyle
                                )
                            } else {
                                this.allStyles.push(docStyle)
                            }
                            this.refresh()
                            this.dialog.close()
                        })
                        .catch(response => {
                            if (response.json) {
                                response
                                    .json()
                                    .then(
                                        (json: {
                                            errors?: Record<string, string[]>
                                        }) => {
                                            if (json.errors) {
                                                const errors: string[] = []
                                                Object.keys(
                                                    json.errors
                                                ).forEach(key => {
                                                    json.errors![key].forEach(
                                                        error =>
                                                            errors.push(
                                                                `${key}: ${error}`
                                                            )
                                                    )
                                                })
                                                this.showErrors(errors)
                                            }
                                        }
                                    )
                            } else {
                                throw response
                            }
                        })
                }
            },
            { type: "cancel" as const }
        ]
        if (this.allStyles.length > 1 && this.id) {
            buttons.unshift({
                text: gettext("Delete"),
                classes: "fw-orange",
                click: () => this.deleteStyleDialog()
            })
        }
        this.dialog = new Dialog({
            id: "document-style-dialog",
            title: gettext("Document style"),
            body: `<table class="fw-dialog-table"><tbody>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Title")}</h4></th>
                    <td>
                        <input class="title" type="text" value="${this.style ? escapeText(this.style.fields.title) : ""}">
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Slug")}</h4></th>
                    <td>
                        <input class="slug" type="text" value="${this.style ? escapeText(this.style.fields.slug) : ""}">
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("CSS Style")}</h4></th>
                    <td>
                        <textarea class="contents">${this.style ? escapeText(this.style.fields.contents) : ""}</textarea>
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Files")}</h4></th>
                    <td>
                        <table><tbody class="document-style-files">${
                            this.style
                                ? `${this.style.fields.documentstylefile_set
                                      .map(
                                          ([url, title]) =>
                                              `<tr>
                                            <td><a href="${url}">${escapeText(title)}</a></td>
                                            <td><span class="fw-link-text"><i class="fa-solid fa-trash-alt delete-document-style-file" data-filename="${escapeText(title)}"></i></span></td>
                                        </tr>`
                                      )
                                      .join("<br>")}`
                                : ""
                        }</tbody></table>
                        <button type="button" class="fw-media-select-button fw-button fw-light">
                            ${gettext("Add a file")}
                        </button>
                        <input name="image" type="file" class="fw-media-file-input">
                    </td>
                </tr>
                </tbody></table>
                <ul class="fw-errorlist"></ul>`,
            buttons
        })

        this.dialog.open()
        this.bind()
    }

    showErrors(errors: string[]) {
        this.dialog.dialogEl.querySelector("ul.fw-errorlist")!.innerHTML =
            errors.map(error => `<li>${escapeText(error)}</li>`).join("")
    }

    deleteStyle() {
        this.documentTemplateApi
            .deleteDocumentStyle(this.id)
            .then(() => {
                const oldStyleIndex = this.allStyles.findIndex(
                    style => style.pk === this.id
                )
                if (!(typeof oldStyleIndex === "undefined")) {
                    this.allStyles.splice(oldStyleIndex, 1)
                    this.refresh()
                }
                this.dialog.close()
            })
            .catch(response => {
                if (response.json) {
                    response
                        .json()
                        .then((json: { errors?: Record<string, string[]> }) => {
                            if (json.errors) {
                                const errors: string[] = []
                                Object.keys(json.errors).forEach(key => {
                                    json.errors![key].forEach(error =>
                                        errors.push(`${key}: ${error}`)
                                    )
                                })
                                this.showErrors(errors)
                            }
                        })
                } else {
                    throw response
                }
            })
    }

    deleteStyleDialog() {
        const buttons = [
            {
                text: gettext("Delete"),
                classes: "fw-dark",
                click: () => {
                    dialog.close()
                    this.deleteStyle()
                }
            },
            {
                type: "cancel" as const
            }
        ]
        const dialog = new Dialog({
            id: "confirmdeletion",
            icon: "exclamation-triangle",
            title: gettext("Confirm deletion"),
            body: `<p>${gettext("Do you really want to delete the document style?")}</p>`,
            height: 180,
            buttons
        })
        dialog.open()
    }

    getCurrentValue() {
        const errors: string[] = []

        const title = (
            this.dialog.dialogEl.querySelector(".title") as HTMLInputElement
        ).value
        const slug = (
            this.dialog.dialogEl.querySelector(".slug") as HTMLInputElement
        ).value
        const contents = (
            this.dialog.dialogEl.querySelector(
                ".contents"
            ) as HTMLTextAreaElement
        ).value

        if (!title.length || !slug.length || !contents.length) {
            errors.push(gettext("All fields need to be filled out."))
        }
        if (!/^[A-Za-z0-9\-_]+$/.test(slug)) {
            errors.push(
                gettext(
                    "A slug can only contain letters, numbers, hyphens and underscores."
                )
            )
        }
        if (
            this.allStyles.find(
                style => style.fields.slug === slug && style.pk !== this.id
            )
        ) {
            errors.push(gettext("The slug has to be unique."))
        }
        return { title, slug, contents, errors }
    }

    save({
        title,
        slug,
        contents
    }: {
        title: string
        slug: string
        contents: string
    }) {
        return this.documentTemplateApi.saveDocumentStyle(
            {
                id: this.id,
                title,
                slug,
                contents,
                template_id: this.documentTemplateId,
                deleted_files: this.deletedFiles
            },
            {
                added_files: this.addedFiles
            }
        )
    }

    bind() {
        const mediaInputSelector = this.dialog.dialogEl.querySelector(
            ".fw-media-file-input"
        ) as HTMLInputElement
        this.dialog.dialogEl.addEventListener("click", event => {
            const el: { target?: HTMLElement } = {}
            switch (true) {
                case findTarget(event, ".delete-document-style-file", el): {
                    event.preventDefault()
                    this.deletedFiles.push(el.target!.dataset.filename!)
                    const tr = el.target!.closest("tr")
                    tr!.parentElement!.removeChild(tr!)
                    break
                }
                case findTarget(event, ".delete-new-document-style-file", el): {
                    event.preventDefault()
                    const tr = el.target!.closest("tr")
                    let count = 0,
                        findTr: Element | null = tr
                    while (
                        findTr!.previousElementSibling!.classList.contains(
                            "new-document-style-file"
                        )
                    ) {
                        findTr = findTr!.previousElementSibling
                        count++
                    }
                    this.addedFiles.splice(count, 1)
                    tr!.parentElement!.removeChild(tr!)
                    break
                }
                case findTarget(event, ".fw-media-select-button", el): {
                    event.preventDefault()
                    mediaInputSelector.click()
                    break
                }
            }
        })

        mediaInputSelector.addEventListener("change", () => {
            this.showErrors([])
            const mediaInput = mediaInputSelector.files![0]
            if (!mediaInput) {
                return
            }
            let currentFiles = this.addedFiles.map(file => file.name).join(",")
            if (this.style) {
                currentFiles +=
                    "," +
                    this.style.fields.documentstylefile_set
                        .filter(
                            ([_url, name]) => !this.deletedFiles.includes(name)
                        )
                        .map(([_url, name]) => name)
                        .join(",")
            }
            if (currentFiles.includes(mediaInput.name)) {
                this.showErrors([
                    gettext("A file with the same name exists already.")
                ])
                return
            }

            this.addedFiles.push(mediaInput)
            this.dialog.dialogEl.querySelector(
                ".document-style-files"
            )!.innerHTML += `<tr class="new-document-style-file">
                    <td>${escapeText(mediaInput.name)}</td>
                    <td><span class="fw-link-text"><i class="fa-solid fa-trash-alt delete-new-document-style-file"></i></span></td>
                </tr>`
        })
    }
}
