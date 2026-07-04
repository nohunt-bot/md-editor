import { forwardRef, useImperativeHandle } from 'react'
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  frontmatterPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  InsertCodeBlock,
  ListsToggle,
  CreateLink
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import './MdxEditorWrapper.css'

interface MdxEditorWrapperProps {
  markdown: string
  onChange: (markdown: string) => void
  readOnly?: boolean
}

export const MdxEditorWrapper = forwardRef<MDXEditorMethods, MdxEditorWrapperProps>(
  ({ markdown, onChange, readOnly = false }, ref) => {
    useImperativeHandle(ref, () => {
      return {} as MDXEditorMethods
    }, [])

    return (
      <div className="mdx-editor-container">
        <MDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          readOnly={readOnly}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
            frontmatterPlugin(),
            // Phase 2.5 (ADR editor-feature-reduction): toolbar limited to
            // headings, bold/italic (no underline), lists, links, code block.
            // Image/table/thematic-break authoring removed. Rendering plugins
            // above are kept so pasted markdown with those constructs survives
            // as content and is not corrupted.
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <BlockTypeSelect />
                  <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                  <CodeToggle />
                  <ListsToggle />
                  <CreateLink />
                  <InsertCodeBlock />
                </>
              )
            })
          ]}
          contentEditableClassName="mdx-editor-content"
        />
      </div>
    )
  }
)

MdxEditorWrapper.displayName = 'MdxEditorWrapper'

export type { MDXEditorMethods }
