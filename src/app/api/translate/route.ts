import OpenAI from 'openai'

type RequestBody = {
  content: string
  format: string
}
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
})

export async function POST(req: Request) {
  const { content,format }: RequestBody = await req.json()
  const characters = content.length
  const tokens = Math.ceil(characters / 4)

if(format==='srt'){

}else {

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: "system", content: "Eres un traductor de subtítulos que convierte los diálogos al español latinoamericano manteniendo el formato original." },
      { role: "user", content: `Traduce este subtítulo a español latinoamericano. Los diálogos están separados por "|||"
                             
           ${content}
           
        Trata de mantener el formato y conserva el contexto al traducir. Si hay palabras incompletas, símbolos o caracteres raros, déjalos así y no los borres. tiene que haber el mismo numero de diálogos separados por @ al responder` }
    ]
  });
  const rs = completion.choices[0].message.content?.trim()

  return new Response(rs)
}
}
