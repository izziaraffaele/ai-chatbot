# Faenza Assistant - Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agents](#agents)
4. [Knowledge Base System](#knowledge-base-system)
5. [Invoice Validation System](#invoice-validation-system)
6. [Document Template System](#document-template-system)
7. [Tools Reference](#tools-reference)
8. [Data Flow](#data-flow)
9. [File Structure](#file-structure)
10. [Adding New Features](#adding-new-features)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Faenza Assistant is an AI-powered application for the **Comune di Faenza** (Municipality of Faenza, Italy). The primary agent, **Assistente Comune**, helps users manage and analyze Italian electronic invoices (FatturaElettronica).

### Key Features

- **Assistente Comune**: Official AI assistant for document management
- **Invoice Knowledge Base**: Access to XML invoice files
- **Intelligent Parsing**: Automatic extraction of invoice metadata
- **Invoice Validation**: Automatic validation of required fields for invoice liquidation
- **Document Templates**: Template-based generation for administrative documents (e.g., Comunicazione di Liquidazione)
- **Italian Interface**: System prompt and interactions in Italian

### Key Technologies

- **Next.js 15**: React framework with App Router
- **Mastra**: AI agent framework for tool orchestration
- **Google Gemini**: Default LLM for chat responses
- **LibSQL**: Memory storage for conversation history
- **TypeScript**: Type-safe codebase

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐   │
│  │  Agent Selector  │───▶│  ChatProvider    │───▶│  RuntimeConfig       │   │
│  │  (Assistente     │    │  (context.tsx)   │    │  (hooks/)            │   │
│  │   Comune)        │    └──────────────────┘    └──────────────────────┘   │
│  └──────────────────┘                                      │                 │
│                                                            ▼                 │
│                                              ┌──────────────────────────┐    │
│                                              │  HTTP Transport          │    │
│                                              └──────────────────────────┘    │
│                                                            │                 │
│                                                            ▼                 │
└────────────────────────────────────────────────────────────│─────────────────┘
                                                             │
                                                    HTTP POST /api/chat
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Chat Route Handler                             │   │
│  │  POST /api/chat                                                       │   │
│  │  1. Validate request                                                  │   │
│  │  2. Authenticate session                                              │   │
│  │  3. Create runtime context                                            │   │
│  │  4. Stream response from Assistente Comune                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Assistente Comune Agent                            │   │
│  │  mastra/agents/faenza/invoices-manager/                               │   │
│  │  - Identity: Comune di Faenza official assistant                      │   │
│  │  - Tool: loadInvoice (document access)                                │   │
│  │  - Memory: LibSQL for conversation history                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   Knowledge Base Loader                               │   │
│  │  mastra/utils/knowledge-base-loader.ts                                │   │
│  │  - Lists available invoice files                                      │   │
│  │  - Loads XML content with metadata extraction                         │   │
│  │  - Supports partial file ID matching                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agents

### Available Agents

| Agent | ID | Description | Avatar |
|-------|-----|-------------|--------|
| **Assistente Comune** | `assistente` | Official Comune di Faenza assistant for document management | Faenza logo (`/images/logo-faenza.jpg`) |
| **Researcher** | `researcher` | Web research and synthesis specialist | 🔍 |
| **Invoice Analyzer** | `invoiceAnalyzerAgent` | Specialized sub-agent for deep invoice analysis | 🔬 |

### Assistente Comune (`mastra/agents/faenza/invoices-manager/`)

The primary agent for Comune di Faenza, developed by MemorAIz.

**Purpose:**
- List available documents in the knowledge base (automatically shows an interactive document selector widget)
- Load and display specific documents when requested
- Help users understand and work with invoice documents

**Configuration:**

```typescript
export const chatAgent = new Agent({
  name: "Assistente Comune",
  instructions: ({ runtimeContext }) => {
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    return chatAgentSystemPrompt(config, geoHints);
  },
  model: "openai/gpt-5.1",
  // Sub-agent for deep invoice analysis
  agents: { invoiceAnalyzerAgent },
  tools: {
    // Backend tool that actually reads documents from the knowledge base
    loadInvoice: mastraTools.loadInvoice,
  },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

**Sub-Agent Delegation:**
The chat agent acts as a "routing agent" that can delegate invoice analysis tasks to the `invoiceAnalyzerAgent`. When a user requests invoice analysis (e.g., by clicking "Analizza Fattura"), the chat agent recognizes the request and delegates to the sub-agent.

**System Prompt Structure:**
1. **Identity**: "Assistente Ufficiale del Comune di Faenza" by MemorAIz
2. **Primary Task**: Document listing and selection
3. **Tool Usage**: Instructions for `loadInvoice` tool
4. **Document Format**: FatturaElettronica XML guide
5. **Communication Style**: Professional Italian
6. **Greeting**: Welcome message template

### Invoice Analyzer Agent (`mastra/agents/faenza/invoice-analyzer-agent/`)

A specialized sub-agent for deep analysis of invoice XML documents. This agent is **called by the chat agent** when users click "Analizza Fattura" on an invalid invoice. The button sends an automatic message to the chat, and the chat agent delegates to this sub-agent to search for missing fields in non-standard XML locations.

**Purpose:**
- Search entire XML document for missing required fields
- Extract potential values from non-standard locations
- Validate extracted values using specialized tools
- Return analysis results that appear in the chat conversation

**How it's called:**
1. User clicks "Analizza Fattura" button
2. UI sends message: "Analizza la fattura [fileId] per trovare i seguenti campi mancanti: [fields]"
3. Chat agent receives message and delegates to `invoiceAnalyzerAgent`
4. Analysis results appear in the chat thread

**Configuration:**

```typescript
// Default analyzer registered as sub-agent of chatAgent
export const invoiceAnalyzerAgent = new Agent({
  name: "Invoice Analyzer",
  description: `Agente specializzato per l'analisi approfondita di fatture elettroniche XML.
    Usa questo agente quando l'utente chiede di "analizzare una fattura" per trovare
    campi mancanti come IBAN, CIG, CUP, Codice Fiscale, o Codice PA.`,
  instructions: invoiceAnalyzerSystemPrompt([...missingFields]),
  model: "openai/gpt-5.1",
  tools: invoiceValidationTools,
});

// Factory function for custom missing fields (optional)
const customAnalyzer = createInvoiceAnalyzerAgent(["CUP", "IBAN"]);
```

**Validation Tools:**
| Tool | Purpose | Regex Pattern |
|------|---------|---------------|
| `validateIban` | Validates Italian IBAN | `^IT\d{2}[A-Z0-9]{23}$` |
| `validateCig` | Validates CIG code | `^[A-Z0-9]{10}$` |
| `validateCup` | Validates CUP code | `^[A-Z0-9]{15}$` |
| `validateCodiceFiscale` | Validates Italian tax code | Company: `^\d{11}$` / Individual: 16 chars |
| `validateCodicePa` | Validates PA code | `^[A-Z0-9]{6,7}$` |

**Note:** The legacy API endpoint `POST /api/analyze-invoice` still exists but is no longer used by the UI. The sub-agent approach is preferred as it keeps the conversation context intact.

### Agent Configuration (`lib/ai/agent-config.ts`)

Agents available in the UI selector:

```typescript
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  assistente: {
    id: "assistente",
    name: "Assistente comune",
    description: "Assistente ufficiale del Comune di Faenza per la gestione documenti",
    avatar: "🏛️",
    color: "green",
    registryId: "chatAgent",
  },
  researcher: {
    id: "researcher",
    name: "Researcher",
    description: "Specializes in web research and synthesis",
    avatar: "🔍",
    color: "blue",
    registryId: "researchAgent",
  },
};
```

---

## Knowledge Base System

### Overview

The Knowledge Base System allows the Assistente Comune to load and analyze Italian electronic invoices (FatturaElettronica XML format) stored in `mastra/knowledgebase/faenza/`.

### Key Components

#### 1. Knowledge Base Loader (`mastra/utils/knowledge-base-loader.ts`)

```typescript
// List all available invoice files
const files = listKnowledgeBaseFiles();
// Returns: ["CSB_IT00185240397_00IS8-[1796150500]", ...]

// Find file by partial ID
const fileName = findMatchingFile("00185240397");
// Returns: "CSB_IT00185240397_00IS8-[1796150500].xml"

// Load invoice with metadata
const invoice = loadKnowledgeBaseFile("CSB_IT00185240397");
// Returns: { metadata: InvoiceMetadata, content: string }
```

#### 2. Invoice Metadata Structure

```typescript
interface InvoiceMetadata {
  fileId: string;           // File identifier without extension
  fileName: string;         // Full file name
  supplier?: string;        // Supplier company name (Denominazione)
  supplierVatId?: string;   // Supplier VAT ID (IdCodice)
  buyer?: string;           // Buyer company name
  buyerVatId?: string;      // Buyer VAT ID
  date?: string;            // Invoice date (Data)
  invoiceNumber?: string;   // Invoice number (Numero)
  documentType?: string;    // TD01, TD04, TD24, etc.
  totalAmount?: number;     // Total amount (ImportoTotaleDocumento)
  currency?: string;        // Currency (EUR)
}
```

### File Naming Convention

```
CSB_{VAT_ID}_{CODE}-[{HASH}].xml
```

Example: `CSB_IT00185240397_00IS8-[1796150500].xml`

### User Interactions (Italian)

| User Says | Action |
|-----------|--------|
| "Mostrami i documenti" | List all available invoices with validation status |
| "Lavora su CSB_IT00185240397" | Load specific invoice with validation |
| "Carica la fattura 00185240397" | Load by partial ID |
| "Chi è il fornitore?" | Analyze loaded invoice |

---

## Invoice Validation System

### Overview

The invoice validation system automatically checks each invoice for the presence and format validity of required fields needed for invoice liquidation. This helps municipal employees quickly identify invoices that need corrections before processing.

### Validated Fields

| Field | XML Tag Location | Format Validation |
|-------|------------------|-------------------|
| **IBAN** | `<IBAN>` in `<DettaglioPagamento>` | 27 chars, starts with "IT" |
| **CIG** | `<CodiceCIG>` in `<DatiOrdineAcquisto>` etc. | 10 alphanumeric chars |
| **CUP** | `<CodiceCUP>` in `<DatiOrdineAcquisto>` etc. | 15 alphanumeric chars |
| **Codice Fornitore** | `<IdCodice>` in `<CedentePrestatore>` | Present (any format) |
| **Importo Spesa** | `<ImportoTotaleDocumento>` | Numeric value |
| **Descrizione Spesa** | `<Causale>` or `<Descrizione>` | Present (any text) |
| **Codice PA** | `<CodiceDestinatario>` | 6-7 alphanumeric chars |
| **Codice Fiscale** | `<CodiceFiscale>` in `<CedentePrestatore>` | 11 digits or 16 alphanumeric |

### Validation Functions (`mastra/utils/knowledge-base-loader.ts`)

```typescript
// Validate Italian IBAN format
isValidIBAN(iban: string): boolean
// Regex: /^IT\d{2}[A-Z0-9]{23}$/i

// Validate CIG format (10 alphanumeric chars)
isValidCIG(cig: string): boolean
// Regex: /^[A-Z0-9]{10}$/i

// Validate CUP format (15 alphanumeric chars)
isValidCUP(cup: string): boolean
// Regex: /^[A-Z0-9]{15}$/i

// Validate Italian Codice Fiscale
isValidCodiceFiscale(cf: string): boolean
// Company: /^\d{11}$/
// Individual: /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i

// Validate PA destination code
isValidCodiceDestinatario(code: string): boolean
// Regex: /^[A-Z0-9]{6,7}$/i
```

### InvoiceValidation Interface

```typescript
interface InvoiceValidation {
  iban: string | null;
  cig: string | null;
  cup: string | null;
  codiceFornitore: string | null;
  importoSpesa: number | null;
  descrizioneSpesa: string | null;
  codicePA: string | null;
  codiceFiscale: string | null;
  fatturaValida: boolean;        // true only if ALL fields are present and valid
  campiMancanti: string[];       // List of missing field names
  campiNonValidi: string[];      // List of fields with invalid format
}
```

### Using the Validation System

```typescript
import { validateInvoice, validateInvoiceFile } from "../utils/knowledge-base-loader";

// Validate from XML content
const validation = validateInvoice(xmlContent);
if (!validation.fatturaValida) {
  console.log("Missing fields:", validation.campiMancanti);
  console.log("Invalid format:", validation.campiNonValidi);
}

// Validate by file ID
const fileValidation = validateInvoiceFile("CSB_IT00185240397");
```

### UI Validation Display

The `LoadInvoiceTool` component (`components/tools/load-invoice.tsx`) displays:

**Document List View:**
- **Valid invoices**: Green badge "✓ Fattura valida"
- **Invalid invoices**: Red badge "✗ Fattura non valida"
- **Header stats**: Shows count of valid/invalid invoices

**Document Details View:**
- Validation badge (green/red)
- For invalid invoices: Lists missing and invalid fields
- For valid invoices: Shows validated field values (IBAN, CIG, CUP, etc.)

### Agent Behavior

When a user selects an invalid invoice, the agent automatically:
1. Loads the invoice and validation data
2. Explains which fields are missing
3. Explains which fields have invalid format
4. Suggests the user verify the data with the supplier

---

## Document Template System

### Overview

The Document Template System allows generating structured documents (like "Comunicazione di Liquidazione") using data extracted from loaded invoices. When a user requests a document that matches a registered template, the system automatically populates the template with invoice data instead of using AI generation.

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **Template Types** | `lib/templates/types.ts` | TypeScript interfaces for templates |
| **Template Registry** | `lib/templates/index.ts` | Central registry and rendering functions |
| **Liquidation Template** | `lib/templates/liquidation-communication.ts` | "Comunicazione di Liquidazione" template |

### Template Context

When a template is rendered, it receives a `TemplateContext` object with:

```typescript
type TemplateContext = {
  metadata: InvoiceMetadata;    // Supplier, buyer, amount, dates, etc.
  validation: InvoiceValidation; // IBAN, CIG, CUP, validation status
  content?: string;              // Raw XML content (optional)
  custom?: Record<string, unknown>; // Custom data (optional)
};
```

### Available Templates

| Template ID | Name | Trigger Keywords |
|-------------|------|------------------|
| `liquidation-communication` | Comunicazione di Liquidazione | liquidazione, liquidare, liquid, pagamento fattura |

---

## Tools Reference

### Assistente Comune Tools

| Tool | Description | Input |
|------|-------------|-------|
| `loadInvoice` | Load invoice from knowledge base | `{ fileId?: string }` |

**Note:** The Assistente Comune has only one **backend tool** – `loadInvoice`. Its sole purpose is document management.

### Invoice Analyzer Tools (`mastra/tools/invoice-validation-tools.ts`)

The Invoice Analyzer Agent uses specialized validation tools to verify extracted field values:

| Tool | Description | Input |
|------|-------------|-------|
| `validateIban` | Validates Italian IBAN format | `{ value: string, xmlLocation?: string }` |
| `validateCig` | Validates CIG code format | `{ value: string, xmlLocation?: string }` |
| `validateCup` | Validates CUP code format | `{ value: string, xmlLocation?: string }` |
| `validateCodiceFiscale` | Validates Italian tax code | `{ value: string, xmlLocation?: string }` |
| `validateCodicePa` | Validates PA destination code | `{ value: string, xmlLocation?: string }` |

**Output Format (all tools):**

```typescript
interface ValidationOutput {
  isValid: boolean;        // Whether validation passed
  cleanedValue: string;    // Normalized value (uppercase, no whitespace)
  fieldType: string;       // "IBAN", "CIG", "CUP", etc.
  originalValue: string;   // Original input value
  validationMessage: string; // Human-readable result (Italian)
}
```

#### loadInvoice Tool UI Component

The `loadInvoice` tool has a built-in UI component (`LoadInvoiceTool` in `components/tools/load-invoice.tsx`) that automatically renders:

- **When listing documents** (called without `fileId`): Shows a clickable widget card; user clicks to open the document selector panel on the right side
- **When loading a specific document**: Shows invoice metadata summary (supplier, invoice number, date, amount) with **validation details**.

### Load Invoice Tool Details

```typescript
// Input
{
  fileId?: string  // Optional: partial or full invoice identifier
}

// Output (when listing files)
{
  success: boolean,
  availableFiles?: string[],                    // List of file IDs (legacy)
  filesWithValidation?: FileValidation[],       // Files with validation status
  error?: string
}

// Output (when loading specific file)
{
  success: boolean,
  metadata?: InvoiceMetadata,                   // Extracted invoice details
  content?: string,                             // Raw XML content
  validation?: InvoiceValidation,               // Validation result
  truncated?: boolean,                          // If content was truncated
  originalSize?: number,                        // Original content size
  error?: string
}
```

### Invoice API Endpoint

**Path:** `GET /api/invoice`

Used by the Document Detail View to fetch invoice data directly without going through the chat agent.

```typescript
// Request
GET /api/invoice?fileId={fileId}

// Response (success)
{
  success: true,
  metadata: InvoiceMetadata,      // File info, supplier, buyer, amounts
  content: string,                 // Raw XML content
  validation: InvoiceValidation    // Validation results with human-readable field names
}
```

---

## Data Flow

### Document Listing Flow (with Validation and Side Panel)

```
1. User: "Mostrami i documenti"
         │
         ▼
2. Agent calls loadInvoice({}) - no fileId
         │
         ▼
3. Tool iterates over all files, validates each one:
   - loadKnowledgeBaseFile(fileId) → { metadata, content }
   - validateInvoice(content) → { fatturaValida, campiMancanti, ... }
         │
         ▼
4. Tool returns { 
     success: true, 
     filesWithValidation: [
       { fileId: "...", fatturaValida: true, campiMancanti: [], campiNonValidi: [] },
       { fileId: "...", fatturaValida: false, campiMancanti: ["CUP"], campiNonValidi: [] },
       ...
     ]
   }
         │
         ▼
5. LoadInvoiceTool UI component:
   - Shows "Documenti Disponibili" card with stats (valid/invalid/total)
   - AUTOMATICALLY opens the side panel (document-selector tab)
```

### Invoice Analysis Flow (Deep Search via Sub-Agent)

When an invoice is invalid and the user clicks "Analizza Fattura":

```
1. User clicks "Analizza Fattura" button on invalid invoice
         │
         ▼
2. UI component sends automatic message to chat:
   "Analizza la fattura [fileId] per trovare i seguenti campi mancanti: [elenco]"
         │
         ▼
3. Chat Agent (routing agent) receives the message
   - Recognizes analysis request based on message content
   - Has invoiceAnalyzerAgent registered as sub-agent
         │
         ▼
4. Chat Agent delegates to Invoice Analyzer sub-agent
   - The sub-agent is called via Mastra's agent network mechanism
   - Sub-agent receives the analysis request with fileId and missing fields
         │
         ▼
5. Invoice Analyzer Agent streams analysis:
   a. Reads entire XML document
   b. Uses LLM to search for potential values (CUP, CIG, IBAN, etc.)
   c. Calls validation tools → { isValid: true/false, ... }
   d. Repeats for each missing field
         │
         ▼
6. Results appear in chat thread:
   ✅ CUP trovato e validato: J81B21000690001
      Posizione: DatiContratto > CodiceCUP
   
   ❌ IBAN non trovato nel documento
      Ho cercato in: DettaglioPagamento, Note, Causale
```

---

## File Structure

```
mastra/
├── agents/
│   ├── faenza/
│   │   ├── invoices-manager/
│   │   │   ├── index.ts           # Assistente Comune configuration
│   │   │   └── system-prompt.ts   # Italian system prompt
│   │   └── invoice-analyzer-agent/
│   │       ├── index.ts           # Invoice Analyzer Agent + factory function
│   │       └── system-prompt.ts   # Analysis-focused Italian prompt
│   ├── research-agent/
│   │   └── index.ts           # Research agent
│   └── index.ts               # Agent exports
├── knowledgebase/
│   └── faenza/
│       └── *.xml              # Invoice files
├── tools/
│   ├── index.ts               # Tool exports
│   ├── load-invoice-tool.ts   # Invoice loading tool
│   ├── invoice-validation-tools.ts  # Validation tools for analyzer
│   └── ...                    # Other tools
├── utils/
│   ├── knowledge-base-loader.ts    # Faenza KB utilities + validation
│   └── runtime-utils.ts            # Runtime context
└── index.ts                   # Mastra instance

app/
├── (chat)/
│   └── api/
│       ├── chat/
│       │   └── route.ts       # Main chat endpoint
│       ├── invoice/
│       │   └── route.ts       # Direct invoice loading API for detail view
│       └── analyze-invoice/
│           └── route.ts       # Invoice analysis streaming endpoint

lib/
├── ai/
│   └── agent-config.ts        # UI agent configuration
├── templates/
│   ├── index.ts               # Template registry and rendering functions
│   ├── types.ts               # TypeScript types for templates
│   └── liquidation-communication.ts  # Comunicazione di Liquidazione template
└── ...

components/
├── artifacts/
│   ├── document.tsx           # Document artifacts (text, code, sheet)
│   ├── document-selector.tsx  # Document selector side panel artifact
│   └── index.ts               # Artifact exports and types
├── chat/
│   ├── canvas.tsx             # Resizable canvas layout
│   ├── canvas-tabs.tsx        # Tab bar component for multi-tab canvas
│   └── agent-selector.tsx     # Agent selection UI
└── tools/
    └── load-invoice.tsx       # Invoice UI (auto-opens side panel, shows details)
```

---

## Adding New Features

### Adding a New Agent to UI

1. Define agent in `mastra/agents/`:

```typescript
export const myAgent = new Agent({
  name: "My Agent",
  instructions: "...",
  model: "openai/gpt-5.1",
  tools: { ... },
});
```

2. Export from `mastra/agents/index.ts`

3. Add to `lib/ai/agent-config.ts`:

```typescript
myAgent: {
  id: "myAgent",
  name: "My Agent",
  description: "Description for UI",
  avatar: "🤖",
  color: "purple",
  registryId: "myAgent",
},
```

### Adding Documents to Knowledge Base

1. Add XML files to `mastra/knowledgebase/faenza/`
2. Files will be automatically discovered by `listKnowledgeBaseFiles()`

### Customizing Invoice Parsing

Edit `mastra/utils/knowledge-base-loader.ts`:

```typescript
function extractMetadata(content: string, fileName: string): InvoiceMetadata {
  // Add new field extraction
  const newField = extractTag("NewFieldTag");
  
  return {
    // ... existing fields
    newField,
  };
}
```

---

## Canvas Tab System

The canvas panel (right side of the application) supports a multi-tab system that allows users to work with multiple documents and widgets simultaneously.

### Widget Kinds

| Kind | Label | Multiple Allowed | Streaming | Icon |
|------|-------|------------------|-----------|------|
| `text` | Documento di testo | Yes | Yes | FileText |
| `code` | Codice | Yes | Yes | Code2 |
| `sheet` | Foglio di calcolo | Yes | Yes | FileSpreadsheet |
| `image` | Immagine | Yes | No | Image |
| `markdown-viewer` | Visualizzatore Markdown | Yes | No | BookOpenText |
| `document-selector` | Selettore documenti | No | No | LayoutGrid |

---

## Troubleshooting

### Common Issues

#### Invoice Not Found

**Symptom**: "No invoice found matching..."

**Debug**:
```typescript
const files = listKnowledgeBaseFiles();
console.log("Available files:", files);

const match = findMatchingFile("search-term");
console.log("Matched file:", match);
```

#### Agent Not Loading Documents

**Check**:
1. `loadInvoice` tool is registered in agent
2. System prompt includes tool usage instructions
3. Files exist in `mastra/knowledgebase/faenza/`

### Debug Logging

Console logs prefixed with `[KB]`:

```
[KB] No matching file found for: invalid-id
[KB] Loaded invoice: CSB_IT00185240397_00IS8-[1796150500].xml
[KB] Error loading file: <error details>
```

---

## Temporary Testing Configuration

### Rate Limiting Disabled

**File**: `lib/ai/entitlements.ts`

Rate limiting has been **temporarily disabled** for testing purposes. Both guest and regular users now have unlimited message requests.

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [FatturaElettronica XML Spec](https://www.fatturapa.gov.it/export/fatturazione/sdi/Specifiche_tecniche_del_formato_FatturaPA_v1.2.pdf)
- [Next.js Documentation](https://nextjs.org/docs)
