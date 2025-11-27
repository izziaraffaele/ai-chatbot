# Faenza Assistant - Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agents](#agents)
4. [Knowledge Base System](#knowledge-base-system)
5. [Invoice Validation System](#invoice-validation-system)
6. [Tools Reference](#tools-reference)
7. [Data Flow](#data-flow)
8. [File Structure](#file-structure)
9. [Adding New Features](#adding-new-features)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Faenza Assistant is an AI-powered application for the **Comune di Faenza** (Municipality of Faenza, Italy). The primary agent, **Assistente Comune**, helps users manage and analyze Italian electronic invoices (FatturaElettronica).

### Key Features

- **Assistente Comune**: Official AI assistant for document management
- **Invoice Knowledge Base**: Access to 66 XML invoice files
- **Intelligent Parsing**: Automatic extraction of invoice metadata
- **Invoice Validation**: Automatic validation of required fields for invoice liquidation
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
│  │  mastra/agents/chat-agent/                                            │   │
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

### Assistente Comune (`mastra/agents/chat-agent/`)

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
  model: "google/gemini-2.5-flash",
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

### Invoice Analyzer Agent (`mastra/agents/invoice-analyzer-agent/`)

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
  model: "google/gemini-2.5-flash",
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
- Header stats: Shows count of valid/invalid invoices

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

**Usage in Agent:**

```typescript
// Agent extracts potential CUP from XML, then validates
const result = await validateCupTool.execute({
  context: {
    value: "J81B21000690001",
    xmlLocation: "DatiContratto > CodiceCUP"
  }
});
// Returns: { isValid: true, cleanedValue: "J81B21000690001", ... }
```

#### loadInvoice Tool UI Component

The `loadInvoice` tool has a built-in UI component (`LoadInvoiceTool` in `components/tools/load-invoice.tsx`) that automatically renders:

- **When listing documents** (called without `fileId`): Automatically opens a document selector panel on the right side of the screen (similar to how documents are displayed)
- **When loading a specific document**: Shows invoice metadata summary (supplier, invoice number, date, amount) with **validation details**.

##### Document Selector Side Panel

When the `loadInvoice` tool returns available files, the **Document Selector Artifact** (`components/artifacts/document-selector.tsx`) automatically opens in a side panel on the right side of the screen. This provides a better UX by:

- Keeping the chat visible in a sidebar on the left
- Displaying the document selector in a larger, dedicated panel
- Allowing users to browse documents without scrolling through the chat
- **Resizable columns**: Users can drag the divider between panels to adjust widths
- **Persistent panel**: Panel stays open after document selection for continuous browsing

**Side Panel Components:**

| Component | Path | Description |
|-----------|------|-------------|
| `DocumentSelectorArtifact` | `components/artifacts/document-selector.tsx` | Main artifact with list/detail view modes |
| `InvoiceDetailView` | `components/artifacts/document-selector.tsx` | Detail view with extracted data and invoice display |
| `ExtractedDataCard` | `components/artifacts/document-selector.tsx` | Color-coded card for extracted field with edit support |
| `ParsedInvoiceRenderer` | `components/artifacts/document-selector.tsx` | Formatted invoice display component |
| `LoadInvoiceTool` | `components/tools/load-invoice.tsx` | Triggers the side panel when files are returned |
| `ChatCanvas` | `components/chat/canvas.tsx` | Resizable panel container using `react-resizable-panels` |

**Resizable Layout:**

The side panel uses `react-resizable-panels` for adjustable column widths:

| Panel | Default Size | Min Size | Max Size |
|-------|-------------|----------|----------|
| Chat Thread (left) | 60% | 30% | 80% |
| Document Selector (right) | 40% | 20% | 70% |

- Drag the vertical handle between panels to resize
- Panel sizes are persisted across sessions (via `autoSaveId`)
- Mobile devices use full-width stacked panels (no resize)

**Panel Features:**

**Header Section:**
- Title ("Documenti Disponibili") and close button
- Stats showing **valid count**, **invalid count**, and total count

**Search & Filters:**
- Search bar for filtering by name, code, or file ID
- Grid/List view toggle

**Document Cards (Grid View):**
- Blue document icon (valid) or Red document icon (invalid)
- Display name (extracted from file ID)
- Secondary code (extracted from file ID)
- **"Fattura valida"** badge (green) or **"Fattura non valida"** badge (red)

**Interaction:**
- Clicking a document card does **two things simultaneously**:
  1. Opens the **Document Detail View** in the panel (for visual inspection)
  2. Sends a message to the chat to load the document (triggers AI analysis)
- This gives users both the detail view AND the chat interaction with "Analizza Fattura" button
- User can navigate back to the list view via the back button
- User can close manually via the X button in the header
- A collapsed widget in the chat allows re-opening the panel

##### Document Detail View

When a document is clicked in the selector, the panel transforms to display a **detail view** with two main sections:

**1. Extracted Data Section ("Dati estratti dall'AI")**

A top banner with color-coded cards showing key invoice fields:

| Field | Source | Color Coding |
|-------|--------|--------------|
| IBAN | `<IBAN>` in `<DettaglioPagamento>` | Green (valid), Yellow (invalid format), Red (missing) |
| Costo Totale | `<ImportoTotaleDocumento>` | Green (valid), Yellow (invalid format), Red (missing) |
| CIG | `<CodiceCIG>` in order data | Green (valid), Yellow (invalid format), Red (missing) |
| CUP | `<CodiceCUP>` in order data | Green (valid), Yellow (invalid format), Red (missing) |

**Color Coding Logic:**
- **Green**: Field is present and passes format validation
- **Yellow**: Field is present but has invalid format (in `campiNonValidi`)
- **Red**: Field is missing (in `campiMancanti`)

**Editable Fields:**
Each extracted field can be edited locally by clicking "Modifica". Changes are temporary and only update the UI (not persisted to backend).

**2. Original Invoice Section ("Fattura originale")**

A parsed/formatted view of the complete invoice showing:
- **Invoice Header**: Number, date, type, currency badges
- **Transmission Data**: ID, progressive, destination code, format
- **Supplier (Cedente/Prestatore)**: Company name, VAT, address, REA data, contacts
- **Buyer (Cessionario/Committente)**: Company name, VAT, address
- **Order Data**: Document ID, CIG, CUP with item badges
- **SAL Data**: Reference phase and DDT information
- **Causale**: Invoice description/reason
- **Line Items**: Detailed list with quantities, prices, discounts, VAT
- **VAT Summary (Riepilogo IVA)**: Tax breakdown with totals
- **Payment Data**: Conditions, method, due date, bank details, IBAN

##### Collapsed Widget (Chat View)

When the document selector panel is closed, a compact widget appears in the chat showing:
- Document icon and "Documenti Disponibili" title
- Summary stats (valid/invalid/total counts)
- Clickable to re-open the side panel

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

// FileValidation type
{
  fileId: string,
  fatturaValida: boolean,
  campiMancanti: string[],    // Human-readable field names (Italian)
  campiNonValidi: string[]
}
```

**Usage:**
- Without `fileId`: Returns list of all available files with validation status
- With `fileId`: Loads the matching invoice with full validation details

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

// Response (error)
{
  error: string,
  message: string
}
```

**Usage:**
```typescript
// In DocumentSelectorArtifact
const response = await fetch(`/api/invoice?fileId=${encodeURIComponent(fileId)}`);
const data = await response.json();
// data contains { metadata, content, validation }
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
   a. Calls setArtifact() to open DocumentSelectorArtifact in side panel
   b. Shows collapsed widget in chat with summary stats
         │
         ▼
6. Side panel (DocumentSelectorArtifact) opens on the right:
   - Chat thread on left (default 60%, resizable 30-80%)
   - Document selector on right (default 40%, resizable 20-70%)
   - User can drag the divider to resize panels
         │
         ▼
7. User clicks on a document in the side panel:
   a. Panel fetches invoice data via GET /api/invoice?fileId={fileId}
   b. Panel transforms to Detail View showing:
      - Extracted data cards (IBAN, CIG, CUP, etc.) with color coding
      - Full parsed invoice display
   c. User can edit fields locally or navigate back to list
```

### Document Detail View Flow

When a user clicks a document, **two things happen in parallel**:

```
1. User clicks document in DocumentSelectorArtifact
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
2a. Chat message sent:                   2b. API call made:
    "Carica il documento {fileId}"           GET /api/invoice?fileId={fileId}
         │                                      │
         ▼                                      ▼
3a. Chat Agent processes message:        3b. API loads invoice:
    - Calls loadInvoice tool                 - loadKnowledgeBaseFile(fileId)
    - Returns invoice data                   - validateInvoice(content)
         │                                      │
         ▼                                      ▼
4a. LoadInvoiceTool widget appears       4b. Detail view opens in panel:
    in chat with:                            - ExtractedDataCard components
    - Invoice summary                        - Color-coded validation
    - Validation status                      - ParsedInvoiceRenderer
    - "Analizza Fattura" button              - Editable fields
      (for invalid invoices)
         │                                      │
         └──────────────────────────────────────┘
                          │
                          ▼
5. User now has both:
   - Detail view on the right panel (for visual inspection)
   - Chat interaction on the left (for AI analysis)
   - "Analizza Fattura" button available for invalid invoices
```

**Key Benefits:**
- User can visually inspect the full invoice in the detail view
- User can ask the AI to analyze missing fields via chat
- The "Analizza Fattura" button triggers deep analysis by the Invoice Analyzer sub-agent

### Document Loading Flow (with Validation)

```
1. User: "Lavora su CSB_IT00185240397"
         │
         ▼
2. Agent calls loadInvoice({ fileId: "CSB_IT00185240397" })
         │
         ▼
3. findMatchingFile() → "CSB_IT00185240397_00IS8-[1796150500].xml"
         │
         ▼
4. loadKnowledgeBaseFile() → { metadata, content }
         │
         ▼
5. validateInvoice(content) → { fatturaValida, iban, cig, cup, ... }
         │
         ▼
6. If fatturaValida = true:
   Agent summarizes invoice:
   - Fornitore: CARMI SPA OLEOMECCANICA
   - P.IVA: 00185240397
   - Importo: €568.23
   - Data: 2025-01-28
   - Stato: Fattura valida ✓

   If fatturaValida = false:
   Agent explains validation issues:
   - Campi mancanti: CUP (Codice Unico di Progetto)
   - Campi non validi: IBAN (formato non corretto)
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
         │
         ▼
7. Analysis complete - user sees summary in the conversation
```

**Key Benefits of Sub-Agent Approach:**
- Results appear in the chat conversation history
- User can ask follow-up questions about the analysis
- Memory is preserved across the conversation
- Consistent UI experience (no separate panel)

---

## File Structure

```
mastra/
├── agents/
│   ├── chat-agent/
│   │   ├── index.ts           # Assistente Comune configuration
│   │   └── system-prompt.ts   # Italian system prompt
│   ├── invoice-analyzer-agent/
│   │   ├── index.ts           # Invoice Analyzer Agent + factory function
│   │   └── system-prompt.ts   # Analysis-focused Italian prompt
│   ├── research-agent/
│   │   └── index.ts           # Research agent
│   └── index.ts               # Agent exports
├── knowledgebase/
│   └── faenza/
│       └── *.xml              # 66 invoice files
├── tools/
│   ├── index.ts               # Tool exports
│   ├── load-invoice-tool.ts   # Invoice loading tool
│   ├── invoice-validation-tools.ts  # Validation tools for analyzer
│   └── ...                    # Other tools
├── utils/
│   ├── knowledge-base-loader.ts  # KB utilities + validation functions
│   └── runtime-utils.ts          # Runtime context
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
└── ...

components/
├── artifacts/
│   ├── document.tsx           # Document artifacts (text, code, sheet)
│   ├── document-selector.tsx  # Document selector side panel artifact (persistent)
│   ├── media.tsx              # Media artifacts
│   └── index.ts               # Artifact exports and types
├── chat/
│   ├── canvas.tsx             # Resizable canvas layout (react-resizable-panels)
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
  model: "google/gemini-2.5-flash",
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

#### Tool Widget Not Displaying

**Symptom**: The tool executes (visible in server logs with `[KB] Loaded invoice:` messages) but the widget doesn't render in the chat UI.

**Likely Causes**:
1. **Stale code cache**: The server may need to recompile after changes. Check terminal for `[Fast Refresh] rebuilding` messages.
2. **Database message parts**: Old chat messages may have corrupted/missing tool parts in the database. New chats should work correctly.
3. **Tool name mismatch**: The tool name in Mastra must match the key in `components/tools/index.tsx` ToolUI registry.

**Debug**:
```typescript
// Add to components/tools/index.tsx getToolUI function:
console.log("[ToolUI] Resolving tool:", toolName, "Found:", toolName in ToolUI);
```

**Fix**:
- Try hard-refreshing the browser (Cmd+Shift+R / Ctrl+Shift+R)
- Restart the dev server with `pnpm run dev`
- For old chats with missing parts, start a new chat instead

#### Duplicate Key React Error in Chat

**Symptom**: Console error "Encountered two children with the same key" when switching documents in the side panel.

**Cause**: The same `MessageIterator` component was rendered in two places (main thread and canvas thread) with identical message keys.

**Fix**: The `MessageIterator` component (`components/chat/iterators.tsx`) now accepts an optional `keyPrefix` prop. When rendering messages in multiple locations, use different prefixes:

```typescript
// In assistant-chat.tsx
const renderMessages = (keyPrefix?: string) => (
  <MessageIterator empty={chatEmpty} keyPrefix={keyPrefix}>
    {/* ... render props ... */}
  </MessageIterator>
);

// Main thread
<ChatThreadContent>{renderMessages("main")}</ChatThreadContent>

// Canvas thread
<ChatThreadContent>{renderMessages("canvas")}</ChatThreadContent>
```

### Debug Logging

Console logs prefixed with `[KB]`:

```
[KB] No matching file found for: invalid-id
[KB] Loaded invoice: CSB_IT00185240397_00IS8-[1796150500].xml
[KB] Error loading file: <error details>
```

---

## Recent Bug Fixes (November 2025)

### 1. XML Block Extraction Fix

**File**: `components/artifacts/document-selector.tsx`

**Issue**: The `extractBlock` function was incorrectly using `.call()` to try to change the content context, which doesn't work with closure variables.

**Fix**: Refactored `extractTag` and `extractBlock` to accept an optional `source` parameter:

```typescript
// Before (broken)
const sedeBlock = cedenteBlock ? extractBlock.call({ content: cedenteBlock }, "Sede") : undefined;

// After (fixed)
const extractBlock = (tag: string, source: string = content): string | undefined => { ... }
const sedeBlock = cedenteBlock ? extractBlock("Sede", cedenteBlock) : undefined;
```

### 2. Analysis Button State Reset

**File**: `components/tools/load-invoice.tsx`

**Issue**: The "Analizza Fattura" button stayed disabled showing "Analisi richiesta..." indefinitely after clicking.

**Fix**: Added a ref to track the current fileId and reset `analysisRequested` state when a different invoice is loaded:

```typescript
const lastFileIdRef = useRef(metadata.fileId);
if (lastFileIdRef.current !== metadata.fileId) {
  lastFileIdRef.current = metadata.fileId;
  if (analysisRequested) {
    setAnalysisRequested(false);
  }
}
```

### 3. Document Selection Order Fix

**File**: `components/artifacts/document-selector.tsx`

**Issue**: When clicking a document, the chat message was sent before fetching invoice data. If the fetch failed, the chat showed "Carica il documento..." but the detail view didn't open.

**Fix**: Reordered operations to fetch invoice data first, only send chat message on success.

### 4. Panel Auto-Open Race Condition Fix

**File**: `components/tools/load-invoice.tsx`

**Issue**: The `hasOpenedPanel` ref could cause the panel to not open on component remounts (e.g., HMR) or to open multiple times if file reference changed.

**Fix**: Replaced boolean ref with a signature-based tracking system:

```typescript
const openedForSignatureRef = useRef<string | null>(null);
const filesSignature = `${filesWithValidation.length}:${filesWithValidation[0]?.fileId || ""}`;

if (openedForSignatureRef.current === filesSignature) {
  return; // Already opened for this file set
}
openedForSignatureRef.current = filesSignature;
```

### 5. MessageIterator Re-render Optimization

**File**: `components/chat/iterators.tsx`

**Issue**: The `senders` object was recreated on every render, causing unnecessary re-renders.

**Fix**: Memoized the senders object:

```typescript
const senders = useMemo<Record<...>>(
  () => ({ user: displayUser, assistant: displayAssistant }),
  [displayUser, displayAssistant]
);
```

### 6. Field Status Matching Fix

**File**: `components/artifacts/document-selector.tsx`

**Issue**: Using `includes()` for field matching caused false positives (e.g., "CIG" could match unrelated text).

**Fix**: Implemented regex-based pattern matching with explicit field mappings:

```typescript
const FIELD_NAME_PATTERNS: Record<string, RegExp> = {
  iban: /^IBAN$/i,
  cig: /^CIG\b/i,
  cup: /^CUP\b/i,
  importo: /^Importo\s+Spesa$/i,
  // ... etc
};
```

### 7. Multiple Document Widgets Accumulation Fix

**File**: `components/tools/load-invoice.tsx`

**Issue**: When clicking "Analizza Fattura" on multiple different documents, multiple widgets accumulated in the chat, making the interface cluttered. Each document widget had its own "Analizza Fattura" button visible simultaneously.

**Fix**: Implemented a shared state system using SWR to track the "currently active document":

1. Created a `useActiveDocument` hook that tracks which document is currently being worked on
2. When a new document is loaded, it automatically becomes the "active" document
3. Previous document widgets collapse to a minimal view (showing only supplier name, invoice number, and date)
4. Only the current document shows full details and the "Analizza Fattura" button
5. Users can manually expand previous document widgets by clicking them

```typescript
// Shared state for tracking active document
const ACTIVE_DOCUMENT_KEY = "active-invoice-document";

function useActiveDocument() {
  const { data: activeDocumentId, mutate: setActiveDocumentId } = useSWR<string | null>(
    ACTIVE_DOCUMENT_KEY,
    null,
    { fallbackData: null }
  );
  // ...
}

// In InvoiceDetails component
const isCurrentDocument = activeDocumentId === metadata.fileId;

// Show collapsed view for non-current documents
if (!showFullDetails) {
  return <CollapsedDocumentView ... />;
}
```

**UX Behavior**:
- New documents automatically become "current" and show full details
- Previous documents collapse to a single-line summary
- Collapsed widgets can be expanded by clicking them
- Only current document shows "Analizza Fattura" button
- Previous documents show hint: "Seleziona questo documento dal pannello per analizzarlo"

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [FatturaElettronica XML Spec](https://www.fatturapa.gov.it/export/fatturazione/sdi/Specifiche_tecniche_del_formato_FatturaPA_v1.2.pdf)
- [Next.js Documentation](https://nextjs.org/docs)
