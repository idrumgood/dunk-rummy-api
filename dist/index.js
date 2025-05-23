"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const aiSummary_1 = require("./utils/aiSummary");
const storage_1 = require("@google-cloud/storage"); // Import the Storage class
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Configure Google Cloud Storage
const bucketName = 'gin-rummy'; // Replace with your bucket name
const storage = new storage_1.Storage();
const bucket = storage.bucket(bucketName);
// Define file names in GCS
const usersFileName = 'users.json';
const gamesFileName = 'games.json';
// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
// --- Helper Functions to Interact with GCS ---
async function uploadJsonToGCS(data, filename) {
    const file = bucket.file(filename);
    const dataString = JSON.stringify(data, null, 2); // Pretty-print JSON
    await file.save(dataString, {
        metadata: {
            contentType: 'application/json',
        },
    });
    console.log(`${filename} uploaded to gs://${bucketName}/${filename}`);
}
async function downloadJsonFromGCS(filename) {
    try {
        const file = bucket.file(filename);
        const [exists] = await file.exists();
        if (!exists) {
            console.log(`${filename} does not exist in gs://${bucketName}.  Returning an empty array.`);
            return [];
        }
        const [buffer] = await file.download();
        const content = buffer.toString('utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error downloading ${filename} from GCS:`, error);
        return []; // Return an empty array on error
    }
}
// --- Load data from GCS on application startup ---
let users = [];
let games = [];
async function initializeData() {
    users = await downloadJsonFromGCS(usersFileName);
    games = await downloadJsonFromGCS(gamesFileName);
    console.log('Data loaded from Google Cloud Storage');
}
initializeData().catch(console.error);
// --- User Routes ---
app.post('/users', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Name is required' });
    }
    const newUser = {
        id: generateId(),
        name,
        gamesPlayedIds: [],
        gamesWon: 0,
        gamesLost: 0,
    };
    users.push(newUser);
    await uploadJsonToGCS(users, usersFileName); // Save to GCS
    res.status(201).json(newUser);
});
app.get('/users', (req, res) => {
    res.json(users);
});
app.get('/users/:userId', (req, res) => {
    const { userId } = req.params;
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
});
app.put('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (name) {
        users[userIndex].name = name;
    }
    await uploadJsonToGCS(users, usersFileName); // Save to GCS
    res.json(users[userIndex]);
});
app.delete('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    if (users.length === initialLength) {
        return res.status(404).json({ message: 'User not found' });
    }
    await uploadJsonToGCS(users, usersFileName); // Save to GCS
    res.status(204).send();
});
// --- Game Routes ---
app.post('/games', async (req, res) => {
    const gameData = req.body;
    if (!gameData.settings || !gameData.hands || !gameData.finalResult) {
        return res.status(400).json({ message: 'Invalid game data' });
    }
    const player1 = users.find(u => u.id === gameData.settings.player1Id);
    const player2 = users.find(u => u.id === gameData.settings.player2Id);
    if (!player1 || !player2) {
        return res.status(404).json({ message: 'One or both players not found' });
    }
    const newGame = {
        id: generateId(),
        date: new Date().toISOString(),
        settings: gameData.settings,
        hands: gameData.hands,
        finalResult: gameData.finalResult,
        aiSummary: null,
    };
    games.push(newGame);
    await uploadJsonToGCS(games, gamesFileName); // Save to GCS
    player1.gamesPlayedIds.push(newGame.id);
    player2.gamesPlayedIds.push(newGame.id);
    if (newGame.finalResult.winnerId === player1.id) {
        player1.gamesWon++;
        player2.gamesLost++;
    }
    else if (newGame.finalResult.winnerId === player2.id) {
        player2.gamesWon++;
        player1.gamesLost++;
    }
    await uploadJsonToGCS(users, usersFileName); // Update user stats in GCS
    const p1Name = player1.name;
    const p2Name = player2.name;
    const calculatedFinalResult = newGame.finalResult;
    const handsLength = newGame.hands.length;
    const targetScore = 200;
    const handWinBonus = 10;
    const shutout = (calculatedFinalResult.player1Cumulative === 0 || calculatedFinalResult.player2Cumulative === 0);
    const gamesBetweenPlayersHistory = games.filter(g => (g.settings.player1Id === player1.id && g.settings.player2Id === player2.id) || (g.settings.player1Id === player2.id && g.settings.player2Id === player1.id));
    const headToHeadP1Wins = gamesBetweenPlayersHistory.filter(g => g.finalResult.winnerId === player1.id).length;
    const headToHeadP2Wins = gamesBetweenPlayersHistory.filter(g => g.finalResult.winnerId === player2.id).length;
    let currentWinStreak = 0;
    if (calculatedFinalResult.winnerId) {
        let streak = 1;
        for (let i = gamesBetweenPlayersHistory.length - 1; i >= 0; i--) {
            if (gamesBetweenPlayersHistory[i].finalResult.winnerId === calculatedFinalResult.winnerId) {
                streak++;
            }
            else {
                break;
            }
        }
        currentWinStreak = streak;
    }
    newGame.aiSummary = await (0, aiSummary_1.generateGameSummary)({
        p1Name,
        p2Name,
        calculatedFinalResult,
        handsLength,
        targetScore,
        handWinBonus,
        shutout,
        gamesBetweenPlayersHistory,
        headToHeadP1Wins,
        headToHeadP2Wins,
        currentWinStreak
    });
    await uploadJsonToGCS(games, gamesFileName); // Save to GCS after AI summary
    res.status(201).json(newGame);
});
app.get('/users/:userId/games', (req, res) => {
    const { userId } = req.params;
    const userGames = games.filter(g => g.settings.player1Id === userId || g.settings.player2Id === userId);
    res.json(userGames);
});
app.get('/games', (req, res) => {
    res.json(games);
});
app.get('/games/:gameId', (req, res) => {
    const { gameId } = req.params;
    const game = games.find(g => g.id === gameId);
    if (!game) {
        return res.status(404).json({ error: "Game not found" });
    }
    res.json(game);
});
const port = parseInt(process.env.PORT || '8080');
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
//# sourceMappingURL=index.js.map