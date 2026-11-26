import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JUDGE_SYSTEM_PROMPT =
  'You are an impartial judge. Pick the better answer for accuracy, helpfulness and clarity. Reply with only A or B.';

const ALLOWED_MODELS = new Set(['gemini-3.1-flash-lite', 'gemini-4-hydrogen']);

type RawLetter = 'A' | 'B';
type WinnerChoice = 1 | 2;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in the Settings > Secrets panel.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 500;
    err.code = 'MISSING_API_KEY';
    throw err;
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

function parseJudgeLetter(rawText: string | undefined): RawLetter {
  const cleaned = (rawText ?? '').trim();
  if (!cleaned) {
    throw new Error('Model returned an empty response instead of A or B.');
  }

  const upper = cleaned.toUpperCase();
  if (upper === 'A' || upper === 'A.' || upper === 'ANSWER A' || upper === 'ANSWER A.') {
    return 'A';
  }
  if (upper === 'B' || upper === 'B.' || upper === 'ANSWER B' || upper === 'ANSWER B.') {
    return 'B';
  }

  // Fallback: check leading single-letter token when model adds minimal punctuation
  const match = upper.match(/^(?:ANSWER\s+)?([AB])\b/);
  if (match) {
    return match[1] as RawLetter;
  }

  throw new Error(
    `Unexpected judge output "${cleaned.slice(0, 80)}". Expected only "A" or "B".`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMeta(err: unknown): {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
} {
  const anyErr = err as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
  };

  const rawMessage = anyErr?.message || 'Unknown Gemini API error.';
  const numericStatus =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.statusCode === 'number'
        ? anyErr.statusCode
        : 500;

  if (anyErr?.code === 'MISSING_API_KEY') {
    return {
      status: 500,
      code: 'MISSING_API_KEY',
      message: rawMessage,
      retryable: false,
    };
  }

  const lower = rawMessage.toLowerCase();

  if (
    numericStatus === 403 ||
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid')
  ) {
    return {
      status: numericStatus === 403 ? 403 : 400,
      code: 'API_KEY_INVALID',
      message:
        'Gemini API authentication failed. Please check your API key in the Settings > Secrets panel.',
      retryable: false,
    };
  }

  if (numericStatus === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message:
        'Gemini API rate limit or quota exceeded (429). Wait a moment and retry, or check your API quota in Settings > Secrets.',
      retryable: true,
    };
  }

  if (numericStatus === 404 || lower.includes('not_found')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: `Requested Gemini model was not found: ${rawMessage}`,
      retryable: false,
    };
  }

  if (numericStatus >= 500 || lower.includes('unavailable') || lower.includes('deadline')) {
    return {
      status: 502,
      code: 'UPSTREAM_ERROR',
      message: `Gemini API temporary service error: ${rawMessage}`,
      retryable: true,
    };
  }

  return {
    status: numericStatus >= 400 && numericStatus < 600 ? numericStatus : 500,
    code: 'JUDGE_CALL_FAILED',
    message: rawMessage,
    retryable: false,
  };
}

async function callSingleJudgePass(
  ai: GoogleGenAI,
  model: string,
  question: string,
  answerA: string,
  answerB: string
): Promise<RawLetter> {
  const prompt = [
    `Question:`,
    question,
    '',
    `Answer A:`,
    answerA,
    '',
    `Answer B:`,
    answerB,
    '',
    `Reply with only A or B.`,
  ].join('\n');

  // gemini-3.1-flash-lite supports temperature: 0 directly.
  // gemini-4-hydrogen deprecates sampling params (temperature/topP/topK); use deterministic seed + LOW thinking.
  const config =
    model === 'gemini-4-hydrogen'
      ? {
          systemInstruction: JUDGE_SYSTEM_PROMPT,
          seed: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      : {
          systemInstruction: JUDGE_SYSTEM_PROMPT,
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        };

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      return parseJudgeLetter(response.text);
    } catch (err) {
      lastError = err;
      const meta = extractErrorMeta(err);
      if (!meta.retryable || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/judge', async (req, res) => {
    try {
      const { question, answer_1, answer_2, model: requestedModel } = req.body ?? {};

      if (
        typeof question !== 'string' ||
        typeof answer_1 !== 'string' ||
        typeof answer_2 !== 'string' ||
        !question.trim() ||
        !answer_1.trim() ||
        !answer_2.trim()
      ) {
        res.status(400).json({
          error: 'Each evaluation row requires non-empty question, answer_1, and answer_2 text.',
          code: 'INVALID_INPUT',
        });
        return;
      }

      const model =
        typeof requestedModel === 'string' && ALLOWED_MODELS.has(requestedModel)
          ? requestedModel
          : 'gemini-3.1-flash-lite';

      const ai = getGeminiClient();

      // Call Gemini twice per row:
      // Run 1: answer_1 as Answer A, answer_2 as Answer B
      // Run 2: answer_2 as Answer A, answer_1 as Answer B (swapped)
      const [run1Raw, run2Raw] = await Promise.all([
        callSingleJudgePass(ai, model, question.trim(), answer_1.trim(), answer_2.trim()),
        callSingleJudgePass(ai, model, question.trim(), answer_2.trim(), answer_1.trim()),
      ]);

      // Map both verdicts back to original answer numbers (1 or 2)
      const run1Verdict: WinnerChoice = run1Raw === 'A' ? 1 : 2;
      const run2Verdict: WinnerChoice = run2Raw === 'A' ? 2 : 1;
      const flipped = run1Verdict !== run2Verdict;

      res.json({
        run1Raw,
        run1Verdict,
        run2Raw,
        run2Verdict,
        flipped,
        model,
      });
    } catch (err) {
      const meta = extractErrorMeta(err);
      res.status(meta.status).json({
        error: meta.message,
        code: meta.code,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`LLM-as-a-Judge Reliability Tester listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
