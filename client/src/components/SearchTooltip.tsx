import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SearchTooltipProps {
  placeholder: string;
  onSearch: (value: string) => void;
  onClear: () => void;
  currentValue?: string;
}

export function SearchTooltip({ placeholder, onSearch, onClear, currentValue = '' }: SearchTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(currentValue);

  const handleApply = () => {
    onSearch(searchValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchValue('');
    onClear();
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Search 
              className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="p-0 bg-white border border-gray-200 shadow-lg rounded-lg w-72"
        >
          <div className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={placeholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pl-10 pr-4 border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                autoFocus
                data-testid="search-tooltip-input"
              />
            </div>
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                data-testid="search-tooltip-clear"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="search-tooltip-apply"
              >
                <Search className="w-3 h-3 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}