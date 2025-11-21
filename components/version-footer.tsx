"use client";

import { motion } from "framer-motion";
import { useWindowSize } from "usehooks-ts";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Button } from "./ui/button";

type VersionFooterProps = {
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  currentVersionIndex: number;
};

export const VersionFooter = ({ handleVersionChange }: VersionFooterProps) => {
  const t = useTranslations();

  const { width } = useWindowSize();
  const isMobile = width < 768;

  return (
    <motion.div
      animate={{ y: 0 }}
      className="absolute bottom-0 z-50 flex w-full flex-col justify-between gap-4 border-t bg-background p-4 lg:flex-row"
      exit={{ y: isMobile ? 200 : 77 }}
      initial={{ y: isMobile ? 200 : 77 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
    >
      <div>
        <div>
          {t(
            "artifact.version.viewingPrevious",
            "You are viewing a previous version"
          )}
        </div>
        <div className="text-muted-foreground text-sm">
          {t(
            "artifact.version.restoreToEdit",
            "Restore this version to make edits"
          )}
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          onClick={() => {
            handleVersionChange("latest");
          }}
          variant="outline"
        >
          {t("artifact.version.backToLatest", "Back to latest version")}
        </Button>
      </div>
    </motion.div>
  );
};
