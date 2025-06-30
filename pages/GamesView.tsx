import React, { useState, useMemo } from 'react';
import { Game, Platform } from '../types';
import { GameCard } from '../components/GameCard';
import { GameForm } from '../components/GameForm';
import { Button } from '../components/Button';
import { PlusIcon, SearchIcon, GameControllerIcon } from '../components/Icons';
import { Input } from '../components/Input';

interface GamesViewProps {
  games: Game[];
  platforms: Platform[];
  onAddGame: (game: Game) => void;
  onUpdateGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onAddPlatform: (platformToAdd: { id: string; name: string; alias?: string }) => void; // Added prop
  // theGamesDbApiKey: string; // REMOVED - Handled by server
  // geminiApiKey: string; // REMOVED - Handled by server
}

export const GamesView: React.FC<GamesViewProps> = ({ 
  games, 
  platforms, 
  onAddGame, 
  onUpdateGame, 
  onDeleteGame,
  onAddPlatform // Added prop
  // theGamesDbApiKey, // REMOVED
  // geminiApiKey // REMOVED
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');

  const handleAddGame = () => {
    setEditingGame(null);
    setIsFormOpen(true);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleSubmitForm = (game: Game) => {
    if (editingGame) {
      onUpdateGame(game);
    } else {
      onAddGame(game);
    }
    setIsFormOpen(false);
    setEditingGame(null);
  };
  
  const handleLaunchGame = async (game: Game) => {
    const platform = platforms.find(p => p.id.toString() === game.platformId.toString());
    if (!platform) {
      alert(`Platform configuration not found for ${game.title}.`);
      return;
    }
    if (!platform.emulators || platform.emulators.length === 0) {
      alert(`No emulator configured for platform: ${platform.name}. Please configure one in the Platforms view.`);
      return;
    }
    // For simplicity, using the first configured emulator.
    // A more advanced version might let the user choose or set a default.
    const emulator = platform.emulators[0];

    console.log(`Attempting to launch ${game.title} with emulator ${emulator.name}`);
    try {
      const response = await fetch('/api/games/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: game.id, // Send gameId, server can look up details
          romPath: game.romPath,
          platformId: game.platformId,
          emulatorId: emulator.id // Send selected emulatorId
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to launch game (status: ${response.status})`);
      }
      alert(result.message || `Launching ${game.title}...`); // Or use a more sophisticated notification
    } catch (error) {
      console.error('Error launching game:', error);
      alert(`Error launching game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            game.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = filterPlatform ? game.platformId === filterPlatform : true;
      return matchesSearch && matchesPlatform;
    });
  }, [games, searchTerm, filterPlatform]);

  return (
    <div className="p-8 flex-grow h-full overflow-y-auto animate-fade-in">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h2 className="text-4xl font-display font-bold text-neutral-100">My Games</h2>
            <p className="text-neutral-400 text-sm">Browse and manage your retro game collection.</p>
        </div>
        <Button onClick={handleAddGame} leftIcon={<PlusIcon />} variant="primary" size="lg">
          Add Game
        </Button>
      </header>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-800 rounded-lg shadow">
        <Input 
          placeholder="Search games..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="md:col-span-2 !mb-0"
          className="!py-3"
        />
         <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition duration-150 ease-in-out"
        >
            <option value="">All Platforms</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              platform={platforms.find(p => p.id === game.platformId)}
              onEdit={handleEditGame}
              onDelete={onDeleteGame}
              onLaunch={handleLaunchGame}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <GameControllerIcon className="w-24 h-24 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-500">No games found.</h3>
          <p className="text-neutral-600">Try adjusting your search or add some new games!</p>
        </div>
      )}

      <GameForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitForm}
        platforms={platforms}
        initialGame={editingGame}
        onAddPlatform={onAddPlatform} // Pass down the function
        // theGamesDbApiKey={theGamesDbApiKey} // REMOVED
        // geminiApiKey={geminiApiKey} // REMOVED
      />
    </div>
  );
};