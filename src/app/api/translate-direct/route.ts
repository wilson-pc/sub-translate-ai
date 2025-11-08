import { GoogleGenAI } from "@google/genai";

type RequestBody = {
  content: string;
  format: string;
};

export async function POST(req: Request) {
  const { content }: RequestBody = await req.json();
  //const characters = content.length
  //const tokens = Math.ceil(characters / 4)

  const genAI = new GoogleGenAI({});
  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `Translate this subtitle into Latin American Spanish. The dialogues come from an SRT file, and they are separated by "|||".  

${content}  

Maintain the context while translating. If there are incomplete words, symbols, or strange characters, leave them as they are and do not remove them.  
**VERY IMPORTANT: Do not remove any dialogue. Each dialogue in the original text must have its corresponding translation. Dialogues cannot be added or removed**  
**do not remove the separators |||**`,
  });
  const finalResponse = response.text ?? "";

  return new Response(finalResponse);
}
