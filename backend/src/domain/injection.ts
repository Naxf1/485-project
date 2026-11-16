export interface SanitizedText {
  text: string;
  suspicious: boolean;
}

const INSTRUCTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(of\s+)?(your\s+|the\s+|previous\s+)?(rules|instructions)/i,
  /disregard\s+(all\s+|any\s+)?(of\s+)?(your\s+|the\s+|previous\s+)?(rules|instructions)/i,
  /mark\s+this\s+(as\s+)?(urgent|high|low|medium)/i,
  /set\s+the\s+priority\s+to/i,
  /you\s+are\s+(now\s+)?(an?\s+)?(admin|supervisor|system|assistant)/i,
  /system\s*:/i,
  /act\s+as\s+(an?\s+)?(admin|supervisor)/i,
  /new\s+instructions?/i,
  /approve\s+this\s+ticket/i,
];

/**
 * Ticket text is data, never instructions (FR-18). Sentences that try to address the
 * agent are removed before classification and the ticket is flagged for a human.
 */
export function stripInstructions(input: string): SanitizedText {
  if (input.trim() === '') {
    return { text: '', suspicious: false };
  }

  let suspicious = false;
  const kept = input.split(/(?<=[.!?])\s+/).filter((sentence) => {
    const isInstruction = INSTRUCTION_PATTERNS.some((pattern) => pattern.test(sentence));
    if (isInstruction) suspicious = true;
    return !isInstruction;
  });

  return { text: kept.join(' ').trim(), suspicious };
}
