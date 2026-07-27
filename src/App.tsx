/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  Send, Bot, User, RotateCcw, 
  Settings, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  id: string;
  role: 'user' | 'tutor';
  content: string;
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'tutor', content: 'Hello! I am your Socratic chess tutor. Make a move or ask me a question about the board.' }
  ]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [playerName, setPlayerName] = useState(localStorage.getItem('player_name') || 'You');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [aiLevel, setAiLevel] = useState<'Beginner' | 'Intermediate' | 'Godly'>('Beginner');
  
  const engineRef = useRef<Worker | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    engineRef.current = new Worker('/stockfish.js');
    engineRef.current.postMessage('uci');

    engineRef.current.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg === 'string' && msg.startsWith('bestmove')) {
        const move = msg.split(' ')[1];
        if (move && move !== '(none)') {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.length === 5 ? move[4] : undefined;
          
          const gameCopy = new Chess(gameRef.current.fen());
          try {
            gameCopy.move({ from, to, promotion });
            setGame(gameCopy);
            setFen(gameCopy.fen());
            
            if (gameCopy.isGameOver()) {
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'tutor', content: 'Game over!' }]);
            }
          } catch (err) {
            console.error('Invalid move from engine:', move);
          }
        }
      }
    };

    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  function triggerAiMove(gameCopy: Chess) {
    if (!engineRef.current || gameCopy.isGameOver()) return;
    
    let skillLevel = 0;
    let depth = 1;
    let moveTime = 200;
    
    if (aiLevel === 'Intermediate') {
      skillLevel = 10;
      depth = 10;
      moveTime = 1000;
    } else if (aiLevel === 'Godly') {
      skillLevel = 20;
      depth = 20;
      moveTime = 2000;
    }
    
    engineRef.current.postMessage(`setoption name Skill Level value ${skillLevel}`);
    engineRef.current.postMessage(`position fen ${gameCopy.fen()}`);
    engineRef.current.postMessage(`go depth ${depth} movetime ${moveTime}`);
  }

  function makeAMove(move: any) {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      setFen(gameCopy.fen());
      
      // Trigger AI after user moves
      if (gameCopy.turn() === 'b') {
        setTimeout(() => triggerAiMove(gameCopy), 250);
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  function getMoveOptions(square: string) {
    const moves = game.moves({
      square,
      verbose: true
    }) as any[];
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move: any) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)'
    };
    setOptionSquares(newSquares);
  }

  function onSquareClick({ square }: any) {
    if (game.get(square as any)) {
      getMoveOptions(square);
    } else {
      setOptionSquares({});
    }
  }

  function onPieceDrag({ square }: any) {
    if (square) {
      getMoveOptions(square);
    }
  }

  function onDrop({ sourceSquare, targetSquare }: any) {
    setOptionSquares({});
    if (!targetSquare) return false;
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    return move;
  }

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setOptionSquares({});
    setMessages([{ id: Date.now().toString(), role: 'tutor', content: 'New game started! How can I help?' }]);
  };

  const getHintBestMove = async (fen: string): Promise<string> => {
    return new Promise((resolve) => {
      const worker = new Worker('/stockfish.js');
      worker.onmessage = (e) => {
        const msg = e.data;
        if (typeof msg === 'string' && msg.startsWith('bestmove')) {
          const move = msg.split(' ')[1];
          worker.terminate();
          resolve(move);
        }
      };
      worker.postMessage('uci');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage('go depth 10');
    });
  };

  const handleSendMessage = async (e?: React.FormEvent, customMessage?: string) => {
    e?.preventDefault();
    const messageToSend = customMessage || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setIsLoading(true);

    try {
      let bestMoveHint = '';
      if (!game.isGameOver()) {
         bestMoveHint = await getHintBestMove(game.fen());
      }
      
      const apiKey = localStorage.getItem('gemini_api_key') || '';

      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey
        },
        body: JSON.stringify({
          message: userMsg.content,
          fen: game.fen(),
          boardState: game.board(),
          bestMoveHint,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'tutor', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'tutor', content: `Error: ${data.error || 'Something went wrong'}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'tutor', content: 'Network error communicating with tutor.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#312E2B] text-white flex font-sans overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[72px] bg-[#262421] flex flex-col items-center py-4 gap-6 shrink-0 z-20 hidden md:flex">
        <div className="text-[#81B64C] font-bold text-3xl mb-2">♞</div>
        <div className="flex flex-col gap-6 text-[#A7A6A2] items-center">
        </div>
        <div className="mt-auto flex flex-col gap-6 text-[#A7A6A2] mb-4">
          <Settings 
            className="w-6 h-6 hover:text-white cursor-pointer transition-colors" 
            onClick={() => setIsSettingsOpen(true)}
          />
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative min-w-0">
        <div className="w-full max-w-[800px] flex flex-col">
          {/* Top Player (Tutor) */}
          <div className="flex justify-between items-center mb-2 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-700 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-neutral-300" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">AI Opponent</span>
                  <span className="text-[10px] px-1 py-0.5 bg-[#cb3430] text-white rounded font-bold leading-none">BOT</span>
                </div>
                <div className="text-xs text-[#A7A6A2]">Stockfish</div>
              </div>
            </div>
            
            <select
              value={aiLevel}
              onChange={(e) => setAiLevel(e.target.value as any)}
              className="bg-[#262421] border border-[#403D39] text-[#A7A6A2] text-sm rounded px-2 py-1 focus:outline-none focus:border-[#81B64C]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Godly">Godly</option>
            </select>
          </div>

          {/* Board */}
          <div className="w-full aspect-square relative rounded shadow-2xl">
            <Chessboard 
              options={{
                position: fen,
                onPieceDrop: onDrop,
                onPieceDrag: onPieceDrag,
                onSquareClick: onSquareClick,
                squareStyles: optionSquares,
                darkSquareStyle: { backgroundColor: '#779556' },
                lightSquareStyle: { backgroundColor: '#ebecd0' },
                animationDurationInMs: 200,
                canDragPiece: ({ piece }: any) => {
                  const pieceType = typeof piece === 'string' ? piece : (piece as any)?.pieceType;
                  return pieceType ? pieceType[0] === 'w' : true;
                }
              }}
            />
          </div>

          {/* Bottom Player (You) */}
          <div className="flex justify-between items-center mt-2 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-700 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                <User className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{playerName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Chat / UI) */}
      <div className="w-full lg:w-[400px] bg-[#262421] flex flex-col shrink-0 border-l border-[#403D39] z-10 hidden lg:flex">
        {/* Tabs */}
        <div className="flex h-[52px] bg-[#21201D] text-sm font-semibold text-[#A7A6A2]">
          <div className="flex-1 flex items-center justify-center border-b-[3px] border-[#81B64C] text-white cursor-pointer bg-[#262421] transition-colors">
            Chat
          </div>
          <div className="flex-1 flex items-center justify-center border-b-[3px] border-transparent hover:text-white cursor-pointer transition-colors" onClick={resetGame}>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Restart
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold",
                msg.role === 'user' 
                  ? "bg-neutral-600" 
                  : "bg-[#cb3430]"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={cn(
                "px-4 py-3 text-sm leading-relaxed max-w-[85%] break-words rounded-md",
                msg.role === 'user' 
                  ? "bg-[#312E2B] text-white" 
                  : "bg-[#312E2B] text-[#A7A6A2]"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded bg-[#cb3430] shrink-0 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-4 py-4 bg-[#312E2B] rounded-md flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#A7A6A2] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#A7A6A2] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#A7A6A2] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-[#262421] border-t border-[#403D39] flex flex-col gap-3">
          {!apiKey && (
            <div className="bg-[#312E2B] p-3 rounded border border-[#403D39]">
              <p className="text-xs text-[#A7A6A2] mb-2">
                To use the AI Tutor, please provide your Gemini API key from <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-[#81B64C] hover:underline">Google AI Studio</a>.
              </p>
              <input
                type="password"
                placeholder="Enter Gemini API Key..."
                className="w-full bg-[#262421] border border-[#403D39] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#81B64C] text-white placeholder:text-[#A7A6A2] transition-colors"
                onChange={(e) => {
                  const val = e.target.value;
                  setApiKey(val);
                  localStorage.setItem('gemini_api_key', val);
                }}
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => handleSendMessage(undefined, "What is the next best move?")}
              disabled={isLoading || !apiKey}
              className="px-3 py-1.5 text-xs bg-[#312E2B] border border-[#403D39] rounded-full text-[#A7A6A2] hover:text-white hover:border-[#81B64C] hover:bg-[#312E2B] transition-colors whitespace-nowrap overflow-hidden text-ellipsis disabled:opacity-50 disabled:cursor-not-allowed"
            >
              What is the best next move?
            </button>
          </div>

          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a hint or analysis..."
              className="w-full bg-[#312E2B] border border-[#403D39] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#81B64C] text-white placeholder:text-[#A7A6A2] transition-colors"
              disabled={isLoading || !apiKey}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !apiKey}
              className="absolute right-2 top-2 p-1.5 bg-[#81B64C] hover:bg-[#a3d160] disabled:bg-[#403D39] disabled:text-[#A7A6A2] text-white rounded transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#262421] border border-[#403D39] rounded-lg w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-[#A7A6A2] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#A7A6A2]">Player Name</label>
                <input
                  type="text"
                  value={playerName}
                  placeholder="Enter Player Name..."
                  className="w-full bg-[#312E2B] border border-[#403D39] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#81B64C] text-white placeholder:text-[#A7A6A2] transition-colors"
                  onChange={(e) => {
                    const val = e.target.value;
                    setPlayerName(val);
                    localStorage.setItem('player_name', val);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#A7A6A2]">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  placeholder="Enter Gemini API Key..."
                  className="w-full bg-[#312E2B] border border-[#403D39] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#81B64C] text-white placeholder:text-[#A7A6A2] transition-colors"
                  onChange={(e) => {
                    const val = e.target.value;
                    setApiKey(val);
                    localStorage.setItem('gemini_api_key', val);
                  }}
                />
                <p className="text-xs text-[#A7A6A2]">
                  Get your key from <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-[#81B64C] hover:underline">Google AI Studio</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
