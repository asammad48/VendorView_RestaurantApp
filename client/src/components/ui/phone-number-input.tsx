import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  COUNTRY_PHONE_OPTIONS,
  CountryPhoneOption,
  splitPhoneNumber,
  combinePhoneNumber,
} from "@/lib/phoneUtils";

interface PhoneNumberInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectTestId?: string;
  inputTestId?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  selectTestId,
  inputTestId,
}: PhoneNumberInputProps) {
  const parsedPhone = useMemo(() => splitPhoneNumber(value), [value]);
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryPhoneOption>(parsedPhone.country);
  const [localNumber, setLocalNumber] = useState(parsedPhone.localNumber);

  useEffect(() => {
    setSelectedCountry(parsedPhone.country);
    setLocalNumber(parsedPhone.localNumber);
  }, [parsedPhone.country.code, parsedPhone.localNumber]);

  const handleCountryChange = (code: string) => {
    const country =
      COUNTRY_PHONE_OPTIONS.find((item) => item.code === code) ||
      COUNTRY_PHONE_OPTIONS[0];
    setSelectedCountry(country);
    onChange(combinePhoneNumber(country, localNumber));
    setOpen(false);
  };

  const handleNumberChange = (rawValue: string) => {
    const normalized = rawValue.replace(/[^\d]/g, "");
    setLocalNumber(normalized);
    onChange(combinePhoneNumber(selectedCountry, normalized));
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-[170px] justify-between"
            data-testid={selectTestId}
          >
            <span className="truncate">
              {selectedCountry.flag} {selectedCountry.dialCode}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList className="max-h-56 overflow-y-auto">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRY_PHONE_OPTIONS.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => handleCountryChange(country.code)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.code === country.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {country.flag} {country.name} ({country.dialCode})
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        value={localNumber}
        onChange={(event) => handleNumberChange(event.target.value)}
        placeholder={placeholder}
        className="w-full"
        data-testid={inputTestId}
      />
    </div>
  );
}
