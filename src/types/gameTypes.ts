export interface User {
  id: string; // Server-generated unique identifier
  name: string;
  gamesPlayedIds: string[]; // Array of game IDs, updated by server
  gamesWon: number;         // Updated by server
  gamesLost: number;         // Updated by server
}

export interface GameSettings {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export interface HandResult {
  id: string; // Client-generated or server could re-index
  player1Score: number;
  player2Score: number;
  winner: "Player1" | "Player2" | "Tie" | null;
}

export interface FinalGameResult {
  player1FinalScore: number;
  player2FinalScore: number;
  winnerName: string;
  winnerId: string | null;
  player1Name: string;
  player2Name: string;
  player1Id: string;
  player2Id: string;
  player1Cumulative: number;
  player2Cumulative: number;
  player1HandsWon: number;
  player2HandsWon: number;
  handWinBonus: number;
}

export interface StoredGame { // Renamed from Game to match API_CONTRACT more clearly
  id: string; // Server-generated unique identifier
  date: string; // ISO 8601 datetime string, server-generated on creation
  settings: GameSettings;
  hands: HandResult[];
  finalResult: FinalGameResult;
  aiSummary: string | null; // Provided by client
}