import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

function getAI(userKey?: string) {
  const key = userKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey: key });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for the AI Tutor
  app.post('/api/tutor', async (req, res) => {
    try {
      const { message, boardState, fen, chatHistory, bestMoveHint } = req.body;
      const apiKey = req.headers['x-gemini-api-key'] as string | undefined;

      const client = getAI(apiKey);
      
      const systemInstruction = `You are a Socratic chess tutor. The user is playing a game of chess against an AI or analyzing a board. 
They are asking for help, hints, or chatting about the game.
You are provided with the current board state in JSON format and the FEN string.
Current FEN: ${fen}
Current Board State (JSON): ${JSON.stringify(boardState)}
${bestMoveHint ? `\nHint from Stockfish: The best next move is ${bestMoveHint}. Use this to guide the user, but do not just blurt it out unless they ask.` : ''}

INSTRUCTIONS:
1. DO NOT simply give the user the best move right away.
2. Act as a Socratic tutor. Ask guiding questions to help them evaluate the position.
3. Point out threats, undefended pieces, or tactical motifs (pins, forks, skewers) that exist in the current position, but try to lead them to see it.
4. Keep your responses succinct and conversational.
5. If the user just says "hi", greet them and ask how the game is going or what they'd like help with.`;

      const prompt = `Chat History:\n${chatHistory.map((msg: any) => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`).join('\n')}

Student's latest message: ${message}

Respond as the Socratic chess tutor:`;

      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });

    } catch (error: any) {
      console.error('Error calling Gemini:', error);
      res.status(500).json({ error: error.message || 'Failed to get tutor response' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
