import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
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
  };

  const handleNumberChange = (rawValue: string) => {
    const normalized = rawValue.replace(/[^\d]/g, "");
    setLocalNumber(normalized);
    onChange(combinePhoneNumber(selectedCountry, normalized));
  };

  return (
    <div className="flex gap-2">
      <select
        value={selectedCountry.code}
        onChange={(event) => handleCountryChange(event.target.value)}
        className="h-10 w-[150px] rounded-md border border-input bg-background px-3 text-sm"
        data-testid={selectTestId}
      >
        {COUNTRY_PHONE_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.dialCode}
          </option>
        ))}
      </select>
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
