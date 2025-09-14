// Custom hook for making API calls with loading, error, and success states
import { useState } from 'react';
import { useToast } from './use-toast';

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApiCall<T>(
  apiFunction: (...args: any[]) => Promise<{ data?: T; error?: string; success?: string }>,
  showToast: boolean = true
): UseApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = async (...args: any[]): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setData(null);

    try {
      const result = await apiFunction(...args);

      if (result.error) {
        setError(result.error);
        if (showToast) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
        }
        return null;
      } else {
        if (result.data) {
          setData(result.data);
        }
        if (result.success) {
          setSuccess(result.success);
          if (showToast) {
            toast({
              title: "Success",
              description: result.success,
            });
          }
        }
        return result.data || null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (showToast) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setLoading(false);
    setError(null);
    setSuccess(null);
  };

  return {
    data,
    loading,
    error,
    success,
    execute,
    reset,
  };
}

// Hook for API calls that return arrays
export function useApiCallArray<T>(
  apiFunction: (...args: any[]) => Promise<{ data?: T[]; error?: string; success?: string }>,
  showToast: boolean = true
): UseApiCallResult<T[]> {
  return useApiCall<T[]>(apiFunction, showToast);
}

// Hook for API calls that don't return data (like delete operations)
export function useApiCallNoData(
  apiFunction: (...args: any[]) => Promise<{ error?: string; success?: string }>,
  showToast: boolean = true
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = async (...args: any[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiFunction(...args);

      if (result.error) {
        setError(result.error);
        if (showToast) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
        }
        return false;
      } else {
        if (result.success) {
          setSuccess(result.success);
          if (showToast) {
            toast({
              title: "Success",
              description: result.success,
            });
          }
        }
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (showToast) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(null);
  };

  return {
    loading,
    error,
    success,
    execute,
    reset,
  };
}