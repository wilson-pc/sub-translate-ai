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
        content: `You are a translation assistant. Translate the following dialogues into **Latin American Spanish**
                  
                  The input text comes from an SRT subtitle file.
                  Each dialogue is separated by the token \`|||\`.

                  ### RULES (Follow STRICTLY):
                  1. ⚠️ **NEVER** remove, merge, or split dialogues.  
                    - The number of "|||" separators in the output MUST be **exactly the same** as in the input.  
                    - Each dialogue in the input corresponds to **exactly one** dialogue in the output, in the same order.
                  2. Do NOT translate or remove the separators (\`|||\`).
                  3. If a dialogue is empty, strange, cut off, or unreadable, **copy it as-is**.
                  4. Preserve punctuation, symbols, and line breaks inside each dialogue.
                  5. Do NOT add comments, explanations, or extra text.
                  6. Return ONLY the translated dialogues with separators, nothing else.
                  7. Return the complete translation between --- to be able to extract the text with a split in js

                  Now translate the text below following ALL the rules above:
`,
      },
      {
        role: "user",
        content: `Translate this subtitle to Spanish Latin America
                             
           ${prompt}

           `,
      },
    ],
  });

  const choice = response.choices[0];
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
  for (const element of chunks) {
    const resp = await getFullResponse(element.trim());

    transpalted +=
      transpalted.length > 0
        ? "||| " + resp.split("---")[1]?.trim().split("---")[0]?.trim()
        : resp.split("---")[1]?.trim().split("---")[0]?.trim();
  }

  return new Response(transpalted);
}
