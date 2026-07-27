export type AILevel = 'beginner' | 'intermediate' | 'godly';

export class StockfishEngine {
  private worker: Worker;
  private resolveBestMove: ((move: string) => void) | null = null;
  
  constructor() {
    this.worker = new Worker('/stockfish.js');
    this.worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg === 'string' && msg.startsWith('bestmove')) {
        const move = msg.split(' ')[1];
        if (this.resolveBestMove) {
          this.resolveBestMove(move);
          this.resolveBestMove = null;
        }
      }
    };
    this.worker.postMessage('uci');
  }

  async getBestMove(fen: string, level: AILevel): Promise<string> {
    return new Promise((resolve) => {
      this.resolveBestMove = resolve;
      
      let skillLevel = 0;
      let depth = 1;
      let moveTime = 500;
      
      if (level === 'beginner') {
        skillLevel = 0;
        depth = 1;
        moveTime = 200;
      } else if (level === 'intermediate') {
        skillLevel = 10;
        depth = 10;
        moveTime = 1000;
      } else if (level === 'godly') {
        skillLevel = 20;
        depth = 20;
        moveTime = 2000;
      }
      
      this.worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth} movetime ${moveTime}`);
    });
  }
}
