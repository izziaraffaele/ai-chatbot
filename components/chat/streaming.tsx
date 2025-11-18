"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChatDataTypes } from "@/lib/types";

/** Handles stream data parts in subscription callbacks */
type DataStreamSubscriptionHandler = (part: DataUIPart<ChatDataTypes>) => void;

type DataStreamContextValue = {
  dataStream: DataUIPart<ChatDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<ChatDataTypes>[]>
  >;
  subscribe: (handler: DataStreamSubscriptionHandler) => () => void;
  _registerSubscriber: (
    callback: (subscribers: Set<DataStreamSubscriptionHandler>) => void
  ) => void;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

/**
 * Provides pub/sub stream data context for real-time features.
 * Use with DataStreamDispatcher to handle streaming updates.
 *
 * @example
 * <DataStreamProvider>
 *   <AssistantChat />
 *   <DataStreamDispatcher />
 * </DataStreamProvider>
 */
export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<ChatDataTypes>[]>([]);

  const subscribersRef = useRef<Set<DataStreamSubscriptionHandler>>(new Set());

  const subscribe = useCallback((handler: DataStreamSubscriptionHandler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const _registerSubscriber = useCallback(
    (callback: (subscribers: Set<DataStreamSubscriptionHandler>) => void) => {
      callback(subscribersRef.current);
    },
    []
  );

  const value = useMemo(
    () => ({ dataStream, setDataStream, subscribe, _registerSubscriber }),
    [dataStream, subscribe, _registerSubscriber]
  );

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

/**
 * useDataStream Hook
 * Access streaming data context
 */
export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error("useDataStream must be used within a DataStreamProvider");
  }
  return context;
}

/**
 * useDataStreamSubscription Hook
 * Subscribe to data stream parts with optional filtering
 *
 * @example
 * // Subscribe to all artifact-related stream parts
 * useDataStreamSubscription(
 *   (part) => part.type.startsWith('data-'),
 *   (part) => {
 *     console.log('Artifact stream part:', part);
 *   }
 * );
 *
 * @example
 * // Subscribe to specific types
 * useDataStreamSubscription(
 *   (part) => part.type === 'data-title',
 *   (part) => {
 *     setTitle(part.data);
 *   }
 * );
 */
export function useDataStreamSubscription(
  filter: (part: DataUIPart<ChatDataTypes>) => boolean,
  handler: (part: DataUIPart<ChatDataTypes>) => void
) {
  const { subscribe } = useDataStream();

  useEffect(() => {
    const wrappedHandler = (part: DataUIPart<ChatDataTypes>) => {
      if (filter(part)) {
        handler(part);
      }
    };

    return subscribe(wrappedHandler);
  }, [subscribe, filter, handler]);
}

/**
 * DataStreamDispatcher
 * Generic dispatcher that processes stream and notifies subscribers
 * Replaces the artifact-specific DataStreamHandler
 */
export function DataStreamDispatcher() {
  const { dataStream, setDataStream, _registerSubscriber } = useDataStream();
  const subscribersRef = useRef<Set<DataStreamSubscriptionHandler>>(new Set());

  // Register to get access to subscribers
  useEffect(() => {
    _registerSubscriber((subscribers) => {
      subscribersRef.current = subscribers;
    });
  }, [_registerSubscriber]);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    // Dispatch to all subscribers
    for (const delta of newDeltas) {
      for (const handler of subscribersRef.current) {
        handler(delta);
      }
    }
  }, [dataStream, setDataStream]);

  return null;
}
