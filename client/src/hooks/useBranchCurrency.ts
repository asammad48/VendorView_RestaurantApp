import { useQuery } from '@tanstack/react-query';
import { branchApi } from '@/lib/apiRepository';
import { formatCurrency, getCurrencySymbol, formatPriceFromCents } from '@/lib/currencyUtils';
import type { Branch } from '@/types/schema';

/**
 * Hook to get branch currency information and formatting utilities
 * @param branchId - The branch ID to get currency for
 * @returns Currency utilities and branch data
 */
export const useBranchCurrency = (branchId?: number) => {
  // Fetch branch data to get currency
  const { data: branchData, isLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) throw new Error('Branch ID is required');
      return await branchApi.getBranchById(branchId) as Branch;
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const currency = (branchData as Branch)?.currency || 'USD';
  
  return {
    currency,
    branchData,
    isLoading,
    // Utility functions with branch currency
    formatPrice: (amount: number) => formatCurrency(amount, currency),
    formatPriceFromCents: (cents: number) => formatCurrency(cents / 100, currency),
    getCurrencySymbol: () => getCurrencySymbol(currency),
  };
};