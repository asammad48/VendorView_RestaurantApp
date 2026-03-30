export type CountryPhoneOption = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
};

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
];

const DEFAULT_COUNTRY = COUNTRY_PHONE_OPTIONS[0];

const stripToNumeric = (value: string) => value.replace(/[^\d]/g, "");

export const splitPhoneNumber = (value?: string | null) => {
  const safeValue = (value || "").trim();

  if (!safeValue) {
    return { country: DEFAULT_COUNTRY, localNumber: "" };
  }

  const matchingCountry = COUNTRY_PHONE_OPTIONS.find(({ dialCode }) =>
    safeValue.startsWith(dialCode),
  );

  if (!matchingCountry) {
    return {
      country: DEFAULT_COUNTRY,
      localNumber: stripToNumeric(safeValue),
    };
  }

  const localNumber = stripToNumeric(
    safeValue.slice(matchingCountry.dialCode.length),
  );

  return { country: matchingCountry, localNumber };
};

export const combinePhoneNumber = (
  country: CountryPhoneOption,
  localNumber: string,
) => {
  const normalizedNumber = stripToNumeric(localNumber);
  if (!normalizedNumber) {
    return "";
  }

  return `${country.dialCode}${normalizedNumber}`;
};
