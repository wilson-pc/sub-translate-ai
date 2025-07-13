/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */

//ciertamente has cuidado bien
'use client'
import { db } from '@/db/db'
import { SubFile } from '@/models'
import { subFileAtom, updateSubFileStateAtom } from '@/store'
import { restoreDialogsToASS, triggerFileDownload } from '@/utils/ass'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAtom } from 'jotai/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
const head = typeof window !== 'undefined' ? localStorage.getItem('apiKey') : 'fgvr';
const modele = typeof window !== 'undefined' ? localStorage.getItem('model') : 'fiewio';
const genAI = new GoogleGenerativeAI(head??'')
const model = genAI.getGenerativeModel({
  model: modele??'grtegt'
})

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function translateSub(text: string) {
  const result = await model.generateContent(
    `Translate this subtitle into Latin American Spanish. The dialogues come from an SRT file, and they are separated by "|||".  

${text}  

Maintain the context while translating. If there are incomplete words, symbols, or strange characters, leave them as they are and do not remove them.  
**VERY IMPORTANT: Do not remove any dialogue. Each dialogue in the original text must have its corresponding translation. Dialogues cannot be added or removed. Make sure the translation maintains the same number of dialogues as the original text.**  
**Dialogues cannot be removed.**`
  )
  return result.response.text()
}

async function trAss(text: string) {
  const result = await model.generateContent(
    `Translate this subtitle into Latin American Spanish. The dialogues is in .ass format.  

${text}  

Maintain the context while translating. If there are incomplete words, symbols, or strange characters, leave them as they are and do not remove them.`
  )
  return result.response.text()
}
async function translateSubByDialog(text: string) {
  const dialogs = text.split('@')
  const dialogsTranslated = []

  for (const element of dialogs) {
    const result = await model.generateContent(
      `Traduce el siguiente dialogo, viene de un archivo de subtitulo
                                 
               ${element}
               
        Si hay palabras incompletas, símbolos o caracteres raros, déjalos así y no los borres`
    )
    const response = result.response.text()
    dialogsTranslated.push(response)
    await timeout(10000)
  }

  return dialogsTranslated.join('@')
}

const readFileContents = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }

    reader.onerror = (e) => {
      reject(e)
    }

    reader.readAsText(file)
  })
}

function reemplazarTiemposSrt(texto: string) {
  // Expresión regular para encontrar los indicadores de tiempo
  const patronTiempo = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g
  // Reemplazar con un marcador único, por ejemplo [T]
  return texto.replace(patronTiempo, '[T]')
}

function quitarNumerosYTiempos(texto: string) {
  const lineas = texto.split('\n')
  const soloTexto = []
  let i = 0

  while (i < lineas.length) {
    // Saltar la línea del número de entrada
    i++
    // Saltar la línea del tiempo
    i++
    // Extraer todas las líneas de texto hasta la siguiente entrada
    while (i < lineas.length && lineas[i].trim() !== '') {
      soloTexto.push(lineas[i].trim())
      i++
    }
    // Saltar la línea vacía (si existe)
    if (lineas[i] && lineas[i].trim() === '') {
      i++
    }
  }

  return soloTexto.join('\n')
}
// Función para restaurar números y tiempos
function restaurarNumerosYTiempos(
  textoProcesado: string,
  textoOriginal: string
) {
  const lineasOriginales = textoOriginal.split('\n')
  const lineasProcesadas = textoProcesado.split('\n')
  const resultado = []
  let i = 0
  let j = 0

  while (i < lineasOriginales.length) {
    // Agregar el número de entrada
    resultado.push(lineasOriginales[i].trim())
    i++
    // Agregar la línea del tiempo
    resultado.push(lineasOriginales[i].trim())
    i++
    // Agregar todas las líneas de texto procesado
    while (i < lineasOriginales.length && lineasOriginales[i].trim() !== '') {
      resultado.push(lineasProcesadas[j].trim())
      j++
      i++
    }
    // Agregar una línea vacía (si existe en el original)
    if (lineasOriginales[i] && lineasOriginales[i].trim() === '') {
      resultado.push('')
      i++
    }
  }

  return resultado.join('\n')
}

function restaurarTiemposSrt(textoModificado: string, textoOriginal: string) {
  // Encontrar todos los indicadores de tiempo en el texto original

  const tiempos: any = textoOriginal.match(
    /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g
  )
  // Restaurar los marcadores [T] con los tiempos originales
  let textoRestaurado = textoModificado
  tiempos.forEach((tiempo: string) => {
    textoRestaurado = textoRestaurado.replace('[T]', tiempo)
  })
  return textoRestaurado
}

// Función para extraer solo el diálogo
function extraerDialogo(texto: string) {
  const lineas = texto.split('\n')
  const textoExtraido = []

  for (const linea of lineas) {
    if (linea.startsWith('Dialogue:')) {
      // Dividir la línea por comas
      const partes = linea.split(',')
      // El texto del diálogo está en la última columna
      const textoDialogo = partes.slice(9).join(',')

      // Eliminar códigos de formato (todo lo que esté entre {})
      const textoSinFormato = textoDialogo.replace(/\{.*?\}/g, '').trim()

      // Reemplazar \N con un símbolo temporal (por ejemplo, "|")
      const textoSinSaltos = textoSinFormato.replace(/\\N/g, '|').trim()

      // Reemplazar commas con un símbolo temporal (por ejemplo, "@@")
      const textoSinCommas = textoSinSaltos.replace(/,/g, '@@').trim()

      // Agregar el texto limpio al resultado
      textoExtraido.push(textoSinCommas)
    }
  }

  return textoExtraido.join('\n') // Unir los textos con saltos de línea
}

function restaurarASS(textoOriginal: string, textoProcesado: string) {
  const lineasOriginales = textoOriginal.split('\n')
  const lineasProcesadas = textoProcesado.split('\n')
  const resultado = []
  let indiceProcesado = 0

  for (const linea of lineasOriginales) {
    if (linea.startsWith('Dialogue:')) {
      // Dividir la línea original en partes
      const partes = linea.split(',')
      // Extraer el texto del diálogo original (última columna)
      const textoOriginalDialogo = partes.slice(9).join(',')

      // Extraer los códigos de formato (si existen)
      const codigosFormato = textoOriginalDialogo.match(/\{.*?\}/g) || []

      // Validar si hay una línea correspondiente en el texto procesado
      if (indiceProcesado < lineasProcesadas.length) {
        // Obtener el texto procesado correspondiente
        const textoProcesadoDialogo = lineasProcesadas[indiceProcesado].trim()
        indiceProcesado++

        // Reemplazar el símbolo temporal "|" con \N
        const textoConSaltos = textoProcesadoDialogo.replace(/\|/g, '\\N')

        // Reemplazar el símbolo temporal "@@" con commas
        const textoConCommas = textoConSaltos.replace(/@@/g, ',')

        // Combinar códigos de formato con el texto procesado
        const textoRestaurado = codigosFormato.join('') + textoConCommas

        // Reemplazar el texto del diálogo en la línea original
        partes[9] = textoRestaurado
        resultado.push(partes.join(','))
      } else {
        // Si no hay más líneas procesadas, mantener la línea original
        resultado.push(linea)
      }
    } else {
      // Mantener las líneas que no son diálogos
      resultado.push(linea)
    }
  }

  return resultado.join('\n')
}

/////////////////////////

function extractDialogsFromASS(subtitleContent: string) {
  const dialogs: string[] = []
  const lines = subtitleContent.split('\n')

  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const match = line.match(
        /Dialogue:[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)/
      )

      if (match && match[1]) {
        const dialogText = match[1]
          .replace(/\{[^}]*\}/g, '') // Eliminar etiquetas ASS como {\fad(...)} o {\pos(...)}
          .replace(/\\N/g, '\n') // Convertir saltos de línea
          .trim()

        // Ignorar líneas con datos vectoriales (\p1)
        if (!dialogText.includes('\\p1')) {
          dialogs.push(dialogText)
        }
      } else {
        console.warn(`No se pudo extraer diálogo de: ${line}`)
      }
    }
  }

  return dialogs
}

export default function Home() {
  const [files, setFiles] = useAtom(subFileAtom)
  const [replace, setReplace] = useState(false)
  const [, updateSubFileState] = useAtom(updateSubFileStateAtom)
  const [original, setOriginal] = useState('')
  const [newText, setNewText] = useState('')

  const apiKeys = useLiveQuery(() => db.apiKey.toArray())

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (files) {
      const lfiles: SubFile[] = []
      for (const element of files) {
        const text = await readFileContents(element)
        const id = uuidv4()
        if (element.name.endsWith('.srt')) {
        } else {
          lfiles.push({
            id: id,
            filename: element.name,
            original: text,
            state: 'PENDING',
            split: extractDialogsFromASS(text)
          })
        }
      }

      setFiles(lfiles)
    }
  }
  const translate = async () => {
    for (const element of files) {
      updateSubFileState({
        ...element,
        state: 'PROCESSING'
      })
      if (element.filename.endsWith('.srt')) {
        /*
        const textoModificado = quitarNumerosYTiempos(element)

        const { data } = await axios.post('/api/translate', {
          content: textoModificado,
          format: 'srt'
        })
        // console.log(data)

        const restaurado = restaurarNumerosYTiempos(data as string, text)
        const filename = `${element.name.replaceAll('.srt', '')}_es.srt`
        triggerFileDownload(filename, restaurado)*/
      } else {
        const parsetString = element.split?.join(' ||| ')
        const {data}= await axios.post('/api/translate', {content:parsetString, format:'ass'})
/*
        let data = ''

        data = await translateSub(parsetString ?? '')
*/
        const restored = data.split(/\s*\|\|\|\s*/).map((parte:any) => parte.trim())
        updateSubFileState({
          ...element,
          state: 'DONE',
          splitTranslated: restored
        })
        // const textoModificado2 = restaurarASS(text, textoModificado)
        // console.log(textoModificado2)
      }
    }
  }

  const replaceFn = async () => {
    for (const element of files) {
      updateSubFileState({
        ...element,
        state: 'PROCESSING'
      })
      if (element.filename.endsWith('.srt')) {
        /*
        const textoModificado = quitarNumerosYTiempos(element)

        const { data } = await axios.post('/api/translate', {
          content: textoModificado,
          format: 'srt'
        })
        // console.log(data)

        const restaurado = restaurarNumerosYTiempos(data as string, text)
        const filename = `${element.name.replaceAll('.srt', '')}_es.srt`
        triggerFileDownload(filename, restaurado)*/
      } else {
        const replaces = element.original.replace(original, newText)
        const filename = `${element.filename.replaceAll('.ass', '')}.ass`

        triggerFileDownload(filename, replaces)
        await timeout(1000)
        // const textoModificado2 = restaurarASS(text, textoModificado)
        // console.log(textoModificado2)
      }
    }
  }

  const download = async (file: SubFile) => {
    const filename = `${file.filename.replaceAll('.ass', '')}_es.ass`
    const restored = restoreDialogsToASS(
      file.original,
      file.splitTranslated ?? []
    )
    triggerFileDownload(filename, restored)
  }
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
      <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start'>
        {apiKeys && apiKeys?.length > 0 && (
          <div>
            <input
              type='file'
              id='file'
              name='file'
              multiple
              onChange={handleFileChange}
            />
            <div>
              <br></br>
            </div>

            <div className='inline-flex items-center'>
              <label className='flex items-center cursor-pointer relative'>
                remplazar
                <input
                  type='checkbox'
                  checked={replace}
                  className='peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border border-slate-300 checked:bg-slate-800 checked:border-slate-800'
                  id='check'
                  onClick={() => setReplace(!replace)}
                />
                <span className='absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-3.5 w-3.5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                    stroke='currentColor'
                    stroke-width='1'
                  >
                    <path
                      fill-rule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clip-rule='evenodd'
                    ></path>
                  </svg>
                </span>
              </label>
            </div>
            <br />
            <br />

            {replace === true && (
              <>
                <div>
                  <div className='mb-1 flex flex-col gap-6'>
                    <div className='w-full max-w-sm min-w-[200px]'>
                      <label className='block mb-2 text-sm text-slate-600'>
                        original
                      </label>
                      <input
                        type='text'
                        value={original}
                        onChange={(e) => setOriginal(e.target.value)}
                        className='w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
                        placeholder='Your Name'
                      />
                    </div>
                    <div className='w-full max-w-sm min-w-[200px]'>
                      <label className='block mb-2 text-sm text-slate-600'>
                        nuevo
                      </label>
                      <input
                        type='text'
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        className='w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
                        placeholder='Your Name'
                      />
                    </div>
                  </div>
                  <button disabled={files.length === 0} onClick={replaceFn}>
                    remplazar
                  </button>
                </div>
              </>
            )}
            {replace === false && (
              <button disabled={files.length === 0} onClick={translate}>
                Traducir
              </button>
            )}

            <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
              {files.map((file, index) => {
                return (
                  <li className='pb-3 sm:pb-4' key={index}>
                    <div className='flex items-center space-x-4 rtl:space-x-reverse'>
                      <div className='shrink-0'></div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate dark:text-white'>
                          {file.filename}
                        </p>
                      </div>
                      {file.state === 'PENDING' && (
                        <div className='text-sm text-gray-500'>PENDIENTE</div>
                      )}
                      {file.state === 'PROCESSING' && (
                        <div className='flex items-center justify-center'>
                          <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900'></div>
                        </div>
                      )}

                      {file.state === 'DONE' && (
                        <div className='flex items-center justify-center'>
                          {file.split.length ===
                          file.splitTranslated?.length ? (
                            <button
                              className='px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700'
                              onClick={() => {
                                download(file)
                              }}
                            >
                              Descargar
                            </button>
                          ) : (
                            <button className='relative group px-4 py-2 rounded-lg text-white bg-yellow-600 hover:bg-yellow-700'  onClick={() => {
                              download(file)
                            }}>
                              Descargar
                              <span className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 text-xs text-white bg-gray-800 rounded-lg'>
                                Primary Button
                              </span>
                            </button>
                          )}

                          <Link
                            target='_blank'
                            href={`/edit/${file.id}`}
                            className='px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700'
                          >
                            Ver
                          </Link>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {apiKeys && apiKeys?.length === 0 && (
          <div>
            <div>
              <div
                className='p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400'
                role='alert'
              >
                <span className='font-medium'>No hay ApiKey Configurado</span> <Link href={"/apikey"}>Configura tu apiKey aquí</Link>
              </div>
            </div>
          </div>
        )}
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
