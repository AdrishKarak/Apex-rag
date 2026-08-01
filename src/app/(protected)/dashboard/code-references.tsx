'use client'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { lucario } from 'react-syntax-highlighter/dist/esm/styles/prism'
import React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  filesReferences: { fileName: string; sourceCode: string; summary: string }[]
}

const CodeReferences = ({ filesReferences }: Props) => {
  const [tab, setTab] = React.useState(filesReferences[0]?.fileName)

  React.useEffect(() => {
    if (filesReferences.length > 0) {
      const hasTab = filesReferences.some(f => f.fileName === tab)
      if (!hasTab || !tab) {
        setTab(filesReferences[0]?.fileName)
      }
    }
  }, [filesReferences, tab])

  if (filesReferences.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-3">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto flex gap-1 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800/50 scrollbar-none">
          {filesReferences.map(file => (
            <button
              onClick={() => setTab(file.fileName)}
              key={file.fileName}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap transition-all duration-200",
                tab === file.fileName
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800/80 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-900/40 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              {file.fileName.split('/').pop()}
            </button>
          ))}
        </div>
        {filesReferences.map(file => (
          <TabsContent
            key={file.fileName}
            value={file.fileName}
            className="mt-2 max-h-[50vh] overflow-auto rounded-lg border border-[#2d3748] dark:border-zinc-800 bg-[#2d3748] dark:bg-[#1a202c]"
          >
            <div className="bg-[#242c3a] dark:bg-[#151a24] px-4 py-2 border-b border-[#202733] dark:border-zinc-800/80 text-xs font-mono text-zinc-300 dark:text-zinc-400 flex justify-between items-center">
              <span>{file.fileName}</span>
            </div>
            <div className="text-xs">
              <SyntaxHighlighter
                language="typescript"
                style={lucario}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                }}
              >
                {file.sourceCode}
              </SyntaxHighlighter>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default CodeReferences