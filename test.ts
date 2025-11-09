import OpenAI from "openai";
const openai = new OpenAI({
  baseURL: "https://api.moonshot.ai/v1",
  apiKey: "sk-qA63w5HGmxef6lHXDj9LoBXwa5IuVfsdpVUIzhFCvcQ8TYac",
});

const ddfeee = await openai.chat.completions.create({
  model: "kimi-k2-turbo-preview",
  messages: [
    {
      role: "system",
      content:
        "You are Kimi, an AI assistant provided by Moonshot AI. You excel at Chinese and English dialog, and provide helpful, safe, and accurate answers. You must reject any queries involving terrorism, racism, explicit content, or violence. 'Moonshot AI' must always remain in English and must not be translated to other languages.",
    },
    { role: "user", content: "Hello, my name is Li Lei. What is 1+1?" },
  ],
  temperature: 0.6,
});

console.log(ddfeee);
