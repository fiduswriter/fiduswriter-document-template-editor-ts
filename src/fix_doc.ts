import deepEqual from "fast-deep-equal"

import type { FidusNode } from "@fiduswriter/document"
import { toFullJSON } from "@fiduswriter/document/schema/mini_json"
import type { Schema } from "prosemirror-model"

function cleanFootnotes(node: FidusNode, elements: string[], marks: string[]) {
    if (node.attrs?.footnote) {
        // We remove forbidden block nodes
        node.attrs.footnote = (node.attrs.footnote as FidusNode[]).filter(
            node => !elements.includes(node.type)
        )
        // We remove forbidden marks + inline nodes
        ;(node.attrs.footnote as FidusNode[]).forEach(subNode =>
            cleanNode(subNode, elements, marks)
        )
    }
    if (node.content) {
        node.content.forEach(subNode =>
            cleanFootnotes(subNode, elements, marks)
        )
    }
}

function cleanNode(node: FidusNode, elements: string[], marks: string[]) {
    if (node.marks) {
        // remove forbidden marks
        node.marks = node.marks.filter(mark => !marks.includes(mark.type))
        if (!node.marks.length) {
            delete node.marks
        }
    }
    if (node.content) {
        // remove forbidden elements
        node.content = node.content.filter(
            node => !elements.includes(node.type)
        )
        node.content.forEach(subNode => cleanNode(subNode, elements, marks))
        if (!node.content.length) {
            delete node.content
        }
    }
}

export function adjustDocToTemplate(
    miniDoc: FidusNode,
    miniTemplate: FidusNode,
    documentStyleSlugs: string[],
    schema: Schema
) {
    const doc = toFullJSON(
            miniDoc as unknown as Record<string, unknown>,
            schema
        ) as unknown as FidusNode,
        template = toFullJSON(
            miniTemplate as unknown as Record<string, unknown>,
            schema
        ) as unknown as FidusNode,
        docAttrs = doc.attrs!,
        templateAttrs = template.attrs!,
        removedFootnoteElements = (
            docAttrs.footnote_elements as string[]
        ).filter(
            element =>
                !(templateAttrs.footnote_elements as string[]).includes(element)
        ),
        removedFootnoteMarks = (docAttrs.footnote_marks as string[]).filter(
            mark => !(templateAttrs.footnote_marks as string[]).includes(mark)
        ),
        attrs = [
            "footnote_marks",
            "footnote_elements",
            "languages",
            "citationstyles",
            "papersizes",
            "bibliography_header",
            "template",
            "import_id",
            "code_categories",
            "id_types"
        ]
    attrs.forEach(attr => (docAttrs[attr] = templateAttrs[attr]))

    if (
        !(docAttrs.citationstyles as string[]).includes(
            docAttrs.citationstyle as string
        )
    ) {
        if (!(docAttrs.citationstyles as string[]).length) {
            throw new Error("Document template allows no citation styles.")
        }
        docAttrs.citationstyle = templateAttrs.citationstyle
    }

    if (
        !(docAttrs.languages as string[]).includes(docAttrs.language as string)
    ) {
        if (!(docAttrs.languages as string[]).length) {
            throw new Error("Document template allows no languages.")
        }
        docAttrs.language = templateAttrs.language
    }

    if (
        !(docAttrs.papersizes as string[]).includes(
            docAttrs.papersize as string
        )
    ) {
        if (!(docAttrs.papersizes as string[]).length) {
            throw new Error("Document template allows no paper sizes.")
        }
        docAttrs.papersize = (docAttrs.papersizes as string[])[0]
    }

    if (!documentStyleSlugs.includes(docAttrs.documentstyle as string)) {
        if (!documentStyleSlugs.length) {
            docAttrs.documentstyle = false
        } else {
            docAttrs.documentstyle = documentStyleSlugs[0]
        }
    }

    if (
        !(docAttrs.citationstyles as string[]).includes(
            docAttrs.citationstyle as string
        )
    ) {
        if (!(docAttrs.citationstyles as string[]).length) {
            throw new Error(
                "No citation styles have been defined for document template."
            )
        }
        docAttrs.citationstyle = (docAttrs.citationstyles as string[])[0]
    }

    if (removedFootnoteMarks.length || removedFootnoteElements.length) {
        cleanFootnotes(doc, removedFootnoteElements, removedFootnoteMarks)
    }

    const oldContent = doc.content!
    doc.content = [
        oldContent.shift() as FidusNode // The title
    ]

    let movedParts: FidusNode[] = []

    if (template.content) {
        template.content.slice(1).forEach(part => {
            const partAttrs = part.attrs!
            let oldNode = oldContent.find(
                oldContentNode =>
                    oldContentNode.type === part.type &&
                    oldContentNode.attrs!.id === partAttrs.id
            )
            if (oldNode) {
                while (oldNode !== oldContent[0]) {
                    const firstOldContent = oldContent.shift() as FidusNode,
                        firstAttrs = firstOldContent.attrs!,
                        inTemplate = !!template.content!.find(
                            part =>
                                part.type === firstOldContent.type &&
                                part.attrs!.id === firstAttrs.id
                        )
                    if (inTemplate) {
                        movedParts.push(firstOldContent)
                    } else if (
                        firstOldContent.content &&
                        !firstAttrs.hidden &&
                        firstAttrs.locking !== "fixed" &&
                        !(
                            // table with just first row, which is fixed.
                            firstAttrs.locking === "header" &&
                            firstOldContent.content.length === 1
                        ) &&
                        !(
                            // heading/richtext with just the default content
                            firstAttrs.elements &&
                            firstOldContent.content.length === 1 &&
                            firstOldContent.content[0].type ===
                                (firstAttrs.elements as string[])[0] &&
                            !firstOldContent.content[0].content
                        )
                    ) {
                        firstAttrs.deleted = true
                        doc.content!.push(firstOldContent)
                    }
                }
                oldContent.shift()
            } else {
                oldNode = movedParts.find(
                    oldContentNode =>
                        oldContentNode.type === part.type &&
                        oldContentNode.attrs!.id === partAttrs.id
                )
                if (oldNode) {
                    movedParts = movedParts.filter(
                        oldContentNode => oldContentNode !== oldNode
                    )
                }
            }
            if (oldNode) {
                const newNode = Object.assign({}, oldNode, {
                    attrs: {}
                }) as FidusNode
                const newAttrs = newNode.attrs!
                Object.entries(partAttrs).forEach(([key, value]) => {
                    newAttrs[key] = value
                })
                if (newAttrs.optional) {
                    newAttrs.hidden = oldNode.attrs!.hidden
                }
                if (
                    (newAttrs.initial || oldNode.attrs!.initial) &&
                    (oldNode.attrs!.locking === "fixed" ||
                        deepEqual(
                            oldNode.attrs!.initial || {},
                            oldNode.content || {}
                        ))
                ) {
                    if (newAttrs.initial) {
                        newNode.content = newAttrs.initial as FidusNode[]
                    } else {
                        delete newNode.content
                    }
                }

                if (oldNode.attrs!.elements) {
                    // parts that define elements also define marks.
                    const removedElements = (
                        oldNode.attrs!.elements as string[]
                    ).filter(
                        element =>
                            !(newAttrs.elements as string[]).includes(element)
                    )
                    const removedMarks = (
                        oldNode.attrs!.marks as string[]
                    ).filter(
                        mark => !(newAttrs.marks as string[]).includes(mark)
                    )
                    if (removedElements.length || removedMarks.length) {
                        cleanNode(newNode, removedElements, removedMarks)
                        if (
                            !newNode.content &&
                            ["richtext_part", "heading_part"].includes(
                                part.type
                            )
                        ) {
                            newNode.content = [
                                { type: (partAttrs.elements as string[])[0] }
                            ]
                        } else if (
                            !newNode.content &&
                            part.type === "table_part"
                        ) {
                            newNode.content = [
                                {
                                    type: "table",
                                    content: [
                                        { type: "table_caption" },
                                        {
                                            type: "table_body",
                                            content: [
                                                {
                                                    type: "table_row",
                                                    content: [
                                                        {
                                                            type: "table_cell",
                                                            content: [
                                                                {
                                                                    type: "paragraph"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
                doc.content!.push(newNode)
            } else {
                // The node is new and didn't exist in the old document.
                doc.content!.push(JSON.parse(JSON.stringify(part)))
            }
        })
    }

    // move remaining oldContent items that were not in template.
    while (oldContent.length) {
        const newNode = oldContent.shift() as FidusNode
        const attrs = Object.assign({}, newNode.attrs)
        if (attrs.hasOwnProperty("deleted")) {
            newNode.attrs!.deleted = true
            doc.content!.push(newNode)
        }
    }
    return doc
}
