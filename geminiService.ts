
import { GoogleGenAI, Type } from "@google/genai";
import { RiskAnalysis } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeRisk(
  contractName: string,
  stockCode: string,
  leverage: number,
  marginRequirement: number,
  price: number
): Promise<RiskAnalysis> {
  const systemInstruction = `
    You are an expert financial risk analyst specializing in the Taiwan stock futures market (TAIFEX).
    Your goal is to provide deep insights into the risks of specific stock futures based on provided parameters.
    Consider historical volatility of Taiwan stocks, typical margin call thresholds (usually when maintenance margin is breached), and leverage risks.
    Output must be in Traditional Chinese (zh-TW).
  `;

  const prompt = `
    分析以下股票期貨合約的交易風險：
    - 合約名稱: ${contractName} (${stockCode})
    - 當前股價: ${price} TWD
    - 使用槓桿: ${leverage.toFixed(2)}x
    - 原始保證金需求: ${marginRequirement.toLocaleString()} TWD
    
    請針對以下三個維度提供簡潔專業的分析：
    1. 槓桿風險：解釋此槓桿倍數下的資產波動放大效應。
    2. 追繳風險：預估股價向不利方向變動多少百分比可能觸發維持保證金不足。
    3. 專業建議：提供針對此標的特性的具體資金管理或止損建議。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leverageRisk: { type: Type.STRING, description: "Risk associated with current leverage levels." },
            marginCallRisk: { type: Type.STRING, description: "Likelihood and distance to a margin call." },
            recommendation: { type: Type.STRING, description: "Professional trading recommendation." },
          },
          required: ["leverageRisk", "marginCallRisk", "recommendation"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      leverageRisk: "當前槓桿約為 " + leverage.toFixed(1) + " 倍。這意味著底層股票 1% 的波動將放大為保證金帳戶約 " + leverage.toFixed(1) + "% 的盈虧變動。",
      marginCallRisk: "若股價朝不利方向變動超過約 15-20%，帳戶淨值可能低於維持保證金水平，面臨追繳風險。",
      recommendation: "建議至少準備合約價值 30% 以上的資金作為緩衝，避免在極端波動中被強制平倉。"
    };
  }
}
