import axios from "axios";

import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPEN_KEY,
});

const ddfeee = await openai.responses.create({
  model: "gpt-5-nano",
  input: [
    {
      role: "system",
      content:
        "You are Kimi, an AI assistant provided by Moonshot AI. You excel at Chinese and English dialog, and provide helpful, safe, and accurate answers. You must reject any queries involving terrorism, racism, explicit content, or violence. 'Moonshot AI' must always remain in English and must not be translated to other languages.",
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Hello, my name is Li Lei. What is 1+1?",
        },
      ],
    },
  ],
});

console.log(ddfeee.output_text);

/*
async function getResponse(prompt: string) {
  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/47d18f9f305f78eac145f550d627be87/ai/v1/responses`,
    {
      model: "@cf/openai/gpt-oss-120b",
      input: "Where did the phrase Hello World come from",
      instructions: "You are a concise assistant.",
    },
    {
      headers: {
        Authorization: `Bearer 7dvtGrb29gxQ64iuTwlL6uoxLum_7G0lDCHSem7t`,
      },
    }
  );
  console.log(response.data.output[0].content);
}

getResponse("Hello World").then();
*/
