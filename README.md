# Socratic Chess Tutor

**Socratic Chess Tutor** is an interactive chess application and learning platform. Play chess against the built-in Stockfish engine across multiple difficulty levels while receiving real-time, Socratic guidance from an AI tutor powered by Google Gemini.

---

## 🌟 Features

- **Interactive Chessboard**: Smooth board rendering and piece movement powered by `react-chessboard` and `chess.js`.
- **Stockfish Engine Integration**: Play against Stockfish running locally in a Web Worker with configurable AI difficulty levels (*Beginner*, *Intermediate*, *Godly*).
- **Socratic AI Tutor**: An intelligent chess tutor powered by Google Gemini (`@google/genai`). Instead of simply revealing the best move, the tutor asks guiding questions, highlights tactical motifs (pins, forks, skewers), and points out threats to help players develop deep tactical intuition.
- **Move Hints & Tactical Analysis**: Real-time evaluation feeds into the tutor context to assist you when requesting hints or explanations.
- **Customization Settings**: Configure player credentials and custom API keys directly within the UI settings.

---

## 📦 Key Dependencies

### Frontend & UI
- **[React 19](https://react.dev/)**: Framework for building user interfaces.
- **[Vite](https://vitejs.dev/)**: High-performance development server and bundler.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Utility-first CSS framework for modern, responsive layout and styling.
- **[react-chessboard](https://github.com/Cl弈/react-chessboard)**: React component for rendering customizable chessboards.
- **[chess.js](https://github.com/jhlywa/chess.js)**: Full chess rules engine, move validation, and FEN/PGN state handling.
- **[stockfish.js](https://github.com/nmrugg/stockfish.js)**: Stockfish chess engine compiled to JavaScript/WASM for client-side evaluation.
- **[lucide-react](https://lucide.dev/)** & **[react-icons](https://react-icons.github.io/react-icons/)**: Icon libraries for modern UI controls.
- **[motion](https://motion.dev/)**: Animation library for smooth UI transitions and chat animations.

### Backend & AI Integration
- **[Express](https://expressjs.com/)**: Fast, minimalist Node.js web framework serving API endpoints and handling static asset delivery.
- **[@google/genai](https://www.npmjs.com/package/@google/genai)**: Official Google Gen AI SDK for interacting with Gemini models.
- **[dotenv](https://www.npmjs.com/package/dotenv)**: Module for loading environment variables from `.env`.
- **[tsx](https://github.com/privatenumber/tsx)** & **[esbuild](https://esbuild.github.io/)**: TypeScript execution and bundling tools for server development and production builds.

---

## 🔑 Gemini API Key Guidance

The AI Tutor requires access to a Google Gemini API key to generate Socratic guidance and positional feedback.

### 1. Obtaining a Key
1. Visit [Google AI Studio](https://aistudio.google.com/) or the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Generate a new **Gemini API Key**.

### 2. Configuring the API Key

#### Option A: Server Environment Variable (Recommended)
Add your Gemini API Key to your server environment file (`.env`):
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```
When running in cloud hosting environments (such as Google Cloud Run or AI Studio), this variable is automatically supplied or injected.

#### Option B: In-App UI Settings
You can also supply your key directly in the web UI:
1. Click the **Settings** (gear icon) in the top-right corner of the application.
2. Enter your Gemini API Key in the designated field.
3. The client will securely send the key with requests via the `X-Gemini-API-Key` request header.

> ⚠️ **Security Warning**: Never commit your `.env` file or hardcode your API keys into source files. Ensure `.env` is listed in your `.gitignore` file.

---

## 🛠️ Development Setup Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** (or `bun` / `yarn`)

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd socratic-chess-tutor
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration file to create `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`. Open your browser and navigate to this address.

5. **Lint / Type Check**:
   To verify TypeScript compilation with no errors:
   ```bash
   npm run lint
   ```

6. **Production Build & Execution**:
   To build the frontend assets and compile the Express server for production:
   ```bash
   npm run build
   ```
   To run the production build:
   ```bash
   npm run start
   ```

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `tsx server.ts` | Starts the Express backend with Vite HMR middleware for development on port 3000. |
| `build` | `vite build && esbuild ...` | Builds frontend static assets and bundles the backend server to `dist/server.cjs`. |
| `start` | `node dist/server.cjs` | Starts the bundled production server. |
| `lint` | `tsc --noEmit` | Runs TypeScript type-checking without outputting files. |
| `clean` | `rm -rf dist server.js` | Removes production build artifacts. |
