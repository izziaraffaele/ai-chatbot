"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { DocumentUIArtifact } from "@/components/artifacts";
import type { UIArtifact } from "@/components/chat/artifact";

export const initialArtifactData: DocumentUIArtifact = {
  documentId: "init",
  content: "",
  kind: "text",
  title: "",
  status: "idle",
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
};

type Selector<T extends UIArtifact<any, any>, R> = (state: T) => R;

export function useArtifactSelector<T extends UIArtifact<any, any>, Selected>(
  selector: Selector<T, Selected>
) {
  const { data: localArtifact } = useSWR<UIArtifact<any, any>>(
    "artifact",
    null,
    {
      fallbackData: initialArtifactData,
    }
  );

  const selectedValue = useMemo(() => {
    if (!localArtifact) {
      return selector(initialArtifactData as T);
    }
    return selector(localArtifact as T);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact<T extends UIArtifact<any, any> = UIArtifact>() {
  const { data: localArtifact, mutate: setLocalArtifact } = useSWR<
    UIArtifact<any, any>
  >("artifact", null, {
    fallbackData: initialArtifactData,
  });

  const artifact = useMemo(() => {
    if (!localArtifact) {
      return initialArtifactData;
    }
    return localArtifact;
  }, [localArtifact]);

  const setArtifact = useCallback(
    (updaterFn: T | ((currentArtifact: T) => T)) => {
      setLocalArtifact((currentArtifact) => {
        const artifactToUpdate = currentArtifact || initialArtifactData;

        if (typeof updaterFn === "function") {
          return updaterFn(artifactToUpdate as T);
        }

        return updaterFn;
      });
    },
    [setLocalArtifact]
  );

  const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
    useSWR<any>(
      () =>
        artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
      null,
      {
        fallbackData: null,
      }
    );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: localArtifactMetadata,
      setMetadata: setLocalArtifactMetadata,
    }),
    [artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata]
  );
}
