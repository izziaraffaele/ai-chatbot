/**
 * Italian translations (it)
 * Must match all keys from en.ts
 */

import type { TranslationDict } from "./en";

export const it: TranslationDict = {
  // ============================================================================
  // Authentication
  // ============================================================================

  // Login Page
  "auth.login.title": "Accedi",
  "auth.login.emailLabel": "Indirizzo Email",
  "auth.login.emailPlaceholder": "utente@example.com",
  "auth.login.passwordLabel": "Password",
  "auth.login.description": "Usa la tua email e password per accedere",
  "auth.login.buttonSubmit": "Accedi",
  "auth.login.noAccount": "Non hai un account?",
  "auth.login.linkSignUp": "Registrati",
  "auth.login.linkSignUpSuffix": "gratuitamente.",

  // Register Page
  "auth.register.title": "Crea Account",
  "auth.register.emailLabel": "Indirizzo Email",
  "auth.register.emailPlaceholder": "utente@example.com",
  "auth.register.passwordLabel": "Password",
  "auth.register.description": "Crea un account con la tua email e password",
  "auth.register.buttonSubmit": "Crea account",
  "auth.register.hasAccount": "Hai già un account?",
  "auth.register.linkSignIn": "Accedi",
  "auth.register.linkSignInSuffix": "invece.",
  "errors.accountExists": "L'account esiste già!",
  "errors.createAccount": "Creazione account fallita!",
  "success.accountCreated": "Account creato con successo!",

  // ============================================================================
  // Chat Interface
  // ============================================================================

  // Input Area
  "chat.input.placeholder": "Invia un messaggio...",
  "chat.input.tooltipAttach": "Allega file",
  "chat.input.tooltipSend": "Invia messaggio",
  "chat.input.tooltipStop": "Ferma generazione",

  // AI Gateway
  "chat.gateway.title": "Attiva AI Gateway",
  "chat.gateway.description":
    "Questa applicazione richiede che il proprietario attivi Vercel AI Gateway.",
  "chat.gateway.buttonActivate": "Attiva",

  // Greeting
  "chat.greeting.title": "Ciao!",
  "chat.greeting.subtitle": "Come posso aiutarti oggi?",

  // Suggestions
  "chat.suggestions.prompt1": "Quali sono i vantaggi di utilizzare Next.js?",
  "chat.suggestions.prompt2":
    "Scrivi codice per dimostrare l'algoritmo di Dijkstra",
  "chat.suggestions.prompt3":
    "Aiutami a scrivere un saggio sulla Silicon Valley",
  "chat.suggestions.prompt4": "Che tempo fa a San Francisco?",

  // ============================================================================
  // Sidebar & Navigation
  // ============================================================================

  // Sidebar
  "sidebar.buttonNewChat": "Nuova Chat",
  "sidebar.tooltipNewChat": "Inizia una nuova conversazione",
  "sidebar.buttonSettings": "Impostazioni",
  "sidebar.tooltipSettings": "Apri impostazioni",
  "sidebar.confirmDeleteAll": "Eliminare tutte le chat?",
  "sidebar.confirmDeleteAllDescription":
    "Questo eliminerà permanentemente tutta la cronologia delle chat. Questa azione non può essere annullata.",
  "sidebar.buttonConfirmDelete": "Elimina",
  "sidebar.buttonCancel": "Annulla",

  // Success and Error Messages
  "sidebar.success.deleteAll": "Tutte le chat eliminate con successo",
  "sidebar.error.deleteAll": "Impossibile eliminare tutte le chat",

  // History Grouping
  "sidebar.history.today": "Oggi",
  "sidebar.history.yesterday": "Ieri",
  "sidebar.history.last7Days": "Ultimi 7 giorni",
  "sidebar.history.last30Days": "Ultimi 30 giorni",
  "sidebar.history.older": "Più vecchi",
  "sidebar.history.loginPrompt":
    "Accedi per salvare e rivedere le chat precedenti!",
  "sidebar.history.emptyState":
    "Le tue conversazioni appariranno qui una volta che inizierai a chattare!",
  "sidebar.history.endReached":
    "Hai raggiunto la fine della cronologia delle chat.",
  "sidebar.history.loadingChats": "Caricamento chat...",
  "sidebar.history.deletingChat": "Eliminazione chat...",
  "sidebar.history.chatDeleted": "Chat eliminata con successo",
  "sidebar.history.deleteFailed": "Impossibile eliminare la chat",
  "sidebar.history.confirmDeleteTitle": "Sei assolutamente sicuro?",
  "sidebar.history.confirmDeleteDescription":
    "Questa azione non può essere annullata. Questo eliminerà permanentemente la tua chat e la rimuoverà dai nostri server.",

  // User Menu
  "sidebar.user.signOut": "Esci",
  "sidebar.user.profile": "Profilo",

  // Sidebar Toggle
  "sidebar.toggleSidebar": "Mostra/Nascondi Barra Laterale",

  // ============================================================================
  // Settings
  // ============================================================================

  "settings.title": "Impostazioni",
  "settings.language.label": "Lingua",
  "settings.language.description": "Scegli la tua lingua preferita",
  "settings.theme.label": "Tema",
  "settings.theme.description": "Personalizza l'aspetto",

  // ============================================================================
  // Artifacts & Documents
  // ============================================================================

  // Artifact Actions
  "artifact.actions.edit": "Modifica",
  "artifact.actions.delete": "Elimina",
  "artifact.actions.copy": "Copia",
  "artifact.actions.download": "Scarica",
  "artifact.actions.close": "Chiudi",
  "artifact.actions.run": "Esegui",
  "artifact.actions.viewChanges": "Visualizza modifiche",
  "artifact.actions.viewPrevious": "Visualizza versione precedente",
  "artifact.actions.viewNext": "Visualizza versione successiva",
  "artifact.actions.copyToClipboard": "Copia negli appunti",
  "artifact.actions.copyCodeToClipboard": "Copia codice negli appunti",
  "artifact.actions.copyImageToClipboard": "Copia immagine negli appunti",
  "artifact.actions.copyAsCsv": "Copia come .csv",
  "artifact.actions.failedAction": "Esecuzione azione fallita",
  "artifact.actions.copiedToClipboard": "Copiato negli appunti!",
  "artifact.actions.copiedImageToClipboard": "Immagine copiata negli appunti!",
  "artifact.actions.copiedCsvToClipboard": "CSV copiato negli appunti!",

  // Artifact Version
  "artifact.version.viewingPrevious":
    "Stai visualizzando una versione precedente",
  "artifact.version.restoreToEdit":
    "Ripristina questa versione per apportare modifiche",
  "artifact.version.restoreButton": "Ripristina questa versione",
  "artifact.version.backToLatest": "Torna all'ultima versione",

  // Code Artifacts
  "artifact.code.tooltipCopy": "Copia codice",
  "artifact.code.tooltipCopied": "Copiato!",
  "artifact.code.tooltipRun": "Esegui codice",
  "artifact.code.executeCode": "Esegui codice",

  // Document Artifacts
  "artifact.document.untitled": "Senza titolo",
  "artifact.document.saving": "Salvataggio in corso...",
  "artifact.document.saved": "Salvato",
  "artifact.document.creating": "Creazione in corso",
  "artifact.document.created": "Creato",
  "artifact.document.updating": "Aggiornamento in corso",
  "artifact.document.updated": "Aggiornato",
  "artifact.document.addingSuggestions": "Aggiunta suggerimenti",
  "artifact.document.addedSuggestions": "Suggerimenti aggiunti a",
  "artifact.document.forDocument": "per documento",
  "artifact.document.readonlyError":
    "La visualizzazione di file nelle chat condivise non è attualmente supportata.",

  // Console
  "console.title": "Console",
  "console.initializing": "Inizializzazione...",

  // Toolbar
  "toolbar.readingLevel.elementary": "Scuola elementare",
  "toolbar.readingLevel.middleSchool": "Scuola media",
  "toolbar.readingLevel.keepCurrent": "Mantieni livello attuale",
  "toolbar.readingLevel.highSchool": "Scuola superiore",
  "toolbar.readingLevel.college": "Università",
  "toolbar.readingLevel.graduate": "Laurea",
  "toolbar.adjustReadingLevel":
    "Per favore regola il livello di lettura al livello {level}.",

  // Artifact Toolbar Actions
  "artifact.toolbar.addPolish": "Aggiungi rifinitura finale",
  "artifact.toolbar.requestSuggestions": "Richiedi suggerimenti",
  "artifact.toolbar.addComments": "Aggiungi commenti",
  "artifact.toolbar.addLogs": "Aggiungi log",
  "artifact.toolbar.formatData": "Formatta e pulisci dati",
  "artifact.toolbar.visualizeData": "Analizza e visualizza dati",

  // Artifact Types
  "artifact.type.text.description":
    "Utile per contenuti di testo, come bozze di saggi ed email.",
  "artifact.type.code.description":
    "Utile per la generazione di codice; L'esecuzione del codice è disponibile solo per Python.",
  "artifact.type.image.description": "Utile per la generazione di immagini",
  "artifact.type.sheet.description": "Utile per lavorare con fogli di calcolo",

  // ============================================================================
  // Tools
  // ============================================================================

  "tool.status.pending": "In attesa",
  "tool.status.running": "In esecuzione",
  "tool.status.completed": "Completato",
  "tool.status.error": "Errore",
  "tool.parameters": "Parametri",
  "tool.result": "Risultato",
  "tool.error": "Errore",

  // Agent Tool UI
  "agent.status.running": "In esecuzione",
  "agent.status.completed": "Completato",
  "agent.status.error": "Errore",
  "agent.progress.executing": "Esecuzione sub-agent...",
  "agent.content.title": "Contenuto Generato",
  "agent.sources.title": "Fonti",
  "agent.debug.title": "Info Debug",

  // ============================================================================
  // Messages & Actions
  // ============================================================================

  "message.actions.copy": "Copia",
  "message.actions.retry": "Riprova",
  "message.actions.edit": "Modifica",
  "message.actions.delete": "Elimina",
  "message.actions.tooltipCopy": "Copia messaggio",
  "message.actions.tooltipRetry": "Riprova generazione",
  "message.actions.tooltipEdit": "Modifica messaggio",
  "message.actions.tooltipDelete": "Elimina messaggio",
  "message.actions.tooltipUpvote": "Vota positivamente",
  "message.actions.tooltipDownvote": "Vota negativamente",

  // ============================================================================
  // Agent & Model Selectors
  // ============================================================================

  "agent.selector.placeholder": "Assistente",
  "agent.selector.search": "Cerca agenti...",
  "agent.selector.empty": "Nessun agente trovato.",

  "model.selector.label": "Modello",
  "model.selector.description": "Scegli il modello AI",

  // Model Names and Descriptions
  "model.grokVision.name": "Grok Vision",
  "model.grokVision.description":
    "Modello multimodale avanzato con capacità visive e testuali",
  "model.grokReasoning.name": "Grok Reasoning",
  "model.grokReasoning.description":
    "Utilizza ragionamento avanzato chain-of-thought per problemi complessi",

  "visibility.label": "Visibilità",
  "visibility.private": "Privato",
  "visibility.public": "Pubblico",
  "visibility.private.description": "Solo tu puoi accedere a questa chat",
  "visibility.public.description":
    "Chiunque abbia il link può accedere a questa chat",

  // ============================================================================
  // Error Messages
  // ============================================================================

  "errors.fileUploadFailed": "Caricamento file fallito, riprova!",
  "errors.fileUploadSize": "File troppo grande. Dimensione massima 10MB.",
  "errors.modelWait": "Attendi che il modello finisca la risposta!",
  "errors.networkError": "Errore di rete. Controlla la connessione.",
  "errors.authInvalid": "Credenziali non valide!",
  "errors.authValidation": "Validazione fallita!",
  "errors.generic": "Qualcosa è andato storto. Riprova.",
  "errors.rateLimitExceeded": "Limite superato. Riprova più tardi.",
  "errors.sessionExpired": "Sessione scaduta. Accedi di nuovo.",
  "errors.noTextToCopy": "Non c'è testo da copiare!",
  "errors.upvoteFailed": "Impossibile votare positivamente.",
  "errors.downvoteFailed": "Impossibile votare negativamente.",
  "errors.artifactActionFailed": "Impossibile eseguire l'azione",

  // Success Messages
  "success.saved": "Salvato con successo",
  "success.copied": "Copiato negli appunti",
  "success.copiedCode": "Copiato negli appunti!",
  "success.copiedImage": "Immagine copiata negli appunti!",
  "success.copiedCsv": "CSV copiato negli appunti!",
  "success.deleted": "Eliminato con successo",
  "success.created": "Creato con successo",

  // ============================================================================
  // Common UI Elements
  // ============================================================================

  "common.loading": "Caricamento...",
  "common.saving": "Salvataggio...",
  "common.saved": "Salvato",
  "common.cancel": "Annulla",
  "common.confirm": "Conferma",
  "common.delete": "Elimina",
  "common.edit": "Modifica",
  "common.close": "Chiudi",
  "common.save": "Salva",
  "common.retry": "Riprova",
  "common.continue": "Continua",
  "common.back": "Indietro",
  "common.next": "Avanti",
  "common.previous": "Precedente",
  "common.search": "Cerca",
  "common.filter": "Filtra",
  "common.sort": "Ordina",
  "common.more": "Altro",
  "common.less": "Meno",
  "common.yes": "Sì",
  "common.no": "No",
  "common.submit": "Invia modulo",
  "common.start": "Inizia",
  "common.restart": "Riprova",

  // ============================================================================
  // Quiz Player
  // ============================================================================

  // Quiz Welcome Screen
  "quiz.welcome.questions": "domande",
  "quiz.welcome.cancel": "Annulla",
  "quiz.welcome.start": "Inizia Quiz",

  // Quiz End Screen
  "quiz.completed.title": "Quiz Completato!",
  "quiz.completed.correctPercentage": "% corrette",
  "quiz.completed.attempts": "tentativi",
  "quiz.completed.average": "Media: {score}%",
  "quiz.feedback.prompt": "Com'è stato questo quiz?",
  "quiz.feedback.restart": "Riprova",

  "message.actions.upvote": "Vota Positivamente",
  "message.actions.upvoting": "Votazione in corso...",
  "message.actions.upvoted": "Votato positivamente!",
  "message.actions.upvoteError": "Impossibile votare positivamente.",
  "message.actions.downvote": "Vota Negativamente",
  "message.actions.downvoting": "Votazione negativa in corso...",
  "message.actions.downvoted": "Votato negativamente!",
  "message.actions.downvoteError": "Impossibile votare negativamente.",
  "message.copyError": "Non c'è testo da copiare!",
  "message.copySuccess": "Copiato negli appunti!",
};
