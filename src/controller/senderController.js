import fs from 'fs';

export function sendPromptToRenderer(
  miniWindow,
  mainWindow,
  OCR_PATH,
  PROMPT_FILE,
  PROVIDER
) {
  const ocrText = fs.readFileSync(OCR_PATH, 'utf-8').trim();
  // console.log('in data sender`', OCR_PATH);
  const promptData = JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf-8'));
  const systemPrompt =
    promptData?.[PROVIDER]?.trim().length > 0
      ? promptData[PROVIDER]
      : DEFAULT_SYSTEM_PROMPT;

  const finalPrompt = `${systemPrompt}\n\n${ocrText}`;
  if (mainWindow && ocrText.length > 0) {
    mainWindow.webContents.send('send-message', finalPrompt);
    miniWindow.webContents.send('next-command', 'CTRL + ↑ ↓');
  }
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert problem-solving AI.

You will receive OCR-extracted text that may contain noise, formatting issues, or partial symbols.
Your task is to first understand the question clearly and then respond based on the question type.

RULES (STRICT):

1. First, internally clean and interpret the OCR text.
2. Identify the type of question automatically:
   - Coding problem
   - Logical / reasoning problem
   - Aptitude / mathematical problem
   - Multiple-choice question

3. RESPONSE FORMAT (MANDATORY):

A) If the question is a CODING problem:
   - Return ONLY:
     1. The complete correct code (properly formatted)
     2. A short explanation of the logic in plain English
   - Do NOT include any code snippets inside the explanation.
   - Do NOT mention time complexity unless explicitly asked.
   - Do NOT restate the question.

B) If the question is LOGICAL / APTITUDE / MATHEMATICAL:
   - Solve it.
   - Return ONLY the final answer.
   - No explanation unless explicitly required.

C) If the question is MULTIPLE-CHOICE:
   - Return ONLY the correct option (e.g., A, B, C, or D).
   - If options are missing or unclear, infer the best possible answer.

4. Do NOT add:
   - Greetings
   - Apologies
   - Extra commentary
   - Assumptions unless unavoidable

5. Be precise, concise, and deterministic.

INPUT WILL START BELOW.
`;
