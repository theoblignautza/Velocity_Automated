import { GoogleGenAI } from "@google/genai";

// IMPORTANT: In a real application, the API key should be stored securely and not hardcoded.
// This example assumes `process.env.API_KEY` is set in the environment.
// To run this, you would need to set up a bundler (like Vite or Webpack) and an environment variable.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

/**
 * Generates a concise summary of backup logs using the Gemini API.
 * @param logs A string containing all the logs to be summarized.
 * @returns A promise that resolves to the summary string.
 */
export async function getGeminiLogSummary(logs: string): Promise<string> {
  if (!ai) {
    console.warn("Gemini API key not configured. Returning mock summary.");
    return new Promise(resolve => {
        setTimeout(() => {
            const hasError = logs.toLowerCase().includes('error') || logs.toLowerCase().includes('failed');
            const isSuccess = logs.toLowerCase().includes('success');
            if(hasError) {
                resolve("Mock Summary: The backup process encountered a failure. Check logs for details on the SFTP connection error.");
            } else if (isSuccess) {
                resolve("Mock Summary: The backup job completed successfully. All files were downloaded and archived without issues.");
            } else {
                resolve("Mock Summary: The backup process is currently running or has no definitive success/failure state yet.");
            }
        }, 1500);
    });
  }

  try {
    // Fix: Refactored to use systemInstruction for the persona and separated it from the main content.
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following backup logs and provide a very short, one-sentence summary for a dashboard widget. Highlight the final outcome (success, failure, in-progress) and mention any critical errors. Do not use markdown.\n\nLogs:\n---\n${logs}\n---`,
        config: {
            systemInstruction: "You are a helpful system administrator assistant.",
            temperature: 0.2,
        },
    });

    return response.text || "Could not generate a summary.";

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get summary from Gemini API.");
  }
}