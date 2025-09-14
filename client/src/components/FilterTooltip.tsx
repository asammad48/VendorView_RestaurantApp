import React, { useState } from 'react';
import { Filter, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FilterOption {
  value: string;
  label: string;
  checked?: boolean;
}

interface FilterTooltipProps {
  filterType: 'checkbox' | 'input';
  placeholder?: string;
  options?: FilterOption[];
  onApply: (value: any) => void;
  onClear: () => void;
  currentValue?: string[] | string;
  title: string;
}

export function FilterTooltip({ 
  filterType, 
  placeholder, 
  options = [], 
  onApply, 
  onClear, 
  currentValue = filterType === 'checkbox' ? [] : '', 
  title 
}: FilterTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(typeof currentValue === 'string' ? currentValue : '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    Array.isArray(currentValue) ? currentValue : []
  );

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, optionValue]);
    } else {
      setSelectedOptions(selectedOptions.filter(val => val !== optionValue));
    }
  };

  const handleApply = () => {
    if (filterType === 'checkbox') {
      onApply(selectedOptions);
    } else {
      onApply(inputValue);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (filterType === 'checkbox') {
      setSelectedOptions([]);
    } else {
      setInputValue('');
    }
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

  const hasActiveFilters = filterType === 'checkbox' 
    ? selectedOptions.length > 0 
    : inputValue.length > 0;

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Filter 
              className={`w-4 h-4 transition-colors ${
                hasActiveFilters 
                  ? 'text-green-500' 
                  : 'text-gray-400 group-hover:text-green-500'
              }`} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="p-0 bg-white border border-gray-200 shadow-lg rounded-lg w-72"
        >
          <div className="p-3 space-y-3">
            <div className="font-medium text-gray-900 text-sm border-b border-gray-100 pb-2">
              Filter by {title}
            </div>
            
            {filterType === 'input' ? (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="pl-10 pr-4 border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  autoFocus
                  data-testid="filter-tooltip-input"
                />
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={selectedOptions.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(option.value, checked as boolean)
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <label
                      htmlFor={option.value}
                      className="text-sm text-gray-700 cursor-pointer flex-1"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                data-testid="filter-tooltip-clear"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="filter-tooltip-apply"
              >
                <Check className="w-3 h-3 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}