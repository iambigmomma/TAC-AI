import React from 'react';
import { SearchMode } from '../ChatWindow'; // Assuming SearchMode type is exported from ChatWindow
import { cn } from '@/lib/utils';

interface SearchModeToggleProps {
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
}

const SearchModeToggle: React.FC<SearchModeToggleProps> = ({
  searchMode,
  setSearchMode,
}) => {
  const modes: SearchMode[] = ['web', 'docs', 'both'];

  return (
    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg space-x-1">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button" // Prevent form submission
          onClick={() => setSearchMode(mode)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150',
            searchMode === mode
              ? 'bg-white text-gray-800 shadow dark:bg-gray-600 dark:text-white'
              : 'text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-600',
          )}
        >
          {mode === 'web' && 'Web'}
          {mode === 'docs' && 'Docs'}
          {mode === 'both' && 'Both'}
        </button>
      ))}
    </div>
  );
};

export default SearchModeToggle;
