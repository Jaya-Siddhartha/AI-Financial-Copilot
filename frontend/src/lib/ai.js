// Offline AI assistant. An open-source model (Qwen 2.5, Apache-2.0) runs inside the browser with
// WebGPU through WebLLM: no API key, no account, and questions never leave the device. The model
// is downloaded once from Hugging Face and then cached by the browser, so it works offline.

export const MODELS = {
  smart: { id16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', id32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', label: 'Smart', size: 'about 1 GB' },
  lite: { id16: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', id32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', label: 'Lite', size: 'about 400 MB' },
};

export const aiSupported = () => typeof navigator !== 'undefined' && 'gpu' in navigator;

let engine = null;
let loadedKey = null;

const pickModelId = async (key) => {
  const model = MODELS[key] || MODELS.smart;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No GPU adapter');
    return adapter.features.has('shader-f16') ? model.id16 : model.id32;
  } catch {
    return null;
  }
};

export const isModelCached = async (key = 'smart') => {
  if (!aiSupported()) return false;
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    const model = MODELS[key];
    return (await hasModelInCache(model.id16)) || (await hasModelInCache(model.id32));
  } catch {
    return false;
  }
};

export const loadModel = async (key, onProgress) => {
  if (engine && loadedKey === key) return engine;
  const modelId = await pickModelId(key);
  if (!modelId) throw new Error('This device or browser cannot run the offline AI (it needs WebGPU). The built-in assistant still works.');
  const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
  const worker = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' });
  engine = await CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (p) => onProgress?.({ progress: p.progress ?? 0, text: p.text || '' }),
  });
  loadedKey = key;
  return engine;
};

export const modelLoaded = () => Boolean(engine);

const SYSTEM = `You are FinCopilot, a friendly money assistant for people in India.
Rules:
- Answer in simple, everyday English that a 60-year-old and a 20-year-old both understand. Use 2 to 5 short sentences.
- Use ONLY the numbers in the FACTS and CALCULATOR sections. Never make up amounts, dates or names. Write money as ₹ with Indian commas.
- If the calculator gives an answer, keep its numbers exactly. When it already answers the question, simply restate it in friendly words.
- Only write a rupee amount if it appears in FACTS or CALCULATOR. Do not add, subtract or estimate new amounts.
- If the facts do not contain what is needed, say what is missing (for example: "upload a statement" or "add your EMIs").
- Your priority is protecting the user's EMIs and stopping overspending. Be kind, never judgemental.
- Never encourage borrowing or buying things the user wants but does not need (trips, gadgets, parties). Suggest saving up first.
- Do not recommend specific stocks, funds or loan products. You are not a licensed financial adviser.`;

// Streams an answer. `facts` is the fact sheet, `calculator` the rule-based answer to anchor numbers.
export const askModel = async ({ question, history = [], facts, calculator, onToken }) => {
  if (!engine) throw new Error('The offline AI is not loaded.');
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\nFACTS:\n${facts}\n\nCALCULATOR (already worked out for this question):\n${calculator}` },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];
  const stream = await engine.chat.completions.create({ messages, temperature: 0.3, max_tokens: 320, stream: true });
  let text = '';
  for await (const chunk of stream) {
    const piece = chunk.choices?.[0]?.delta?.content || '';
    if (piece) {
      text += piece;
      onToken?.(text);
    }
  }
  return text.trim();
};

export const stopModel = () => engine?.interruptGenerate?.();

// Small models sometimes mix up numbers. Every rupee amount in an AI answer must appear in the
// facts or the calculator answer; otherwise the answer is not trusted.
const amountsIn = (text) =>
  [...String(text).matchAll(/₹\s?([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => Number.isFinite(n));

export const numbersGrounded = (answerText, ...sources) => {
  const allowed = new Set(sources.flatMap(amountsIn).map((n) => Math.round(n)));
  return amountsIn(answerText).every((n) => allowed.has(Math.round(n)));
};
