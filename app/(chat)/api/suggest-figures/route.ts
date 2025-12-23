import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { figureSuggesterAgent } from "@/mastra/agents/figure-suggester-agent";

export const maxDuration = 30;

/**
 * POST /api/suggest-figures
 *
 * Calls the figureSuggesterAgent to get figure recommendations.
 * This endpoint is used by the pfBuilderSuggestFigures client tool
 * to get AI-powered suggestions for professional figures based on
 * UF names and available figures in the sector.
 */
export async function POST(request: Request) {
  // Authenticate session
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return new ChatSDKError(
        "bad_request:api",
        "Parameter 'prompt' is required and must be a string."
      ).toResponse();
    }

    // Call the figure suggester agent
    const result = await figureSuggesterAgent.generate(prompt);

    // Extract text from the response
    const responseText = result.text ?? "";

    return Response.json({ response: responseText }, { status: 200 });
  } catch (error) {
    console.error("Error in suggest-figures API:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError("offline:chat").toResponse();
  }
}

