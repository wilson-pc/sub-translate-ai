//ciertamente has cuidado bien
'use client'
import { getSubFileByIdAtom, updateSubFileStateAtom } from '@/store'
import { useAtom } from 'jotai/react'
import Image from 'next/image'
import { Trash, Plus } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { restoreDialogsToASS, triggerFileDownload } from '@/utils/ass'

export default function Edit() {
  const param = useParams()
  const router = useRouter()
  const [getSubFileById] = useAtom(getSubFileByIdAtom)
  const subFile = getSubFileById(param.id as string)
  const [, updateSubFileState] = useAtom(updateSubFileStateAtom)

  useEffect(() => {
    if (param.id) {
      const rs = getSubFileById(param.id as string)
      if (!rs) {
        router.push('/')
      }
    }
  }, [param.id,getSubFileById,router])

  const download = async () => {
    const filename = `${subFile?.filename.replaceAll('.ass', '')}_es.ass`
    const restored = restoreDialogsToASS(
      subFile?.original ?? '',
      subFile?.splitTranslated ?? []
    )
    triggerFileDownload(filename, restored)
  }

  const addRow = (index: number) => {
    if (subFile) {
      const newTranslated = [...(subFile.splitTranslated || [])]
      newTranslated.splice(index + 1, 0, '')

      updateSubFileState({
        ...subFile,
        splitTranslated: newTranslated
      })
    }
  }

  const removeRow = (index: number) => {
    if (subFile && subFile.splitTranslated) {
      const newTranslated = [...subFile.splitTranslated]
      newTranslated.splice(index, 1)

      updateSubFileState({
        ...subFile,
        splitTranslated: newTranslated
      })
    }
  }
  const handleTranslatedChange = (index: number, value: string) => {
    if (subFile) {
      const newTranslated = [...(subFile.splitTranslated || [])]
      newTranslated[index] = value

      updateSubFileState({
        ...subFile,
        splitTranslated: newTranslated
      })
    }
  }

  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
      <div>
        <div>
          <h4>{subFile?.filename}</h4>
        </div>
        <br />
        <div className='flex justify-center w-full'>
          <h4>{subFile?.split.length}/{subFile?.splitTranslated?.length}</h4>
        </div>
      </div>
      <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start w-full'>
        <div className='w-full'>
          {/* Create rows based on the maximum length of either array */}
          {Array.from({
            length: Math.max(
              (subFile?.split || []).length,
              (subFile?.splitTranslated || []).length
            )
          }).map((_, index) => {
            const originalDialog = subFile?.split[index] || ''
            const translatedDialog = subFile?.splitTranslated?.[index] || ''

            return (
              <div
                key={index}
                className='grid grid-cols-[auto_1fr_1fr] gap-4 mb-4 w-full'
              >
                <div className='flex items-center justify-center'>
                  <span className='font-bold text-lg'>{index + 1}</span>
                </div>
                <div className='flex items-start gap-2'>
                  <div className='w-full'>
                    <textarea
                      className='w-full p-2 border rounded-lg text-black overflow-hidden resize-none'
                      value={originalDialog}
                      disabled
                      rows={originalDialog.split('\n').length}
                    ></textarea>
                  </div>
                </div>

                <div className='flex items-start gap-2'>
                  <div className='w-full'>
                    <textarea
                      className='w-full p-2 border rounded-lg text-black overflow-hidden resize-none'
                      value={translatedDialog}
                      rows={translatedDialog.split('\n').length}
                      onChange={(e) =>
                        handleTranslatedChange(index, e.target.value)
                      }
                    ></textarea>
                  </div>
                  <div className='flex flex-row gap-2'>
                    <button
                      onClick={() => removeRow(index)}
                      className='p-2 bg-red-600 text-white rounded-lg'
                      aria-label='Borrar'
                    >
                      <Trash size={18} />
                    </button>
                    <button
                      onClick={() => {
                        addRow(index)
                      }}
                      className='p-2 bg-blue-600 text-white rounded-lg'
                      aria-label='Agregar Fila'
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
   
          <div className='flex justify-center w-full'>
            <button
              className='px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700'
              onClick={() => {
                download()
              }}
            >
              Descargar
            </button>
          </div>
     
      </main>
     
      <footer className='row-start-3 flex gap-6 flex-wrap items-center justify-center'>
        <a
          className='flex items-center gap-2 hover:underline hover:underline-offset-4'
          href='https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
          target='_blank'
          rel='noopener noreferrer'
        >
          <Image
            aria-hidden
            src='/file.svg'
            alt='File icon'
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className='flex items-center gap-2 hover:underline hover:underline-offset-4'
          href='https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
          target='_blank'
          rel='noopener noreferrer'
        >
          <Image
            aria-hidden
            src='/window.svg'
            alt='Window icon'
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className='flex items-center gap-2 hover:underline hover:underline-offset-4'
          href='https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
          target='_blank'
          rel='noopener noreferrer'
        >
          <Image
            aria-hidden
            src='/globe.svg'
            alt='Globe icon'
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  )
}
