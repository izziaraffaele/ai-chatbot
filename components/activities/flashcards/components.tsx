/**
 * H-FARM Styled Flashcard Primitives
 * Sophisticated Academic - clean, professional flashcard components
 */

import { cva } from "class-variance-authority";

import { Eye, EyeOffIcon, HelpCircle } from "lucide-react";
import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FlashcardVariant = "flip" | "slide" | "fade";

export type FlashcardSize = "sm" | "md" | "lg";

export type FlashcardProps = React.ComponentProps<"div"> & {
  flipped?: boolean;
  variant?: FlashcardVariant;
  size?: FlashcardSize;
};

// ============================================
// H-FARM VARIANT DEFINITIONS
// ============================================

const flashcardVariants = cva("group relative cursor-pointer", {
  variants: {
    variant: {
      flip: "transform-3d transition-transform duration-500 ease-out data-[state=flipped]:rotate-y-180",
      slide: "preserve-3d overflow-hidden rounded-md border border-border",
      fade: "preserve-3d overflow-hidden rounded-md border border-border",
    },
  },
  defaultVariants: {
    variant: "flip",
  },
});

const flashcardSideVariants = cva(
  "absolute inset-0 py-0 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        flip: "backface-hidden absolute inset-0",
        slide: "border-0 opacity-0",
        fade: "z-0 border-0 opacity-0",
      },
      side: {
        front: "",
        back: "",
      },
    },
    compoundVariants: [
      // Flip variant animations
      {
        variant: "flip",
        side: "back",
        className: "rotate-y-180",
      },
      // Slide variant animations
      {
        variant: "slide",
        side: "front",
        className:
          "group-data-[state=flipped]:translate-x-full group-data-[state=front]:translate-x-0 group-data-[state=front]:opacity-100",
      },
      {
        variant: "slide",
        side: "back",
        className:
          "group-data-[state=front]:-translate-x-full group-data-[state=flipped]:translate-x-0 group-data-[state=flipped]:opacity-100",
      },
      // Fade variant animations
      {
        variant: "fade",
        side: "front",
        className:
          "group-data-[state=front]:z-10 group-data-[state=front]:opacity-100",
      },
      {
        variant: "fade",
        side: "back",
        className:
          "group-data-[state=flipped]:z-10 group-data-[state=flipped]:opacity-100",
      },
    ],
  }
);

// ============================================
// SHARED CONTEXT
// ============================================

type FlashcardContextValue = {
  flipped: boolean;
  variant: FlashcardVariant;
  size: FlashcardSize;
  cardHeight: number;
  registerFront: (height: number) => void;
  registerBack: (height: number) => void;
};

const FlashcardContext = createContext<FlashcardContextValue | null>(null);

function useFlashcardContext() {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error("Flashcard components must be used within Flashcard.Root");
  }
  return context;
}

// ============================================
// ROOT COMPONENT - H-FARM Styled with 3D Flip
// ============================================

function FlashcardRoot({
  flipped = false,
  variant = "flip",
  size = "md",
  title,
  className,
  children,
  ...props
}: FlashcardProps) {
  const [frontHeight, setFrontHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);

  const contextValue = useMemo(() => {
    const referenceHeight = Math.max(frontHeight, backHeight) || 0;
    const minHeight = { sm: 180, md: 260, lg: 340 }[size];
    const cardHeight = Math.max(referenceHeight, minHeight);

    return {
      flipped,
      variant,
      size,
      registerFront: setFrontHeight,
      registerBack: setBackHeight,
      cardHeight,
    };
  }, [flipped, variant, size, frontHeight, backHeight]);

  // For flip variant, use CSS 3D transforms
  if (variant === "flip") {
    return (
      <FlashcardContext.Provider value={contextValue}>
        {/* Perspective wrapper for 3D depth */}
        <div
          className="relative"
          data-slot="flashcard-perspective"
          style={{ height: contextValue.cardHeight }}
        >
          {/* Inner container that rotates */}
          <section
            aria-label="Flashcard"
            aria-roledescription="Interactive flashcard with front and back sides"
            className={cn(
              "group relative size-full cursor-pointer",
              className
            )}
            data-size={contextValue.size}
            data-slot="flashcard"
            data-state={contextValue.flipped ? "flipped" : "front"}
            data-variant={contextValue.variant}
            {...props}
          >
            {children}
          </section>
        </div>
      </FlashcardContext.Provider>
    );
  }

  // Other variants (slide, fade)
  return (
    <FlashcardContext.Provider value={contextValue}>
      <section
        aria-label="Flashcard"
        aria-roledescription="Interactive flashcard with front and back sides"
        className={cn(
          flashcardVariants({ variant: contextValue.variant }),
          "hover:shadow-md transition-shadow duration-200",
          className
        )}
        data-size={contextValue.size}
        data-slot="flashcard"
        data-state={contextValue.flipped ? "flipped" : "front"}
        data-variant={contextValue.variant}
        style={{ height: contextValue.cardHeight }}
        {...props}
      >
        {children}
      </section>
    </FlashcardContext.Provider>
  );
}

// ============================================
// SIDE COMPONENTS - H-FARM Styled
// ============================================

type FlashcardSideProps = React.ComponentProps<"div"> & {
  side: "front" | "back";
};

function FlashcardSide({
  side,
  className,
  children,
  ...props
}: FlashcardSideProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const dimensions = useResizeObserver({
    ref: rootRef as React.RefObject<HTMLDivElement>,
    box: "border-box",
  });

  const { variant, flipped, registerFront, registerBack } =
    useFlashcardContext();

  useEffect(() => {
    if (dimensions.height) {
      if (side === "front") {
        registerFront(dimensions.height);
      } else {
        registerBack(dimensions.height);
      }
    }
  }, [dimensions.height, side, registerFront, registerBack]);

  const isHidden =
    (!flipped && side === "back") || (flipped && side === "front");

  return (
    <Card
      aria-hidden={isHidden}
      aria-label={`${side === "front" ? "Question" : "Answer"} side of flashcard`}
      className={cn(
        flashcardSideVariants({ variant, side }),
        // H-FARM card styling
        "bg-card border-border shadow-sm",
        className
      )}
      data-side={side}
      data-slot="flashcard-side"
      ref={rootRef}
      role="tabpanel"
      {...props}
    >
      {children}
    </Card>
  );
}

function FlashcardFront(props: Omit<FlashcardSideProps, "side">) {
  return <FlashcardSide side="front" {...props} />;
}

function FlashcardBack(props: Omit<FlashcardSideProps, "side">) {
  return <FlashcardSide side="back" {...props} />;
}

// ============================================
// CONTENT COMPONENTS - H-FARM Styled
// ============================================

function FlashcardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <CardContent
      className={cn(
        // H-FARM content spacing
        "flex size-full flex-col items-center justify-center text-center",
        "group-data-[size=lg]:p-12 group-data-[size=md]:p-8 group-data-[size=sm]:p-6",
        className
      )}
      data-slot="flashcard-content"
      {...props}
    />
  );
}

// Reveal Button - H-FARM styled
function FlashcardRevealButton({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label?: string;
}) {
  const { flipped } = useFlashcardContext();

  return (
    <Button
      aria-label={flipped ? "Nascondi risposta" : "Mostra risposta"}
      aria-pressed={flipped}
      className={cn("gap-2 mt-4", className)}
      data-slot="flashcard-reveal-button"
      data-state={flipped ? "revealed" : "hidden"}
      size="sm"
      variant={flipped ? "outline" : "default"}
      {...props}
    >
      {flipped ? (
        <EyeOffIcon className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
      {children || label || (flipped ? "Nascondi" : "Mostra risposta")}
    </Button>
  );
}

// Label Component - H-FARM uppercase style
function FlashcardLabel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // H-FARM label style - uppercase tracking
        "mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      data-slot="flashcard-label"
      {...props}
    >
      {children}
    </div>
  );
}

// Title Component - H-FARM typography
function FlashcardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        // H-FARM title - clean, semibold
        "mb-3 font-semibold text-xl leading-relaxed tracking-tight text-foreground",
        "group-data-[size=lg]:text-2xl",
        className
      )}
      data-slot="flashcard-title"
      {...props}
    />
  );
}

// Text Component
function FlashcardText({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mb-3 text-base leading-relaxed text-foreground",
        "group-data-[size=lg]:text-lg",
        className
      )}
      data-slot="flashcard-text"
      {...props}
    />
  );
}

// Hint Component - H-FARM subtle style (for inline use)
function FlashcardHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-2 text-sm italic text-muted-foreground",
        className
      )}
      data-slot="flashcard-hint"
      {...props}
    />
  );
}

// Hint Button with Tooltip - positioned outside card
type FlashcardHintButtonProps = {
  hint: string;
  className?: string;
};

function FlashcardHintButton({ hint, className }: FlashcardHintButtonProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Mostra suggerimento"
            className={cn(
              "flex size-14 items-center justify-center rounded-full",
              "border-4 border-destructive bg-background",
              "text-destructive hover:bg-destructive/5",
              "transition-all duration-200 hover:scale-105",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
              className
            )}
            data-slot="flashcard-hint-button"
            type="button"
          >
            <HelpCircle className="size-8" strokeWidth={2.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
          side="left"
          sideOffset={8}
        >
          <p className="font-medium text-muted-foreground">Suggerimento:</p>
          <p className="mt-1">{hint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// EXPORTS
// ============================================

export const Flashcard = Object.assign(FlashcardRoot, {
  Front: FlashcardFront,
  Back: FlashcardBack,
  Content: FlashcardContent,
  Label: FlashcardLabel,
  RevealButton: FlashcardRevealButton,
  Title: FlashcardTitle,
  Text: FlashcardText,
  Hint: FlashcardHint,
  HintButton: FlashcardHintButton,
});
