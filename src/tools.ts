import { randomHeadingId } from "@fiduswriter/document/schema/common/index"
import type { Node, NodeType } from "prosemirror-model"
import type { EditorView } from "prosemirror-view"

import type { FidusNode } from "@fiduswriter/document"

// from https://codeburst.io/throttling-and-debouncing-in-javascript-646d076d0a44
export function debounced(delay: number, fn: (...args: unknown[]) => void) {
    let timerId: ReturnType<typeof setTimeout> | undefined
    return (...args: unknown[]) => {
        if (timerId) {
            clearTimeout(timerId)
        }
        timerId = setTimeout(() => {
            fn(...args)
            timerId = undefined
        }, delay)
    }
}

export function noTrack(node: FidusNode): FidusNode {
    if (node.attrs?.track) {
        delete node.attrs.track
        if (!Object.keys(node.attrs).length) {
            delete node.attrs
        }
    }
    if (node.content) {
        node.content.forEach(child => noTrack(child))
    }
    return node
}

export function addHeadingIds(
    oldState: EditorView["state"],
    newState: EditorView["state"],
    editors: Array<[HTMLElement, EditorView]>
) {
    const newHeadings: Array<{ pos: number; node: Node }> = [],
        usedHeadingIds: string[] = []

    editors.forEach(([_el, view]) => {
        if (view.state === oldState) {
            return
        }
        view.state.doc.descendants(node => {
            if (
                (node.type as NodeType & { groups: string[] }).groups.includes(
                    "heading"
                )
            ) {
                usedHeadingIds.push(node.attrs.id as string)
            }
        })
    })
    newState.doc.descendants((node, pos) => {
        if (
            (node.type as NodeType & { groups: string[] }).groups.includes(
                "heading"
            )
        ) {
            if (
                node.attrs.id === false ||
                usedHeadingIds.includes(node.attrs.id as string)
            ) {
                newHeadings.push({ pos, node })
            } else {
                usedHeadingIds.push(node.attrs.id as string)
            }
        }
    })
    if (!newHeadings.length) {
        return null
    }
    const newTr = newState.tr
    newHeadings.forEach(newHeading => {
        let id: string | undefined
        while (!id || usedHeadingIds.includes(id)) {
            id = randomHeadingId()
        }
        usedHeadingIds.push(id)
        newTr.setNodeMarkup(
            newHeading.pos,
            null,
            Object.assign({}, newHeading.node.attrs, { id })
        )
    })
    return newTr
}
