import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Hybrid Cloud-Assisted Agronomist Q&A Endpoint
  app.post('/api/agronomist/ask', async (req, res) => {
    try {
      const { question, farmContext } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const ai = getAiClient();
      const systemPrompt = `You are TerraLocal AgOS Senior Agronomist AI. Provide exact, scientifically grounded, actionable farming and irrigation guidance.
Include specific metrics (e.g., VWC %, kPa, NPK ratios in kg/ha, ETc mm/day, pH ranges, and organic/integrated pest management remedies).
Current Farm Telemetry Context:
${JSON.stringify(farmContext || {}, null, 2)}

Structure your response clearly with:
1. Direct Agronomic Assessment
2. Quantitative Thresholds & Dosages
3. Recommended Field Action / Automation Rule`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: question,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      return res.json({
        answer: response.text || 'Unable to generate agronomic response.',
        engine: 'Gemini 3.8 Flash Cloud Verification',
      });
    } catch (error: any) {
      console.error('Agronomist API error:', error);
      return res.status(500).json({
        error: error?.message || 'Cloud AI service unavailable. Falling back to Local Edge Agronomic Engine.',
      });
    }
  });

  // 2. Hybrid Cloud-Assisted Crop Leaf Vision Diagnostic Endpoint
  app.post('/api/agronomist/diagnose-image', async (req, res) => {
    try {
      const { imageBase64, mimeType, cropType, localMetrics } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const ai = getAiClient();
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/png',
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this ${cropType || 'crop'} leaf specimen for chlorosis, necrosis, fungal lesions, pest damage, or nutrient deficiency.
Local Edge Pixel Telemetry already measured: ${JSON.stringify(localMetrics || {})}.
Return a JSON object with conditionName, severity ('NOMINAL' | 'MODERATE' | 'CRITICAL'), confidencePct (number), causalAgent, physiologicalImpact, and treatmentSteps (array of strings).`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conditionName: { type: Type.STRING },
              severity: { type: Type.STRING },
              confidencePct: { type: Type.NUMBER },
              causalAgent: { type: Type.STRING },
              physiologicalImpact: { type: Type.STRING },
              treatmentSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'conditionName',
              'severity',
              'confidencePct',
              'causalAgent',
              'physiologicalImpact',
              'treatmentSteps',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        diagnosis: parsed,
        engine: 'Hybrid Edge + Gemini 3.8 Vision',
      });
    } catch (error: any) {
      console.error('Vision API error:', error);
      return res.status(500).json({
        error: error?.message || 'Cloud Vision unavailable. Using 100% On-Device Pixel Spectral Classifier.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TerraLocal AgOS Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
