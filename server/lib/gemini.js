import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Configurable por entorno; gemini-1.5-flash fue deprecado por Google.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });

export { genAI, geminiModel };
