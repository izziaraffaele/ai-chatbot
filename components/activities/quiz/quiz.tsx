import { cn } from "@/lib/utils";

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
      className={cn("flex flex-col gap-6", className)}
      data-slot="quiz-question"
      {...props}
    >
      <div className="font-semibold text-xl leading-none tracking-tight">
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
      className={cn("*:mb-3 *:last:mb-0", className)}
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
  const baseClasses =
    "w-full p-4 rounded-lg bg-transparent border-border border-2 text-foreground text-left transition-all duration-200";

  const getStateClasses = () => {
    if (isCorrect) {
      return "border-success bg-success/10 text-success font-semibold";
    }
    if (isWrong) {
      return "border-destructive bg-destructive/10 text-destructive font-semibold";
    }
    if (selected) {
      return "border-primary bg-primary/10 text-primary";
    }
    if (disabled) {
      return "opacity-50 cursor-not-allowed";
    }
    return "hover:bg-muted cursor-pointer";
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
      {...props}
    >
      {children}
    </button>
  );
}

// Hint (using Tooltip)
export type QuizHintProps = React.ComponentProps<"div"> & {
  hint: string;
};

function QuizHint({ className, hint, ...props }: QuizHintProps) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="quiz-hint"
      {...props}
    >
      {hint}
    </div>
  );
}

function QuizHeader({ children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="quiz-header" {...props}>
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
      className={cn("font-semibold text-muted-foreground", className)}
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
};
