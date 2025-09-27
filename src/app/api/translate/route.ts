import OpenAI from "openai";

type RequestBody = {
  content: string;
  format: string;
};
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function getFullResponse(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    stream: false,
    messages: [
      {
        role: "system",
        content: "Eres un traductor de subtítulos de archivos de video",
      },
      {
        role: "user",
        content: `Traduce este subtítulo a español latinoamericano. Los diálogos están separados por "|||", los dialogos estan extraidos de archivos .srt y .ass por lo que es muy importante conservar el mismo nuemoro de dialoglos para poder restaurarlos despues
                             
           ${prompt}
           
           regresa la traduccion completa entre ---`,
      },
    ],
  });

  const choice = response.choices[0];
  console.log(choice);
  const text = choice?.message.content ?? "";

  return text;
}
function chunkByDelimiter(str: string, delimiter = "|||", size = 300) {
  // Dividimos en partes
  const parts = str.split(delimiter);
  const chunks = [];

  for (let i = 0; i < parts.length; i += size) {
    // Tomamos "size" partes y las volvemos a unir con el delimitador
    chunks.push(parts.slice(i, i + size).join(delimiter));
  }

  return chunks;
}

export async function POST(req: Request) {
  const { content }: RequestBody = await req.json();

  let transpalted: string = "";
  const chunks = chunkByDelimiter(content, "|||", 300);
  console.log(chunks);
  for (const element of chunks) {
    const resp = await getFullResponse(element.trim());
    console.log(resp);
    transpalted +=
      transpalted.length > 0
        ? "||| " + resp.split("---")[1]?.trim().split("---")[0]?.trim()
        : resp.split("---")[1]?.trim().split("---")[0]?.trim();
  }

  return new Response(transpalted);
}
