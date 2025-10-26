import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColumnSearchPopoverProps {
  placeholder: string;
  onSearch: (value: string) => void;
  onClear: () => void;
  currentValue?: string;
  tableName: string;
}

export function ColumnSearchPopover({ 
  placeholder, 
  onSearch, 
  onClear, 
  currentValue = '',
  tableName 
}: ColumnSearchPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(currentValue);

  // Sync internal state with external currentValue prop
  useEffect(() => {
    setSearchValue(currentValue);
  }, [currentValue]);

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-green-50"
          data-testid={`button-search-${tableName}-name`}
          aria-label={`Search ${tableName}`}
          aria-description={`Open search popup to filter ${tableName} by name`}
        >
          <Search 
            className={`w-3.5 h-3.5 ${currentValue ? 'text-green-600' : 'text-gray-400'} hover:text-green-500 transition-colors`} 
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="start"
        className="p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg w-72"
      >
        <div className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pl-10 pr-4 border border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500"
              autoFocus
              data-testid={`input-search-${tableName}`}
            />
          </div>
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              data-testid={`button-clear-search-${tableName}`}
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid={`button-apply-search-${tableName}`}
            >
              <Search className="w-3 h-3 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
