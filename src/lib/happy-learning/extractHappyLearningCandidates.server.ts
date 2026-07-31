import { SEMANTIC_MEMORY_TAGS } from "../semantic-memory/index.ts";
import { HAPPY_LEARNING_CAPTURE_TYPES, type HappyLearningExtractionResult, type HappyLearningExtractorInput, type HappyLearningStructuredProvider } from "./happyLearning.types.ts";
import { HAPPY_LEARNING_LIMITS, parseHappyLearningProviderOutput } from "./happyLearningSchema.ts";
import { precheckHappyLearning } from "./happyLearningPrecheck.ts";

const EMPTY: HappyLearningExtractionResult = { candidates: [] };

/** Provider-independent boundary. Provider failures and malformed output fail closed. */
export async function extractHappyLearningCandidates(
  input: HappyLearningExtractorInput,
  provider: HappyLearningStructuredProvider,
): Promise<HappyLearningExtractionResult> {
  if (!precheckHappyLearning(input).eligible) return EMPTY;
  try {
    const output = await provider({
      userMessage: input.userMessage,
      locale: input.locale,
      resolvedPersonName: input.resolvedPerson.name,
      allowedCaptureTypes: [...HAPPY_LEARNING_CAPTURE_TYPES],
      allowedSemanticTags: [...SEMANTIC_MEMORY_TAGS],
      maxCandidates: HAPPY_LEARNING_LIMITS.maxCandidates,
    });
    return parseHappyLearningProviderOutput(output, input.userMessage);
  } catch {
    return EMPTY;
  }
}
