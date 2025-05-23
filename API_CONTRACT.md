# Gin Rummy Scorer API Contract (v1)
This same API_CONTRACT.md file is supplied to the frontend

## Data Types
The API will use the following data structures, based on your `types.ts`:

**`User` Object:**
```json
{
  "id": "string", // Server-generated unique identifier
  "name": "string",
  "gamesPlayedIds": ["string"], // Array of game IDs, updated by server
  "gamesWon": "number",         // Updated by server
  "gamesLost": "number"         // Updated by server
}
```

**`StoredGame` Object:**
```json
{
  "id": "string", // Server-generated unique identifier
  "date": "string", // ISO 8601 datetime string, server-generated on creation
  "settings": { /* GameSettings object from types.ts */
    "player1Id": "string",
    "player2Id": "string",
    "player1Name": "string",
    "player2Name": "string"
  },
  "hands": [ /* Array of HandResult objects from types.ts */
    {
      "id": "string", // Client-generated or server could re-index
      "player1Score": "number",
      "player2Score": "number",
      "winner": "Player1 | Player2 | Tie | null"
    }
  ],
  "finalResult": { /* FinalGameResult object from types.ts */
    "player1FinalScore": "number",
    "player2FinalScore": "number",
    "winnerName": "string",
    "winnerId": "string | null",
    "player1Name": "string",
    "player2Name": "string",
    "player1Id": "string",
    "player2Id": "string",
    "player1Cumulative": "number",
    "player2Cumulative": "number",
    "player1HandsWon": "number",
    "player2HandsWon": "number",
    "handWinBonus": "number"
  },
  "aiSummary": "string | null" // Provided by client
}
```
*(Note: `GameSettings`, `HandResult`, `FinalGameResult` structures are as defined in your `types.ts`)*

---

## User Endpoints

### 1. Get All Users
*   **Endpoint:** `GET /users`
*   **Description:** Retrieves a list of all registered users.
*   **Request Body:** None
*   **Successful Response (200 OK):**
    *   Content-Type: `application/json`
    *   Body: `User[]` (Array of User objects)
*   **Error Responses:**
    *   `500 Internal Server Error`: `{ "error": "Failed to retrieve users" }`

### 2. Create New User
*   **Endpoint:** `POST /users`
*   **Description:** Creates a new user. Server generates `id` and initializes stats.
*   **Request Body:**
    *   Content-Type: `application/json`
    *   Body:
        ```json
        { "name": "string" }
        ```
*   **Successful Response (201 Created):**
    *   Content-Type: `application/json`
    *   Body: `User` (The newly created User object with `id`, and initialized `gamesPlayedIds`, `gamesWon`, `gamesLost`)
*   **Error Responses:**
    *   `400 Bad Request`: `{ "error": "User name is required" }` or `{ "error": "User with this name already exists" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to create user" }`

### 3. Get User by ID
*   **Endpoint:** `GET /users/{userId}`
*   **Description:** Retrieves a specific user by their ID.
*   **Path Parameters:**
    *   `userId` (*string*): The ID of the user.
*   **Request Body:** None
*   **Successful Response (200 OK):**
    *   Content-Type: `application/json`
    *   Body: `User`
*   **Error Responses:**
    *   `404 Not Found`: `{ "error": "User not found" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to retrieve user" }`

### 4. Update User Name
*   **Endpoint:** `PUT /users/{userId}`
*   **Description:** Updates the name of an existing user. Other stats (`gamesPlayedIds`, `gamesWon`, `gamesLost`) are updated by the "Save Completed Game" endpoint.
*   **Path Parameters:**
    *   `userId` (*string*): The ID of the user to update.
*   **Request Body:**
    *   Content-Type: `application/json`
    *   Body:
        ```json
        { "name": "string" }
        ```
*   **Successful Response (200 OK):**
    *   Content-Type: `application/json`
    *   Body: `User` (The updated User object)
*   **Error Responses:**
    *   `400 Bad Request`: `{ "error": "New name is required" }` or `{ "error": "User with this name already exists" }`
    *   `404 Not Found`: `{ "error": "User not found" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to update user" }`

### 5. Delete User
*   **Endpoint:** `DELETE /users/{userId}`
*   **Description:** Deletes a user. Consider implications for past game records (e.g., anonymize or keep references). For this contract, we assume the user is deleted.
*   **Path Parameters:**
    *   `userId` (*string*): The ID of the user to delete.
*   **Request Body:** None
*   **Successful Response (204 No Content):**
*   **Error Responses:**
    *   `404 Not Found`: `{ "error": "User not found" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to delete user" }`

---

## Game Endpoints

### 1. Get All Past Games
*   **Endpoint:** `GET /games`
*   **Description:** Retrieves a list of all past games, typically sorted with the most recent first.
*   **Query Parameters (Optional):**
    *   `limit` (*number*): Number of games to return.
    *   `offset` (*number*): Number of games to skip (for pagination).
    *   `userId` (*string*): Filter games involving a specific user.
*   **Request Body:** None
*   **Successful Response (200 OK):**
    *   Content-Type: `application/json`
    *   Body: `StoredGame[]`
*   **Error Responses:**
    *   `500 Internal Server Error`: `{ "error": "Failed to retrieve games" }`

### 2. Save Completed Game
*   **Endpoint:** `POST /games`
*   **Description:** Saves a new completed game. The server will generate the game `id` and `date`. The server should also atomically update the `gamesPlayedIds`, `gamesWon`, and `gamesLost` statistics for both players involved in the game.
*   **Request Body:**
    *   Content-Type: `application/json`
    *   Body: `Omit<StoredGame, 'id' | 'date'>` (Client provides `settings`, `hands`, `finalResult`, and `aiSummary`).
*   **Successful Response (201 Created):**
    *   Content-Type: `application/json`
    *   Body: `StoredGame` (The complete StoredGame object including server-generated `id` and `date`)
*   **Error Responses:**
    *   `400 Bad Request`: `{ "error": "Invalid game data" }` or `{ "error": "Player ID not found" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to save game" }` (This could also include errors during user stat updates).

### 3. Get Game by ID
*   **Endpoint:** `GET /games/{gameId}`
*   **Description:** Retrieves a specific game by its ID.
*   **Path Parameters:**
    *   `gameId` (*string*): The ID of the game.
*   **Request Body:** None
*   **Successful Response (200 OK):**
    *   Content-Type: `application/json`
    *   Body: `StoredGame`
*   **Error Responses:**
    *   `404 Not Found`: `{ "error": "Game not found" }`
    *   `500 Internal Server Error`: `{ "error": "Failed to retrieve game" }`

---

## Authentication & Authorization

*   This contract does not explicitly define authentication/authorization mechanisms. For a production API, you would need to implement a strategy (e.g., JWT Bearer tokens, API keys for service-to-service communication if applicable). Endpoints might require authentication to ensure only authorized users can create/modify data.

## Notes on AI Summary
*   The `POST /games` endpoint currently expects the `aiSummary` to be provided by the client, as per your current application flow where the client calls the Gemini API.
*   If the backend were to take responsibility for generating the AI summary, the `aiSummary` field would be removed from the `POST /games` request body, and the server would generate it (asynchronously or synchronously) before storing the game. This would require the backend to have access to the Gemini API key.

---
