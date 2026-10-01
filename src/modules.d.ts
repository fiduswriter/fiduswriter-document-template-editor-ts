/**
 * Ambient type declarations for dependencies that do not ship their own types.
 */

declare module "sortablejs" {
    export interface SortableEvent extends Event {
        item: HTMLElement
        to: HTMLElement
        from: HTMLElement
        oldIndex: number | undefined
        newIndex: number | undefined
    }

    export interface SortableOptions {
        group?:
            string | {name?: string; pull?: boolean | "clone"; put?: boolean}
        sort?: boolean
        handle?: string
        onAdd?: (event: SortableEvent) => void
        onUpdate?: (event: SortableEvent) => void
        onRemove?: (event: SortableEvent) => void
        onStart?: (event: SortableEvent) => void
        onEnd?: (event: SortableEvent) => void
        [key: string]: unknown
    }

    export default class Sortable {
        constructor(element: HTMLElement | null, options?: SortableOptions)
        static create(
            element: HTMLElement | null,
            options?: SortableOptions
        ): Sortable
        destroy(): void
    }
}

declare module "downloadjs" {
    /**
     * Trigger a browser download of the given data.
     * @param data - File content (Blob or string).
     * @param filename - Suggested filename for the download.
     * @param mimeType - MIME type of the data.
     */
    function download(
        data: Blob | string,
        filename?: string,
        mimeType?: string
    ): void
    export default download
}

declare module "@fiduswriter/document/state_plugins" {
    import type {Node} from "prosemirror-model"
    import type {EditorView, NodeView} from "prosemirror-view"

    type GetPos = () => number | undefined

    export class TagsPartView implements NodeView {
        constructor(node: Node, view: EditorView, getPos: GetPos)
        node: Node
        view: EditorView
        getPos: GetPos
        dom: HTMLElement
        contentDOM: HTMLElement
        update(node: Node): boolean
        ignoreMutation(_record: MutationRecord | unknown): boolean
    }

    export class ContributorsPartView implements NodeView {
        constructor(node: Node, view: EditorView, getPos: GetPos)
        node: Node
        view: EditorView
        getPos: GetPos
        dom: HTMLElement
        contentDOM: HTMLElement
        update(node: Node): boolean
        ignoreMutation(_record: MutationRecord | unknown): boolean
    }
}
