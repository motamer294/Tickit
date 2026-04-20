import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../api/config';

interface PolledMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UsePollingFallbackOptions {
  enabled?: boolean;
  timeout?: number;
  maxBackoffInterval?: number;
  minBackoffInterval?: number;
  onMessageReceived?: (messages: PolledMessage[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for AJAX long polling fallback when WebSocket is unavailable
 * Features:
 * - Exponential backoff retry on failure
 * - Configurable polling timeout and intervals
 * - Automatic cleanup
 * - Message delivery callback
 *
 * Usage:
 * const { isPolling, messageCount } = usePollingFallback({
 *   enabled: false, // Start disabled, enable when WebSocket fails
 *   timeout: 30,
 *   onMessageReceived: (messages) => handleMessages(messages)
 * });
 */
export const usePollingFallback = (options: UsePollingFallbackOptions = {}) => {
  const {
    enabled = false,
    timeout = 30,
    maxBackoffInterval = 30000,
    minBackoffInterval = 1000,
    onMessageReceived,
    onError
  } = options;

  const [isPolling, setIsPolling] = useState(enabled);
  const [messageCount, setMessageCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(minBackoffInterval);
  const isMountedRef = useRef(true);

  // Clear message queue when polling starts
  const clearQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || undefined;
      await apiClient.delete('/message_queue/clear', token);
    } catch (error) {
      console.warn('[Polling] Failed to clear queue:', error);
    }
  }, []);

  /**
   * Perform a single poll request
   */
  const executePoll = useCallback(async () => {
    if (!isMountedRef.current || !isPolling) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Polling] No token available');
        return;
      }

      // Fetch messages from the polling endpoint
      const response = await fetch(
        `/api/message_queue/receive?timeout=${timeout}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Polling request failed: ${response.status}`);
      }

      const data = await response.json();
      const messages: PolledMessage[] = data.messages || [];

      if (!isMountedRef.current) return;

      if (messages.length > 0) {
        // Reset backoff on successful message retrieval
        backoffRef.current = minBackoffInterval;

        setMessageCount(c => c + messages.length);

        // Emit messages to callback
        if (onMessageReceived) {
          onMessageReceived(messages);
        }

        console.log(`[Polling] Received ${messages.length} messages`);
      }

    } catch (error) {
      if (!isMountedRef.current) return;

      const err = error instanceof Error ? error : new Error(String(error));

      // Exponential backoff: increase wait time on consecutive failures
      backoffRef.current = Math.min(
        backoffRef.current * 1.5,
        maxBackoffInterval
      );

      console.error('[Polling] Poll error, backing off:', backoffRef.current, err.message);

      if (onError) {
        onError(err);
      }
    }
  }, [isPolling, timeout, minBackoffInterval, maxBackoffInterval, onMessageReceived, onError]);

  /**
   * Start polling with backoff management
   */
  const startPolling = useCallback(() => {
    if (!isMountedRef.current) return;

    console.log('[Polling] Starting polling fallback');
    setIsPolling(true);
    backoffRef.current = minBackoffInterval;

    // Clear existing queue
    clearQueue();

    // Execute immediate poll
    executePoll();

    // Set up interval for subsequent polls
    // Use dynamic interval that increases with backoff
    const setupInterval = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      if (isMountedRef.current && isPolling) {
        pollIntervalRef.current = setInterval(async () => {
          await executePoll();
        }, backoffRef.current);
      }
    };

    setupInterval();
  }, [minBackoffInterval, clearQueue, executePoll, isPolling]);

  /**
   * Stop polling and clean up
   */
  const stopPolling = useCallback(() => {
    if (!isMountedRef.current) return;

    console.log('[Polling] Stopping polling fallback');
    setIsPolling(false);
    backoffRef.current = minBackoffInterval;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Clear queue when stopping
    clearQueue();
  }, [minBackoffInterval, clearQueue]);

  /**
   * Reset polling state
   */
  const reset = useCallback(() => {
    setMessageCount(0);
    backoffRef.current = minBackoffInterval;
  }, [minBackoffInterval]);

  // Handle enabled prop changes
  useEffect(() => {
    if (enabled && !isPolling) {
      startPolling();
    } else if (!enabled && isPolling) {
      stopPolling();
    }
  }, [enabled, isPolling, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    isPolling,
    messageCount,
    startPolling,
    stopPolling,
    reset,
    backoffInterval: backoffRef.current
  };
};

export type UsePollingFallbackReturn = ReturnType<typeof usePollingFallback>;
