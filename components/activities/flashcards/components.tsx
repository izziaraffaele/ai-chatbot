/**
 * Flashcard Primitives - Composable flashcard components
 *
 * These components provide building blocks for flashcard interactions
 * following the shadcn composition pattern.
 *
 * @example
 * <Flashcard.Root flipped={isFlipped}>
 *   <Flashcard.Front>
 *     <Flashcard.Content>Question text</Flashcard.Content>
 *     <Flashcard.RevealButton onClick={handleFlip} />
 *   </Flashcard.Front>
 *   <Flashcard.Back>
 *     <Flashcard.Content>Answer text</Flashcard.Content>
 *   </Flashcard.Back>
 * </Flashcard.Root>
 */

import { cva } from "class-variance-authority";

import { Eye, EyeOffIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type FlashcardVariant = "flip" | "slide" | "fade";

export type FlashcardSize = "sm" | "md" | "lg";

export type FlashcardProps = React.ComponentProps<"div"> & {
  flipped?: boolean;
  variant?: FlashcardVariant;
  size?: FlashcardSize;
};

// ============================================
// VARIANT DEFINITIONS
// ============================================

const flashcardVariants = cva("group relative", {
  variants: {
    variant: {
      flip: "transform-3d transition-transform duration-600 data-[state=flipped]:rotate-y-180",
      slide: "preserve-3d overflow-hidden rounded-xl border",
      fade: "preserve-3d overflow-hidden rounded-xl border",
    },
  },
  defaultVariants: {
    variant: "flip",
  },
});

const flashcardSideVariants = cva(
  "absolute inset-0 py-0 transition-all duration-500",
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
// ROOT COMPONENT
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
    // Calculate max height of both sides
    const referenceHeight = Math.max(frontHeight, backHeight) || 0;
    const minHeight = { sm: 160, md: 240, lg: 320 }[size];
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

  return (
    <FlashcardContext.Provider value={contextValue}>
      <section
        aria-label="Flashcard"
        aria-roledescription="Interactive flashcard with front and back sides"
        className={cn(
          flashcardVariants({ variant: contextValue.variant }),
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
// SIDE COMPONENTS
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

  // Register height when it changes
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
      className={cn(flashcardSideVariants({ variant, side }), className)}
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
// CONTENT COMPONENTS
// ============================================

// Content Component
function FlashcardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <CardContent
      className={cn(
        "flex size-full flex-col items-center justify-center text-center group-data-[size=lg]:p-16 group-data-[size=md]:p-12 group-data-[size=sm]:p-8",
        className
      )}
      data-slot="flashcard-content"
      {...props}
    />
  );
}

// Reveal Button Component
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
      aria-label={flipped ? "Hide answer" : "Reveal answer"}
      aria-pressed={flipped}
      className={cn("gap-2", className)}
      data-slot="flashcard-reveal-button"
      data-state={flipped ? "revealed" : "hidden"}
      variant={flipped ? "outline" : "default"}
      {...props}
    >
      {flipped ? (
        <EyeOffIcon className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {children || label || (flipped ? "Hide Answer" : "Reveal Answer")}
    </Button>
  );
}

// Label Component (for QUESTION/ANSWER labels)
function FlashcardLabel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-6 font-bold text-muted-foreground text-xs uppercase tracking-wider",
        className
      )}
      data-slot="flashcard-label"
      {...props}
    >
      {children}
    </div>
  );
}

// Title Component
function FlashcardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("mb-4 font-bold text-2xl leading-relaxed", className)}
      data-slot="flashcard-title"
      {...props}
    />
  );
}

// Text Component
function FlashcardText({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("mb-4 text-lg leading-relaxed", className)}
      data-slot="flashcard-text"
      {...props}
    />
  );
}

// Hint Component
function FlashcardHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("mb-4 text-muted-foreground text-sm italic", className)}
      data-slot="flashcard-hint"
      {...props}
    />
  );
}

// ============================================
// EXPORTS
// ============================================

// Main compound component
export const Flashcard = Object.assign(FlashcardRoot, {
  Front: FlashcardFront,
  Back: FlashcardBack,
  Content: FlashcardContent,
  Label: FlashcardLabel,
  RevealButton: FlashcardRevealButton,
  Title: FlashcardTitle,
  Text: FlashcardText,
  Hint: FlashcardHint,
});
