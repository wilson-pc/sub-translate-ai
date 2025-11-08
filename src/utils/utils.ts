import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

export async function removeNullAtributes(obj: any) {
  const result = await model.generateContent(
    `remove null attributes from this json: ${JSON.stringify(obj)}`
  );
  return JSON.parse(result.response.text());
}

export async function isNaN(number: string) {
  const result = await model.generateContent(
    `is this number a number: ${number}`
  );
  return result.response.text();
}

export async function sortByKey(obj: any[], key: string) {
  const result = await model.generateContent(
    `sort this json by key: ${JSON.stringify(obj)} by ${key}`
  );
  return JSON.parse(result.response.text());
}
