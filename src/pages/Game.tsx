import { useParams, Navigate } from "react-router-dom";
import QuizGame from "./games/QuizGame";
import MemoryGame from "./games/MemoryGame";
import BalloonGame from "./games/BalloonGame";
import TreasureGame from "./games/TreasureGame";
import RunnerGame from "./games/RunnerGame";
import SorterGame from "./games/SorterGame";
import Match3Game from "./games/Match3Game";
import TripleMatchGame from "./games/TripleMatchGame";

const GAMES = ["memory", "balloon", "treasure", "runner", "sorter", "match3", "triple", "quiz"] as const;

const Game = () => {
  const { gameId } = useParams<{ gameId: string }>();
  if (!GAMES.includes(gameId as typeof GAMES[number])) return <Navigate to="/oyunlar" replace />;

  switch (gameId) {
    case "memory": return <MemoryGame />;
    case "balloon": return <BalloonGame />;
    case "treasure": return <TreasureGame />;
    case "runner": return <RunnerGame />;
    case "sorter": return <SorterGame />;
    case "match3": return <Match3Game />;
    case "triple": return <TripleMatchGame />;
    case "quiz": return <QuizGame />;
    default: return <Navigate to="/oyunlar" replace />;
  }
};

export default Game;
