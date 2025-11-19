/**
 * English translations (en)
 * This is the source of truth for all translation keys.
 * All other language files must include these same keys.
 */

export const en = {
  // ============================================================================
  // Authentication
  // ============================================================================

  // Login Page
  "auth.login.title": "Sign In",
  "auth.login.emailLabel": "Email Address",
  "auth.login.emailPlaceholder": "user@acme.com",
  "auth.login.passwordLabel": "Password",
  "auth.login.description": "Use your email and password to sign in",
  "auth.login.buttonSubmit": "Sign in",
  "auth.login.noAccount": "Don't have an account?",
  "auth.login.linkSignUp": "Sign up",
  "auth.login.linkSignUpSuffix": "for free.",

  // Register Page
  "auth.register.title": "Create Account",
  "auth.register.emailLabel": "Email Address",
  "auth.register.emailPlaceholder": "user@acme.com",
  "auth.register.passwordLabel": "Password",
  "auth.register.description": "Create an account with your email and password",
  "auth.register.buttonSubmit": "Create account",
  "auth.register.hasAccount": "Already have an account?",
  "auth.register.linkSignIn": "Sign in",
  "auth.register.linkSignInSuffix": "instead.",
  "errors.accountExists": "Account already exists!",
  "errors.createAccount": "Failed to create account!",
  "success.accountCreated": "Account created successfully!",

  // ============================================================================
  // Chat Interface
  // ============================================================================

  // Input Area
  "chat.input.placeholder": "Send a message...",
  "chat.input.tooltipAttach": "Attach file",
  "chat.input.tooltipSend": "Send message",
  "chat.input.tooltipStop": "Stop generating",

  // AI Gateway
  "chat.gateway.title": "Activate AI Gateway",
  "chat.gateway.description":
    "This application requires the owner to activate Vercel AI Gateway.",
  "chat.gateway.buttonActivate": "Activate",

  // Greeting
  "chat.greeting.title": "Hello there!",
  "chat.greeting.subtitle": "How can I help you today?",

  // Suggestions
  "chat.suggestions.prompt1": "What are the advantages of using Next.js?",
  "chat.suggestions.prompt2": "Write code to demonstrate Dijkstra's algorithm",
  "chat.suggestions.prompt3": "Help me write an essay about Silicon Valley",
  "chat.suggestions.prompt4": "What is the weather in San Francisco?",

  // ============================================================================
  // Sidebar & Navigation
  // ============================================================================

  // Sidebar
  "sidebar.buttonNewChat": "New Chat",
  "sidebar.tooltipNewChat": "Start a new conversation",
  "sidebar.buttonSettings": "Settings",
  "sidebar.tooltipSettings": "Open settings",
  "sidebar.confirmDeleteAll": "Delete all chats?",
  "sidebar.confirmDeleteAllDescription":
    "This will permanently delete all your chat history. This action cannot be undone.",
  "sidebar.buttonConfirmDelete": "Delete",
  "sidebar.buttonCancel": "Cancel",

  // Success and Error Messages
  "sidebar.success.deleteAll": "All chats deleted successfully",
  "sidebar.error.deleteAll": "Failed to delete all chats",

  // History Grouping
  "sidebar.history.today": "Today",
  "sidebar.history.yesterday": "Yesterday",
  "sidebar.history.last7Days": "Last 7 days",
  "sidebar.history.last30Days": "Last 30 days",
  "sidebar.history.older": "Older",
  "sidebar.history.loginPrompt": "Login to save and revisit previous chats!",
  "sidebar.history.emptyState":
    "Your conversations will appear here once you start chatting!",
  "sidebar.history.endReached":
    "You have reached the end of your chat history.",
  "sidebar.history.loadingChats": "Loading Chats...",
  "sidebar.history.deletingChat": "Deleting chat...",
  "sidebar.history.chatDeleted": "Chat deleted successfully",
  "sidebar.history.deleteFailed": "Failed to delete chat",
  "sidebar.history.confirmDeleteTitle": "Are you absolutely sure?",
  "sidebar.history.confirmDeleteDescription":
    "This action cannot be undone. This will permanently delete your chat and remove it from our servers.",

  // User Menu
  "sidebar.user.signOut": "Sign out",
  "sidebar.user.profile": "Profile",

  // Sidebar Toggle
  "sidebar.toggleSidebar": "Toggle Sidebar",

  // ============================================================================
  // Settings
  // ============================================================================

  "settings.title": "Settings",
  "settings.language.label": "Language",
  "settings.language.description": "Choose your preferred language",
  "settings.theme.label": "Theme",
  "settings.theme.description": "Customize the appearance",

  // ============================================================================
  // Artifacts & Documents
  // ============================================================================

  // Artifact Actions
  "artifact.actions.edit": "Edit",
  "artifact.actions.delete": "Delete",
  "artifact.actions.copy": "Copy",
  "artifact.actions.download": "Download",
  "artifact.actions.close": "Close",
  "artifact.actions.run": "Run",
  "artifact.actions.viewChanges": "View changes",
  "artifact.actions.viewPrevious": "View Previous version",
  "artifact.actions.viewNext": "View Next version",
  "artifact.actions.copyToClipboard": "Copy to clipboard",
  "artifact.actions.copyCodeToClipboard": "Copy code to clipboard",
  "artifact.actions.copyImageToClipboard": "Copy image to clipboard",
  "artifact.actions.copyAsCsv": "Copy as .csv",
  "artifact.actions.failedAction": "Failed to execute action",
  "artifact.actions.copiedToClipboard": "Copied to clipboard!",
  "artifact.actions.copiedImageToClipboard": "Copied image to clipboard!",
  "artifact.actions.copiedCsvToClipboard": "Copied csv to clipboard!",

  // Artifact Version
  "artifact.version.viewingPrevious": "You are viewing a previous version",
  "artifact.version.restoreToEdit": "Restore this version to make edits",
  "artifact.version.restoreButton": "Restore this version",
  "artifact.version.backToLatest": "Back to latest version",

  // Code Artifacts
  "artifact.code.tooltipCopy": "Copy code",
  "artifact.code.tooltipCopied": "Copied!",
  "artifact.code.tooltipRun": "Run code",
  "artifact.code.executeCode": "Execute code",

  // Document Artifacts
  "artifact.document.untitled": "Untitled",
  "artifact.document.saving": "Saving...",
  "artifact.document.saved": "Saved",
  "artifact.document.creating": "Creating",
  "artifact.document.created": "Created",
  "artifact.document.updating": "Updating",
  "artifact.document.updated": "Updated",
  "artifact.document.addingSuggestions": "Adding suggestions",
  "artifact.document.addedSuggestions": "Added suggestions to",
  "artifact.document.forDocument": "for document",
  "artifact.document.readonlyError":
    "Viewing files in shared chats is currently not supported.",

  // Console
  "console.title": "Console",
  "console.initializing": "Initializing...",

  // Toolbar
  "toolbar.readingLevel.elementary": "Elementary",
  "toolbar.readingLevel.middleSchool": "Middle School",
  "toolbar.readingLevel.keepCurrent": "Keep current level",
  "toolbar.readingLevel.highSchool": "High School",
  "toolbar.readingLevel.college": "College",
  "toolbar.readingLevel.graduate": "Graduate",
  "toolbar.adjustReadingLevel":
    "Please adjust the reading level to {level} level.",

  // Artifact Toolbar Actions
  "artifact.toolbar.addPolish": "Add final polish",
  "artifact.toolbar.requestSuggestions": "Request suggestions",
  "artifact.toolbar.addComments": "Add comments",
  "artifact.toolbar.addLogs": "Add logs",
  "artifact.toolbar.formatData": "Format and clean data",
  "artifact.toolbar.visualizeData": "Analyze and visualize data",

  // Artifact Types
  "artifact.type.text.description":
    "Useful for text content, like drafting essays and emails.",
  "artifact.type.code.description":
    "Useful for code generation; Code execution is only available for python code.",
  "artifact.type.image.description": "Useful for image generation",
  "artifact.type.sheet.description": "Useful for working with spreadsheets",

  // ============================================================================
  // Tools
  // ============================================================================

  "tool.status.pending": "Pending",
  "tool.status.running": "Running",
  "tool.status.completed": "Completed",
  "tool.status.error": "Error",
  "tool.parameters": "Parameters",
  "tool.result": "Result",
  "tool.error": "Error",

  // Agent Tool UI
  "agent.status.running": "Running",
  "agent.status.completed": "Completed",
  "agent.status.error": "Error",
  "agent.progress.executing": "Executing sub-agent...",
  "agent.content.title": "Generated Content",
  "agent.sources.title": "Sources",
  "agent.debug.title": "Debug Info",

  // ============================================================================
  // Messages & Actions
  // ============================================================================

  "message.actions.copy": "Copy",
  "message.actions.retry": "Retry",
  "message.actions.edit": "Edit",
  "message.actions.delete": "Delete",
  "message.actions.tooltipCopy": "Copy message",
  "message.actions.tooltipRetry": "Retry generation",
  "message.actions.tooltipEdit": "Edit message",
  "message.actions.tooltipDelete": "Delete message",
  "message.actions.tooltipUpvote": "Upvote response",
  "message.actions.tooltipDownvote": "Downvote response",
  "message.actions.upvote": "Upvote Response",
  "message.actions.upvoting": "Upvoting Response...",
  "message.actions.upvoted": "Upvoted Response!",
  "message.actions.upvoteError": "Failed to upvote response.",
  "message.actions.downvote": "Downvote Response",
  "message.actions.downvoting": "Downvoting Response...",
  "message.actions.downvoted": "Downvoted Response!",
  "message.actions.downvoteError": "Failed to downvote response.",

  // ============================================================================
  // Agent & Model Selectors
  // ============================================================================

  "agent.selector.placeholder": "Assistant",
  "agent.selector.search": "Search agents...",
  "agent.selector.empty": "No agents found.",

  "model.selector.label": "Model",
  "model.selector.description": "Choose AI model",

  // Model Names and Descriptions
  "model.grokVision.name": "Grok Vision",
  "model.grokVision.description":
    "Advanced multimodal model with vision and text capabilities",
  "model.grokReasoning.name": "Grok Reasoning",
  "model.grokReasoning.description":
    "Uses advanced chain-of-thought reasoning for complex problems",

  "visibility.label": "Visibility",
  "visibility.private": "Private",
  "visibility.public": "Public",
  "visibility.private.description": "Only you can access this chat",
  "visibility.public.description": "Anyone with the link can access this chat",

  // ============================================================================
  // Error Messages
  // ============================================================================

  "errors.fileUploadFailed": "Failed to upload file, please try again!",
  "errors.fileUploadSize": "File is too large. Maximum size is 10MB.",
  "errors.modelWait": "Please wait for the model to finish its response!",
  "errors.networkError": "Network error. Please check your connection.",
  "errors.authInvalid": "Invalid credentials!",
  "errors.authValidation": "Failed validating your submission!",
  "errors.generic": "Something went wrong. Please try again.",
  "errors.rateLimitExceeded": "Rate limit exceeded. Please try again later.",
  "errors.sessionExpired": "Your session has expired. Please sign in again.",
  "errors.noTextToCopy": "There's no text to copy!",
  "errors.upvoteFailed": "Failed to upvote response.",
  "errors.downvoteFailed": "Failed to downvote response.",
  "errors.artifactActionFailed": "Failed to execute action",

  // Success Messages
  "success.saved": "Saved successfully",
  "success.copied": "Copied to clipboard",
  "success.copiedCode": "Copied to clipboard!",
  "success.copiedImage": "Copied image to clipboard!",
  "success.copiedCsv": "Copied csv to clipboard!",
  "success.deleted": "Deleted successfully",
  "success.created": "Created successfully",

  // ============================================================================
  // Common UI Elements
  // ============================================================================

  "common.loading": "Loading...",
  "common.saving": "Saving...",
  "common.saved": "Saved",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.save": "Save",
  "common.retry": "Retry",
  "common.continue": "Continue",
  "common.back": "Back",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.sort": "Sort",
  "common.more": "More",
  "common.less": "Less",
  "common.yes": "Yes",
  "common.no": "No",
  "common.submit": "Submit form",
  "common.start": "Start",
  "common.restart": "Try Again",

  // ============================================================================
  // Quiz Player
  // ============================================================================

  // Quiz Welcome Screen
  "quiz.welcome.questions": "questions",
  "quiz.welcome.cancel": "Cancel",
  "quiz.welcome.start": "Start Quiz",

  // Quiz End Screen
  "quiz.completed.title": "Quiz Completed!",
  "quiz.completed.correctPercentage": "% correct",
  "quiz.completed.attempts": "attempts",
  "quiz.completed.average": "Avg: {score}%",
  "quiz.feedback.prompt": "How was this quiz?",
  "quiz.feedback.restart": "Try Again",

  "message.copyError": "There's no text to copy!",
  "message.copySuccess": "Copied to clipboard!",
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationDict = Record<TranslationKey, string>;
