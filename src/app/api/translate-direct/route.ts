import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type RequestBody = {
  content: string;
  format: string;
};

export async function POST(req: Request) {
  const { content, format }: RequestBody = await req.json();
  //const characters = content.length
  //const tokens = Math.ceil(characters / 4)

  if (format === "srt") {
    return new Response("");
  } else {
    let finalResponse = "";

    const { text: translatedText } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      messages: [
        {
          role: "system",
          content:
            "You are an experienced semantic translator, specialized in creating .ass files.  Always return the full translation. If the response is truncated, continue from where it was left off.",
        },
        {
          role: "user",
          content: `Translate this to Spanish: 
            ${content}`,
        },
      ],
    });
    finalResponse += translatedText;

    return new Response(finalResponse);
  }
}
