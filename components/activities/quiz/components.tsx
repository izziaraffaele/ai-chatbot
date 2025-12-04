import { cn } from "@/lib/utils";

// ============================================================================
// H-FARM STYLED QUIZ COMPONENTS
// Sophisticated Academic - clean, professional quiz UI
// ============================================================================

// Question
export type QuizQuestionProps = React.ComponentProps<"div"> & {
  question: string;
};

function QuizQuestion({
  children,
  className,
  question,
  ...props
}: QuizQuestionProps) {
  return (
    <div
      className={cn(
        // H-FARM quiz question - clean typography
        "flex flex-col gap-6 text-foreground",
        className
      )}
      data-slot="quiz-question"
      {...props}
    >
      <div className="font-semibold text-lg leading-relaxed tracking-tight md:text-xl">
        {question}
      </div>
      {children}
    </div>
  );
}

// Choices Container
export type QuizChoicesProps = React.ComponentProps<"div">;

function QuizChoices({ children, className, ...props }: QuizChoicesProps) {
  return (
    <div
      className={cn(
        // H-FARM choices container - consistent spacing
        "flex flex-col gap-3",
        className
      )}
      data-slot="quiz-choices"
      {...props}
    >
      {children}
    </div>
  );
}

// Choice
export type QuizChoiceProps = React.ComponentProps<"button"> & {
  selected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
};

function QuizChoice({
  children,
  className,
  disabled,
  isCorrect,
  isWrong,
  selected,
  onClick = () => {
    return;
  },
  ...props
}: QuizChoiceProps) {
  // H-FARM choice base styles
  const baseClasses = cn(
    "w-full px-4 py-3.5 rounded-md bg-card text-left",
    "border border-border text-foreground",
    "transition-all duration-200 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-primary/20"
  );

  const getStateClasses = () => {
    // Correct answer - H-FARM success state
    if (isCorrect) {
      return cn(
        "border-success bg-success/10 text-success",
        "font-medium shadow-sm"
      );
    }
    // Wrong answer - H-FARM error state
    if (isWrong) {
      return cn(
        "border-destructive bg-destructive/10 text-destructive",
        "font-medium shadow-sm"
      );
    }
    // Selected state - H-FARM navy accent
    if (selected) {
      return cn(
        "border-primary bg-primary/5 text-primary",
        "ring-2 ring-primary/20 shadow-sm"
      );
    }
    // Disabled state
    if (disabled) {
      return "opacity-50 cursor-not-allowed";
    }
    // Default hover state - H-FARM subtle interaction
    return cn(
      "hover:border-primary/40 hover:bg-accent/50",
      "hover:shadow-sm hover:-translate-y-0.5",
      "cursor-pointer"
    );
  };

  return (
    <button
      className={cn(baseClasses, getStateClasses(), className)}
      data-slot="quiz-choice"
      data-state={
        isCorrect ? "correct" : isWrong ? "wrong" : selected ? "selected" : ""
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

// Hint
export type QuizHintProps = React.ComponentProps<"div"> & {
  hint: string;
};

function QuizHint({ className, hint, ...props }: QuizHintProps) {
  return (
    <div
      className={cn(
        // H-FARM hint style - subtle, informative
        "text-muted-foreground text-sm italic",
        "bg-muted/30 rounded-md px-3 py-2",
        className
      )}
      data-slot="quiz-hint"
      {...props}
    >
      {hint}
    </div>
  );
}

// Explanation
export type QuizExplanationProps = React.ComponentProps<"div"> & {
  explanation: string;
  isCorrect?: boolean;
};

function QuizExplanation({
  className,
  explanation,
  isCorrect,
  ...props
}: QuizExplanationProps) {
  return (
    <div
      className={cn(
        // H-FARM explanation style - contextual feedback
        "rounded-md px-4 py-3 text-sm leading-relaxed",
        isCorrect
          ? "border border-success/30 bg-success/10 text-success-foreground"
          : "border border-destructive/30 bg-destructive/10 text-destructive-foreground",
        className
      )}
      data-slot="quiz-explanation"
      {...props}
    >
      <div className="mb-1 font-semibold text-xs uppercase tracking-wider">
        Spiegazione
      </div>
      {explanation}
    </div>
  );
}

function QuizHeader({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div 
      className={cn("space-y-2", className)}
      data-slot="quiz-header" 
      {...props}
    >
      {children}
    </div>
  );
}

function QuizHeaderTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // H-FARM header title - uppercase label style
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      data-slot="quiz-header-title"
      {...props}
    >
      {children}
    </div>
  );
}

// Export as namespace
export const Quiz = {
  Header: QuizHeader,
  HeaderTitle: QuizHeaderTitle,
  Question: QuizQuestion,
  Choices: QuizChoices,
  Choice: QuizChoice,
  Hint: QuizHint,
  Explanation: QuizExplanation,
};
