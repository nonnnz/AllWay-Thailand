import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const FoodDataSchema = z.object({
  price_level: z.enum(["Budget", "Mid", "High"]),
  sample_dishes: z.array(z.object({
    name: z.string(),
    price: z.number()
  })).max(5),
  avg_price: z.number(),
  confidence: z.number().min(0).max(1)
});

export type FoodData = z.infer<typeof FoodDataSchema>;

export async function analyzeMenu(imageUrls: string[]): Promise<FoodData | null> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // TODO: Fetch images and convert to GenerativePart
  // Prompt for VLM:
  const prompt = `
    Analyze these menu images from a restaurant in Bangkok.
    Return a JSON object with:
    - price_level: "Budget" (dish < 100 THB), "Mid" (100-400 THB), "High" (> 400 THB)
    - sample_dishes: array of 5 items with prices
    - avg_price: average price per dish
    - confidence: your confidence level (0-1)
  `;

  try {
    // const result = await model.generateContent([prompt, ...images]);
    // const response = await result.response;
    // return FoodDataSchema.parse(JSON.parse(response.text()));
    return null; // Placeholder
  } catch (error) {
    console.error("[AI] Error analyzing menu:", error);
    return null;
  }
}
