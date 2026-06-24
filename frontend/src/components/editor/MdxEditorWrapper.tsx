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
  InsertTable,
  InsertThematicBreak,
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
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <BlockTypeSelect />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <ListsToggle />
                  <CreateLink />
                  <InsertCodeBlock />
                  <InsertTable />
                  <InsertThematicBreak />
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
