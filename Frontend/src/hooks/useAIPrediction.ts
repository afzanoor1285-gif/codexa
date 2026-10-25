import { useState } from 'react';
import { predictAICode, AIPredictionResponse } from '@/lib/api';

interface UseAIPredictionReturn {
  predict: (code: string) => Promise<void>;
  data: AIPredictionResponse | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Custom hook to handle AI code prediction with loading, success, and error states
 */
export const useAIPrediction = (): UseAIPredictionReturn => {
  const [data, setData] = useState<AIPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = async (code: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await predictAICode(code);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    predict,
    data,
    isLoading,
    error,
    reset,
  };
};