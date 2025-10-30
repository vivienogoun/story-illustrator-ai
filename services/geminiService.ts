
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateStoryPages(prompt: string): Promise<string[]> {
  const storyPrompt = `
    You are a whimsical storyteller for children aged 3 to 7. Your stories are simple, positive, and full of wonder.
    Write a short story based on this idea: "${prompt}".
    The story must have exactly 5 short paragraphs. Each paragraph will become a page in a picture book.
    Your response MUST be a JSON object with a single key "pages" which is an array of strings, where each string is one paragraph of the story.
    Do not include any other text, explanation, or markdown formatting outside of the JSON object.
  `;
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: storyPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },
  });

  const jsonText = response.text.trim();
  const result = JSON.parse(jsonText);
  return result.pages || [];
}

export async function generateImage(text: string): Promise<string> {
  const imagePrompt = `A vibrant and colorful children's book illustration in a cute, whimsical, and friendly cartoon style. The illustration should depict: "${text}". Do not include any text or words in the image.`;
  
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    return response.generatedImages[0].image.imageBytes;
  }
  throw new Error("Image generation failed.");
}

export async function generateSpeech(text: string): Promise<string> {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (audioData) {
    return audioData;
  }
  throw new Error("Text-to-speech generation failed.");
}
