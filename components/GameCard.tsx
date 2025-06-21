import React from 'react';
import { Game, Platform } from '../types';
import { Button } from './Button';
import { EditIcon, TrashIcon, PlayIcon } from './Icons';

interface GameCardProps {
  game: Game;
  platform?: Platform;
  onEdit: (game: Game) => void;
  onDelete: (gameId: string) => void;
  onLaunch: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, platform, onEdit, onDelete, onLaunch }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Check if the event target is not one of the inner buttons
      if (!(event.target instanceof HTMLElement && event.target.closest('button'))) {
        event.preventDefault();
        onLaunch(game);
      }
    }
  };

  return (
    <div 
      className="bg-neutral-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-neutral-900 transition-all duration-300 ease-in-out group flex flex-col h-full animate-fade-in"
      tabIndex={0} // Make the card itself focusable
      onKeyDown={handleKeyDown}
      role="group" // Or 'article' if more appropriate semantically
      aria-labelledby={`game-title-${game.id}`}
      aria-describedby={`game-desc-${game.id}`}
    >
      <div className="relative aspect-[3/4]">
        <img 
          src={game.coverImageUrl || `https://picsum.photos/seed/${game.id}/300/400`} 
          alt={game.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
           <Button 
            variant="primary" 
            size="md" 
            onClick={() => onLaunch(game)}
            className="w-full !opacity-0 group-hover:!opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100"
            leftIcon={<PlayIcon className="w-5 h-5"/>}
            // Make this button non-focusable if card itself handles launch, or ensure distinct interaction
            tabIndex={-1} // To prevent double tabbing if card itself is primary action
            aria-hidden="true" // Hidden from AT if card launch is primary
            >
            Launch Game
          </Button>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <h3 id={`game-title-${game.id}`} className="text-xl font-display font-semibold text-neutral-100 mb-1 truncate" title={game.title}>{game.title}</h3>
        <p className="text-sm text-primary-light mb-1">{platform?.name || 'Unknown Platform'}</p>
        <p id={`game-desc-${game.id}`} className="text-xs text-neutral-400 mb-3 flex-grow line-clamp-3" title={game.description}>{game.description || "No description available."}</p>
        
        <div className="mt-auto flex justify-between items-center">
          <div className="space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(game)} aria-label={`Edit ${game.title}`}>
              <EditIcon className="w-4 h-4 text-neutral-400 group-hover:text-primary-light" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(game.id)} aria-label={`Delete ${game.title}`}>
              <TrashIcon className="w-4 h-4 text-neutral-400 group-hover:text-red-500" />
            </Button>
          </div>
          <span className="text-xs text-neutral-500">{game.genre} - {game.releaseDate}</span>
        </div>
      </div>
    </div>
  );
};
