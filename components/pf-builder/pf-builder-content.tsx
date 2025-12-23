"use client";

import { useMemo } from "react";
import { Player } from "@/components/player";
import { createAttemptStore } from "@/lib/activity-tracking";
import type { PFBuilderState } from "@/lib/pf-builder/types";
import { PFBuilderInner } from "./pf-builder-inner";

type PFBuilderContentProps = {
  builderId?: string;
  initialState?: Partial<PFBuilderState>;
  status: "streaming" | "idle";
  title: string;
};

/**
 * PFBuilderContent - Main container for the Percorso Formativo builder
 * Wraps the builder with Player for activity tracking
 */
export function PFBuilderContent({
  builderId,
  initialState,
  status: _status,
  title,
}: PFBuilderContentProps) {
  const store = useMemo(
    () => createAttemptStore(builderId ?? "pf-builder", "pf-builder"),
    [builderId]
  );

  return (
    <Player
      className="h-full rounded-none border-none bg-background"
      store={store}
    >
      <PFBuilderInner
        builderId={builderId}
        initialState={initialState}
        title={title}
      />
    </Player>
  );
}
