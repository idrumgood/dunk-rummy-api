import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { FinalGameResult, StoredGame } from '../types/gameTypes'; // Adjust the import path as necessary

interface AISummaryParams {
  p1Name: string;
  p2Name: string;
  calculatedFinalResult: FinalGameResult;
  handsLength: number;
  targetScore: number;
  handWinBonus: number;
  gamesBetweenPlayersHistory: StoredGame[];
  currentWinStreak: number;
  shutout: boolean;
  headToHeadP1Wins: number; // Added based on usage in prompt
  headToHeadP2Wins: number; // Added based on usage in prompt
}

export const generateGameSummary = async (params: AISummaryParams): Promise<string> => {
  const {
    p1Name,
    p2Name,
    calculatedFinalResult,
    handsLength,
    targetScore,
    handWinBonus,
    gamesBetweenPlayersHistory,
    currentWinStreak,
    shutout,
    headToHeadP1Wins,
    headToHeadP2Wins,
  } = params;

  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
You are an insightful and witty commentator for Gin Rummy games.
Game Details:
Player 1: ${p1Name}
Player 2: ${p2Name}
Winner of this game: ${calculatedFinalResult.winnerName}
Final Score for ${p1Name}: ${calculatedFinalResult.player1FinalScore} (Raw points: ${calculatedFinalResult.player1Cumulative}, Hands won: ${calculatedFinalResult.player1HandsWon})
Final Score for ${p2Name}: ${calculatedFinalResult.player2FinalScore} (Raw points: ${calculatedFinalResult.player2Cumulative}, Hands won: ${calculatedFinalResult.player2HandsWon})
Number of Hands Played in this game: ${handsLength}
Target Score for game completion: ${targetScore}
Bonus Points Awarded Per Hand Won: ${handWinBonus}
Was this game a shutout (one player scored 0 raw points before bonus)? ${shutout ? 'Yes' : 'No'}.

Historical Context between ${p1Name} and ${p2Name} (before this current game):
Total past games played against each other: ${gamesBetweenPlayersHistory.length}
${p1Name}'s previous wins against ${p2Name}: ${headToHeadP1Wins}
${p2Name}'s previous wins against ${p1Name}: ${headToHeadP2Wins}

Win Streak Information (including this current game):
If ${calculatedFinalResult.winnerName !== "It's a Tie!" ? calculatedFinalResult.winnerName : 'the winner (if not a tie)'} (the winner of the current game) won, they are now on a win streak of ${currentWinStreak} game(s) against their opponent. If it's a tie, or if they didn't win, this doesn't apply in the same way.

Instructions for your summary:
1. Provide a brief, engaging summary of THIS game (around 2-4 sentences).
2. Comment on the game's length (e.g., "a quick victory in X hands", "a hard-fought battle over X hands"). Use the "Number of Hands Played" for this. (e.g., <5 hands is very quick, 5-10 is average, 10+ is long).
3. If the winner has a win streak of 2 or more games (as calculated in "Win Streak Information"), mention it.
4. If this game was a shutout, definitely highlight this significant event.
5. Note any other remarkable aspects like a dominant performance (large score difference) or a very close match.
6. Keep the tone light, engaging, and perhaps a bit celebratory for the winner. Avoid being bland.
7. Output ONLY plain text. Do NOT use markdown, bolding, italics, or any special formatting.
8. Focus on the narrative and insights from THIS game, using historical context subtly if relevant.

Example of a good summary tone: "What a match! ${calculatedFinalResult.winnerName} clinched victory in a swift ${handsLength}-hand game. This marks their ${currentWinStreak} win in a row against ${calculatedFinalResult.winnerName === p1Name ? p2Name : p1Name}, and they even managed a shutout! Impressive stuff!"
(Adapt the example based on actual data, especially if it's not a shutout or a long streak).
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
    });
    return response.text;

  } catch (error) {
    console.error("Error generating AI game summary:", error);
    let errorMessage = "Could not generate AI summary.";
    if (error instanceof Error && error.message.includes("API_KEY")) {
      errorMessage = "Could not generate AI summary. API key might be missing or invalid.";
    } else if (error instanceof Error) {
      errorMessage = `Could not generate AI summary: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`;
    }
    return errorMessage;
  }
};