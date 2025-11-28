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
- **Invoice Knowledge Base**: Access to 66 XML invoice files
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
  model: "openai/gpt-4.1",
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
  model: "openai/gpt-4.1",
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

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE SYSTEM FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  1. User loads invoice using loadInvoice tool                    │
│     → Invoice stored in RuntimeContext                           │
│                                                                  │
│  2. User requests "Crea comunicazione di liquidazione"           │
│     → Agent calls createDocument({ title: "...", kind: "text" }) │
│                                                                  │
│  3. textDocumentHandler checks for invoice context               │
│     → Finds invoice in RuntimeContext                            │
│                                                                  │
│  4. Template Registry searches for matching template             │
│     → Matches "liquidation-communication" by keywords            │
│                                                                  │
│  5. Template rendered with invoice data                          │
│     → {{SUPPLIER_NAME}} → "CARMI SPA OLEOMECCANICA"              │
│     → {{TOTAL_AMOUNT}} → "€ 568,23"                              │
│     → {{MISSING_FIELD}} → "______" (placeholder)                 │
│                                                                  │
│  6. Rendered content streamed to client                          │
│     → Document appears in canvas tab                             │
└─────────────────────────────────────────────────────────────────┘
```

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

### Template Variable Mappings (Liquidation)

| Variable | Source | Fallback |
|----------|--------|----------|
| `UNITA_PROPONENTE` | Invoice buyer name | "______" |
| `ANNO_DETERMINA` | Invoice year | Current year |
| `OGGETTO_DETERMINA` | Invoice description (Causale) | "______" |
| `IMPORTO_TOTALE` | Invoice total amount | "______" |
| `CREDITORE_DENOMINAZIONE` | Supplier name | "______" |
| `CREDITORE_IBAN` | IBAN from validation | "______" |
| `CREDITORE_CIG` | CIG from validation | "______" |
| `CREDITORE_CUP` | CUP from validation | "______" |
| `FATTURA_NUMERO` | Invoice number | "______" |
| `FATTURA_DATA` | Invoice date (DD/MM/YYYY) | "______" |
| `FATTURA_IMPORTO` | Invoice amount | "______" |
| `DATA_DETERMINA` | Current date (DD/MM/YYYY) | "______" |
| `FIRMATARIO` | - | "______" |

### Invoice Context Integration

The template system requires an invoice context to render templates. There are two ways to provide it:

**Method 1: Explicit `invoiceFileId` parameter (RECOMMENDED)**

The agent passes the invoice file ID directly to `createDocument`:

```typescript
// Agent calls createDocument with invoiceFileId
createDocument({
  title: "Comunicazione di Liquidazione",
  kind: "text",
  invoiceFileId: "CARMI_SPA_OLEOMECCANICA-[1796150500]"
})
```

The tool then loads the invoice and passes it to the handler:

```typescript
// In createDocumentTool.execute()
if (invoiceFileId) {
  const invoice = loadKnowledgeBaseFile(invoiceFileId);
  if (invoice) {
    invoiceContext = {
      metadata: invoice.metadata,
      validation: validateInvoice(invoice.content),
      content: invoice.content,
    };
  }
}
```

**Method 2: RuntimeContext fallback**

If no `invoiceFileId` is provided, the tool checks the runtime context (only works within the same agent turn):

```typescript
// Fallback to runtime context
let invoiceContext = getLoadedInvoice(runtimeContext);
```

**textDocumentHandler** uses the invoice context for template rendering:

```typescript
if (invoiceContext) {
  const template = templateRegistry.findTemplate(title, templateContext, "text");
  if (template) {
    const result = renderTemplate(template, templateContext);
    // Stream rendered content...
  }
}
```

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

- **When listing documents** (called without `fileId`): Shows a clickable widget card; user clicks to open the document selector panel on the right side
- **When loading a specific document**: Shows invoice metadata summary (supplier, invoice number, date, amount) with **validation details**.

##### Document Selector Side Panel

When the user clicks on the "Documenti Disponibili" widget in the chat, the **Document Selector Artifact** (`components/artifacts/document-selector.tsx`) opens in a side panel on the right side of the screen. This provides a better UX by:

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
| `LoadInvoiceTool` | `components/tools/load-invoice.tsx` | Shows clickable widget; opens side panel when clicked |
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
   - Shows "Documenti Disponibili" card with stats (valid/invalid/total)
   - AUTOMATICALLY opens the side panel (document-selector tab)
         │
         ▼
6. Document Selector panel opens automatically:
   - Side panel (DocumentSelectorArtifact) opens on the right
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

artifacts/
├── text/
│   └── server.ts              # Text document handler (with template support)
├── code/
│   └── server.ts              # Code document handler
└── sheet/
    └── server.ts              # Sheet/CSV document handler

lib/
├── ai/
│   └── agent-config.ts        # UI agent configuration
├── templates/
│   ├── index.ts               # Template registry and rendering functions
│   ├── types.ts               # TypeScript types for templates
│   └── liquidation-communication.ts  # Comunicazione di Liquidazione template
├── artifacts/
│   └── server.ts              # Document handler factory (template integration)
└── ...

components/
├── artifacts/
│   ├── document.tsx           # Document artifacts (text, code, sheet)
│   ├── document-selector.tsx  # Document selector side panel artifact (persistent)
│   ├── media.tsx              # Media artifacts
│   └── index.ts               # Artifact exports and types
├── chat/
│   ├── canvas.tsx             # Resizable canvas layout (react-resizable-panels)
│   ├── canvas-tabs.tsx        # Tab bar component for multi-tab canvas
│   └── agent-selector.tsx     # Agent selection UI
└── tools/
│   └── load-invoice.tsx       # Invoice UI (auto-opens side panel, shows details)

hooks/
├── use-canvas-tabs.ts         # Multi-tab state management hook
└── ...                        # Other hooks
```

---

## Adding New Features

### Adding a New Agent to UI

1. Define agent in `mastra/agents/`:

```typescript
export const myAgent = new Agent({
  name: "My Agent",
  instructions: "...",
  model: "openai/gpt-4.1",
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

### Adding Document Templates

The template system allows generating structured documents from invoice data. Templates are useful for standardized administrative documents like "Comunicazione di Liquidazione".

#### 1. Create a New Template File

Create a new file in `lib/templates/` (e.g., `my-template.ts`):

```typescript
import {
  createKeywordCondition,
  formatCurrencyItalian,
  formatDateItalian,
  templateRegistry,
} from "./index";
import type { DocumentTemplate, TemplateContext } from "./types";

// Define the template content with {{variableName}} placeholders
const MY_TEMPLATE = `# My Document Title

**Date:** {{DOCUMENT_DATE}}
**Amount:** {{TOTAL_AMOUNT}}

## Supplier Information
- Name: {{SUPPLIER_NAME}}
- VAT ID: {{SUPPLIER_VAT}}
`;

// Map invoice data to template variables
function mapInvoiceToMyTemplate(
  context: TemplateContext
): Record<string, string> {
  const { metadata, validation } = context;
  
  return {
    DOCUMENT_DATE: formatDateItalian(metadata.date),
    TOTAL_AMOUNT: formatCurrencyItalian(metadata.totalAmount),
    SUPPLIER_NAME: metadata.supplier ?? "",
    SUPPLIER_VAT: metadata.supplierVatId ?? "",
  };
}

// Define keywords that trigger this template
const MY_TEMPLATE_KEYWORDS = ["my keyword", "another keyword"];

// Create the template definition
export const myTemplate: DocumentTemplate = {
  id: "my-template",
  name: "My Template Name",
  description: "Description in Italian for the template",
  kind: "text",
  priority: 10, // Higher = more specific
  condition: createKeywordCondition(MY_TEMPLATE_KEYWORDS, true),
  template: MY_TEMPLATE,
  dataMapper: mapInvoiceToMyTemplate,
};

// Register the template
templateRegistry.register(myTemplate);
```

#### 2. Import the Template

Add an import to `artifacts/text/server.ts` to ensure the template is registered:

```typescript
import "@/lib/templates/my-template";
```

#### 3. Template System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE SYSTEM FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  User: "Create liquidazione document"                            │
│                    │                                             │
│                    ▼                                             │
│  ┌──────────────────────────────────┐                           │
│  │   textDocumentHandler            │                           │
│  │   - Check for loaded invoice     │                           │
│  │   - Search for matching template │                           │
│  └──────────────┬───────────────────┘                           │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────┐                           │
│  │   Template Registry              │                           │
│  │   - findTemplate(title, context) │                           │
│  │   - Match by keywords + priority │                           │
│  └──────────────┬───────────────────┘                           │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────┐                           │
│  │   renderTemplate()               │                           │
│  │   - Replace {{placeholders}}     │                           │
│  │   - Use "______" for missing     │                           │
│  └──────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. Template Types Reference

| Type | Description |
|------|-------------|
| `DocumentTemplate` | Main template definition with content and mapper |
| `TemplateContext` | Invoice data available to templates |
| `TemplateDataMapper` | Function mapping context to variables |
| `TemplateCondition` | Function determining if template matches |
| `RenderedTemplate` | Result with content and missing variables |

#### 5. Helper Functions

| Function | Description |
|----------|-------------|
| `createKeywordCondition()` | Create condition matching title keywords |
| `formatDateItalian()` | Format dates as DD/MM/YYYY |
| `formatCurrencyItalian()` | Format amounts as EUR currency |
| `extractYear()` | Extract year from date string |
| `renderTemplate()` | Render template with context |
| `extractTemplateVariables()` | List all placeholders in template |

#### 6. Existing Templates

| Template ID | Name | Keywords |
|-------------|------|----------|
| `liquidation-communication` | Comunicazione di Liquidazione | liquidazione, liquidare, pagamento fattura |

---

## Canvas Tab System

The canvas panel (right side of the application) supports a multi-tab system that allows users to work with multiple documents and widgets simultaneously. The system uses a **Widget Registry Pattern** for extensibility.

### Widget Registry Architecture

The tab system is built on a centralized widget registry that decouples tab management from widget rendering:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WIDGET REGISTRY PATTERN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────┐      ┌──────────────────┐      ┌────────────────┐   │
│   │  Widget Registry │◄─────│  Widget Defs     │      │  CanvasInit    │   │
│   │  (lib/canvas/)   │      │  (definitions)   │      │  (registers)   │   │
│   └────────┬─────────┘      └──────────────────┘      └────────────────┘   │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                        CanvasWidgetContainer                      │     │
│   │  - Looks up widget from registry                                  │     │
│   │  - Wraps with WidgetContextProvider                               │     │
│   │  - Renders the appropriate widget component                       │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│            │                                                                │
│            ▼                                                                │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                         Widget Renderers                            │   │
│   │  DocumentArtifact │ MediaArtifact │ DocumentSelectorArtifact │ ... │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **Widget Registry** | `lib/canvas/widget-registry.ts` | Centralized registry for widget definitions |
| **Widget Context** | `lib/canvas/widget-context.tsx` | Per-tab context provider for state/streaming |
| **Widget Definitions** | `lib/canvas/widget-definitions.tsx` | Built-in widget registrations |
| **CanvasWidgetContainer** | `components/chat/canvas-widget.tsx` | Generic widget container component |
| **CanvasTabs** | `components/chat/canvas-tabs.tsx` | Tab bar UI with accessibility |
| **useCanvasTabs** | `hooks/use-canvas-tabs.ts` | Tab state management hook |

### Widget Kinds

| Kind | Label | Multiple Allowed | Streaming | Icon |
|------|-------|------------------|-----------|------|
| `text` | Documento di testo | Yes | Yes | FileText |
| `code` | Codice | Yes | Yes | Code2 |
| `sheet` | Foglio di calcolo | Yes | Yes | FileSpreadsheet |
| `image` | Immagine | Yes | No | Image |
| `document-selector` | Selettore documenti | No | No | LayoutGrid |

### Widget Definition Structure

```typescript
type WidgetDefinition<TKind, TContent, TMeta> = {
  kind: TKind;                    // Unique identifier
  label: string;                  // Human-readable label
  icon: LucideIcon;               // Tab icon
  renderer: ComponentType<...>;   // React component
  allowMultiple: boolean;         // Can have multiple instances?
  supportsStreaming: boolean;     // Supports content streaming?
  defaultContent?: TContent;      // Default content for new instances
  tabColor?: { ... };             // Tab styling overrides
};
```

### Widget Context

Each tab provides its own context for isolated state management:

```typescript
type WidgetContextValue<TContent, TMeta> = {
  // Identity
  tabId: string;
  documentId: string;
  kind: WidgetKind;
  title: string;
  
  // Content state
  content: TContent;
  setContent: (content: TContent) => void;
  
  // Status
  status: WidgetStatus;
  setStatus: (status: WidgetStatus) => void;
  isPending: boolean;
  isStreaming: boolean;
  isIdle: boolean;
  isError: boolean;
  
  // Actions
  onClose: () => void;
  onTitleChange?: (title: string) => void;
};
```

### Tab State Structure

```typescript
// New typed structure
type CanvasTabData = {
  id: string;           // Unique tab ID
  kind: WidgetKind;     // Widget kind from registry
  documentId: string;   // Document identifier
  title: string;        // Tab title
  content: unknown;     // Widget content
  status: WidgetStatus; // pending | idle | streaming | error
  createdAt: number;    // Creation timestamp
  meta?: unknown;       // Optional metadata
};

// Legacy structure (for backward compatibility)
type CanvasTab = {
  id: string;
  type: 'widget' | 'document' | 'csv';
  title: string;
  artifact: UIArtifact;
  createdAt: number;
};
```

### Usage Examples

**Opening a Tab (Legacy API):**

```typescript
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";

function MyComponent() {
  const { openTab } = useCanvasTabs();

  const handleOpenDocument = () => {
    openTab(
      {
        documentId: "doc-123",
        kind: "text",
        content: "Document content",
        title: "My Document",
        isVisible: true,
        status: "idle",
        boundingBox: { top: 0, left: 0, width: 300, height: 200 },
      },
      "My Document"
    );
  };
}
```

**Opening a Tab (New API):**

```typescript
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";

function MyComponent() {
  const { openTabWithData } = useCanvasTabs();

  const handleOpenDocument = () => {
    openTabWithData({
      kind: "text",
      documentId: "doc-123",
      title: "My Document",
      content: "Document content",
      status: "idle",
      
    });
  };
}
```

**Closing a Tab:**

```typescript
const { closeTab, activeTab } = useCanvasTabs();

if (activeTab) {
  closeTab(activeTab.id);
}
```

**Updating Tab Content:**

```typescript
const { updateTabContent, updateTabStatus } = useCanvasTabs();

// Update content
updateTabContent(tabId, newContent);

// Update status
updateTabStatus(tabId, "streaming");
```

### Registering a Custom Widget

To add a new widget type:

```typescript
// 1. Create a widget renderer component
function MyWidgetRenderer({ documentId, title, content, status, onContentChange }: WidgetRendererProps<MyContent>) {
  return <div>My widget content</div>;
}

// 2. Define the widget
const myWidgetDefinition: WidgetDefinition<"my-widget", MyContent> = {
  kind: "my-widget",
  label: "My Widget",
  icon: MyIcon,
  renderer: MyWidgetRenderer,
  allowMultiple: true,
  supportsStreaming: false,
};

// 3. Register in lib/canvas/widget-definitions.tsx
widgetRegistry.register(myWidgetDefinition);
```

### Accessibility Features

The tab system includes comprehensive accessibility support:

- **ARIA roles**: `tablist`, `tab`, `tabpanel` with proper `aria-selected`, `aria-controls`, `aria-labelledby`
- **Keyboard navigation**:
  - `Arrow Left/Right`: Navigate between tabs
  - `Home/End`: Jump to first/last tab
  - `Delete/Backspace`: Close current tab
  - `Enter/Space`: Activate tab
- **Mouse interactions**:
  - `Left click`: Select/activate tab
  - `Middle click`: Close tab
  - `Scroll wheel`: Horizontal scroll over tabs when there are many open tabs
- **Focus management**: Focus moves to adjacent tab on close
- **Screen reader support**: Status indicators and labels

### Tab Closing Behavior

When a tab is closed:
1. The tab is removed from the list
2. All tabs to the right shift left to fill the gap
3. If the closed tab was active, the adjacent tab (preferring right, then left) becomes active
4. Focus moves to the newly active tab if the user was navigating with keyboard
5. The document ID is recorded in `closedDocuments` to prevent auto-reopening

### Closed-by-User Tracking

The tab system tracks which documents were explicitly closed by the user to prevent auto-reopening. This prevents a frustrating bug where closed tabs would immediately reopen due to streaming events or widget renders.

**State Structure:**

```typescript
type CanvasTabsState = {
  tabs: CanvasTab[];
  activeTabId: string | null;
  closedDocuments?: Record<string, boolean>;  // documentId -> closedByUser
};
```

**Helper Functions:**

| Function | Purpose |
|----------|---------|
| `wasDocumentClosedByUser(documentId)` | Check if user closed this document's tab |
| `clearDocumentClosedFlag(documentId)` | Clear the flag to allow re-opening |

**Behavior:**
- When user closes a tab → `closedDocuments[documentId] = true`
- When streaming `data-id` arrives → Skip tab creation if `wasDocumentClosedByUser(documentId)`
- When user clicks chat widget → Call `clearDocumentClosedFlag(documentId)` then open tab

**Example - Explicit Re-open:**

```typescript
import { clearDocumentClosedFlag, useCanvasTabs } from "@/hooks/use-canvas-tabs";

const { openTab } = useCanvasTabs();

const handleReopen = (documentId: string) => {
  clearDocumentClosedFlag(documentId);  // Allow opening this document again
  openTab({ documentId, kind: "text", ... }, "My Document");
};
```

### Auto-Opening Tabs During Document Streaming

The canvas tab system uses a **"pending tab" pattern** that opens tabs IMMEDIATELY when a document tool starts executing—before the document ID is even known from the backend. This ensures users see the canvas open instantly without any delay.

**Important:** All auto-open logic respects the closed-by-user flag. If the user has explicitly closed a document's tab, it will NOT auto-reopen from streaming events.

**For `createDocument`:**
1. Tool-call appears in chat → Tab opens immediately in "pending" state
2. Tab shows "Preparing..." with a pulsing blue indicator
3. When `data-id` arrives from stream → Tab is bound to actual document ID (unless user closed it)
4. Content streams in real-time as `data-textDelta` events arrive
5. When `data-finish` arrives → Tab transitions to "idle" state

**For `updateDocument`:**
1. Tool-call appears → Existing tab is activated and set to "streaming"
2. If tab was closed by user → Tab is NOT auto-reopened (respects user choice)
3. Content streams directly to the existing tab (if open)
4. Chat widget always shows (user can click to explicitly re-open)

### Widget Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Widget Status Lifecycle                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "pending"          "streaming"           "idle"           "error"          │
│  ┌───────┐          ┌─────────┐          ┌──────┐         ┌───────┐        │
│  │ Blue  │  data-id │ Amber   │ data-    │ Ready │  error  │ Error │        │
│  │ pulse ├─────────►│ pulse   ├──────────►│      │────────►│       │        │
│  │       │          │         │  finish  │      │         │       │        │
│  └───────┘          └─────────┘          └──────┘         └───────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Streaming Content Architecture

The streaming architecture uses a **single source of truth** pattern with SWR for state management and a **pending tab binding** mechanism for immediate feedback:

```
Immediate Tab Opening Flow:
┌──────────────────────┐
│  DocumentTool        │  (detects tool-call start before output)
│  components/tools/   │
│  document.tsx        │
└──────────┬───────────┘
           │ openPendingTab(toolCallId, kind, title)
           ▼
┌──────────────────────┐
│  Tab State (SWR)     │  ← Tab created with "pending-{toolCallId}" documentId
│  status: "pending"   │
└──────────────────────┘

Stream Binding Flow:
┌──────────────────────┐
│  DataStreamProvider  │  (receives stream parts from server)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐    ┌──────────────────────┐
│ useArtifactStreaming │    │   useTabStreamSync   │
│  (global artifact)   │    │  (binds pending tab) │
└──────────────────────┘    └──────────┬───────────┘
                                       │
                                       │ data-id → bindPendingTabToDocument()
                                       │ data-*Delta → mutateTabByDocumentId()
                                       │ (text, code, sheet)
                                       ▼
                           ┌──────────────────────┐
                           │  Tab State (SWR)     │  ← Now has real documentId
                           │  "canvas-tabs" key   │     status: "streaming"
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ WidgetContextProvider│  (passes content as props)
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │  DocumentArtifact    │  (displays streaming content)
                           └──────────────────────┘
```

**Key Components:**

| Component | File | Responsibility |
|-----------|------|----------------|
| `openPendingTab` | `hooks/use-canvas-tabs.ts` | Creates tab with temporary `pending-{toolCallId}` ID |
| `bindPendingTabToDocument` | `hooks/use-canvas-tabs.ts` | Binds pending tab to actual document ID when known |
| `activateTabForStreaming` | `hooks/use-canvas-tabs.ts` | Activates existing tab and sets to streaming (for updates) |
| `useTabStreamSync` | `hooks/use-artifact-streaming.ts` | Subscribes to stream parts, binds pending tabs, updates content |
| `DocumentTool` | `components/tools/document.tsx` | Opens pending tab immediately when tool-call starts |
| `mutateTabByDocumentId` | `hooks/use-canvas-tabs.ts` | Direct SWR mutation function for updating tabs by documentId |

**Stream Events Handled:**

| Event Type | Handler Action |
|------------|----------------|
| `data-id` | **Binds pending tab** to actual document ID, transitions to "streaming" |
| `data-textDelta` | Appends text content and updates tab (for text documents) |
| `data-codeDelta` | Appends code content and updates tab (for code documents) |
| `data-sheetDelta` | Appends sheet/CSV content and updates tab (for sheet documents) |
| `data-title` | Updates tab title |
| `data-clear` | Clears content |
| `data-finish` | Sets tab status to "idle" |

**Note:** All content delta types (`data-textDelta`, `data-codeDelta`, `data-sheetDelta`) are handled uniformly by `useTabStreamSync`. This ensures that text, code, and sheet documents all stream correctly with the same incremental update behavior.

**Guaranteed Status Transitions:**

Both `createDocumentTool` and `updateDocumentTool` use `try/finally` blocks to ensure `data-finish` is always emitted, even if an error occurs during document generation. This guarantees that:
- Tabs never get stuck in "streaming" or "pending" status
- The UI always transitions from "Generating..." to a completed state
- Users don't need to manually close and reopen tabs to see the final content

This architecture ensures:
- **Instant feedback**: Tab opens immediately when user requests a document (no waiting for backend)
- **Real-time streaming**: Content appears character-by-character as it streams
- **Visible updates**: `updateDocument` streams to existing tab without requiring manual re-open
- **No race conditions**: Direct SWR mutations avoid useEffect sync issues
- **Consistent state**: Tab state is always the source of truth
- **Proper status**: Pending → Streaming → Idle transitions are visually distinct
- **Reliable completion**: `data-finish` is always emitted via try/finally pattern

### Pending Document ID Handling

Pending document IDs (format: `pending-{toolCallId}`) are temporary placeholders used during the streaming phase before the real document ID arrives from the backend. These IDs are handled specially throughout the system:

**Frontend Safeguards:**

1. **`useChatDocument` hook** (`hooks/use-chat-document.ts`): Skips API fetches for pending IDs using `isPendingDocumentId()` from `lib/canvas`. This prevents unnecessary `/api/document?id=pending-*` requests that would fail.

2. **`DocumentTool` component** (`components/tools/document.tsx`): Includes a fallback binding mechanism that calls `bindPendingTabToDocument()` once the tool output contains the real document ID. This handles edge cases where the `data-id` stream event was processed before the pending tab existed.

3. **`useTabStreamSync` hook** (`hooks/use-artifact-streaming.ts`): Primary binding mechanism that listens for `data-id` events and binds pending tabs to real document IDs during streaming.

**Backend Safeguards:**

The `/api/document` GET endpoint (`app/(chat)/api/document/route.ts`) validates document IDs before querying the database:

1. **UUID validation**: Only valid UUID v4 format IDs are accepted. Pending IDs (which don't match UUID format) are rejected with a `400 Bad Request` response.

2. **Error handling**: Database errors from `getDocumentsById` are caught and converted to structured `ChatSDKError` responses instead of surfacing as 500 errors.

```typescript
// UUID v4 validation regex
const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

// Invalid IDs return 400 instead of hitting the database
if (!isValidUUID(id)) {
  return new ChatSDKError("bad_request:document", "Invalid document id format").toResponse();
}
```

**Flow Summary:**

```
1. Tool starts → DocumentTool opens pending tab with "pending-{toolCallId}"
2. Stream starts → useTabStreamSync receives "data-id" with real UUID
3. Binding occurs → pendingTab.documentId changes from "pending-xxx" to real UUID
4. Fallback → DocumentTool also attempts binding when tool output arrives (idempotent)
5. Content streams → useChatDocument starts fetching with real UUID
6. Finish → Tab status transitions to "idle"
```

This multi-layered approach ensures:
- No database errors from invalid pending IDs
- Tabs always get bound to real document IDs
- Content displays correctly without manual refresh

### File Structure

```
lib/canvas/
├── index.ts                    # Public exports
├── widget-registry.ts          # Registry singleton, types, and pending ID helpers
│   ├── WidgetStatus            # "pending" | "idle" | "streaming" | "error"
│   ├── isPendingDocumentId()   # Check if ID is a pending ID
│   └── generatePendingDocumentId() # Create pending-{toolCallId} ID
├── widget-context.tsx          # Per-tab context provider (props-based, no local state)
└── widget-definitions.tsx      # Built-in widget definitions

hooks/
├── use-canvas-tabs.ts          # Tab state management (SWR-based)
│   ├── useCanvasTabs()         # Main hook
│   ├── openPendingTab()        # Open tab before document ID is known
│   ├── bindPendingTabToDocument() # Bind pending tab to actual ID
│   ├── activateTabForStreaming() # Activate existing tab for updates
│   ├── findPendingTab()        # Find any pending tab
│   ├── mutateTabByDocumentId() # Direct mutation for streaming
│   └── getTabsState()          # Get current state synchronously
└── use-artifact-streaming.ts   # Streaming handlers
    ├── useArtifactStreaming()  # Global artifact state updates
    └── useTabStreamSync()      # Binds pending tabs and syncs content

components/chat/
├── canvas.tsx                  # Resizable panel layout
├── canvas-tabs.tsx             # Tab bar component (with pending state UI)
└── canvas-widget.tsx           # Generic widget container

components/
└── canvas-init.tsx             # Widget registration initializer
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

**Symptom**: Console error "Encountered two children with the same key" when switching documents in the side panel, or multiple instances of the same widget appearing in chat.

**Causes and Fixes**:

1. **Same MessageIterator in multiple places**: The `MessageIterator` component accepts an optional `keyPrefix` prop. Use different prefixes when rendering messages in multiple locations:

```typescript
// In assistant-chat.tsx
const renderMessages = (keyPrefix?: string) => (
  <MessageIterator empty={chatEmpty} keyPrefix={keyPrefix}>
    {/* ... render props - do NOT add key prop to child components */}
  </MessageIterator>
);

// Main thread
<ChatThreadContent>{renderMessages("main")}</ChatThreadContent>

// Canvas thread
<ChatThreadContent>{renderMessages("canvas")}</ChatThreadContent>
```

2. **Duplicate messages in the AI SDK stream**: The `MessageIterator` now includes automatic deduplication by message ID to handle cases where the AI SDK provides duplicate messages during streaming:

```typescript
// In iterators.tsx - messages are deduplicated before rendering
const uniqueMessages = useMemo(() => {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}, [messages]);
```

3. **Redundant key props on child components**: Do NOT add `key={message.id}` to `UserMessage` or `AssistantMessage` inside the `MessageIterator` render function - the parent Fragment already provides a unique key.

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

### 7. Assistant Avatar Image Not Displaying Fix

**File**: `components/messages/assistant-message.tsx`

**Issue**: The Faenza logo (`/images/logo-faenza.jpg`) was not displaying next to assistant messages. The terminal showed the error: `The requested resource isn't a valid image for /images/logo-faenza.jpg received null`.

**Cause**: Next.js's image optimization was failing to process the local JPG image, returning `null` during the optimization process.

**Fix**: Added the `unoptimized` prop to the Next.js `Image` component to bypass the image optimizer:

```tsx
<Image
  alt="Assistente Comune di Faenza"
  className="size-8 rounded-full object-cover"
  height={32}
  src="/images/logo-faenza.jpg"
  unoptimized  // Added to bypass failing optimization
  width={32}
/>
```

### 8. Multiple Document Widgets Accumulation Fix

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

### 9. Canvas Tab System Fixes

**Files**: `components/chat/canvas-tabs.tsx`, `components/tools/document.tsx`, `hooks/use-artifact-streaming.ts`

**Issues Fixed**:

1. **Active Tab Color Not Green**: Document and CSV tabs showed grey background when active instead of green.
   - **Fix**: Updated `TAB_TYPE_COLORS` to use `bg-emerald-500` for active state on all tab types.

2. **Space Between Tabs After Close**: When closing a tab and opening a new one, there was a ghost space where the closed tab used to be.
   - **Fix**: Changed `AnimatePresence` mode from `"popLayout"` to `"sync"` and removed `layoutId` from tab motion elements to prevent animation conflicts.

3. **Documents Not Auto-Opening in Tab**: When requesting a document, users had to manually click to open it in a tab.
   - **Fix**: Added auto-open logic to the `DocumentTool` component using a `useEffect` hook. This approach is more reliable than the streaming hook because it has direct access to the tool state and streaming status.

```typescript
// In components/tools/document.tsx
const autoOpenedRef = useRef<string | null>(null);

useEffect(() => {
  if (
    isStreaming &&
    isLastPart &&
    documentId &&
    part.output &&
    "id" in part.output &&
    !isDocumentInTab &&
    autoOpenedRef.current !== documentId
  ) {
    autoOpenedRef.current = documentId;
    openTab({ documentId, kind, content: "", title, status: "streaming", ... }, title);
  }
}, [isStreaming, isLastPart, documentId, part.output, isDocumentInTab, openTab]);
```

4. **Duplicate Document Widgets in Chat**: When AI calls both `createDocument` and `updateDocument`, both tool widgets showed as full-size cards.
   - **Fix**: Changed `isDocumentInTab` to check if the document exists in ANY tab, not just the active tab:

```typescript
// Before
const isDocumentInTab = hasOpenTabs && activeTab?.artifact.documentId === documentId;

// After
const isDocumentInTab = useMemo(
  () => tabs.some((tab) => tab.artifact.documentId === documentId),
  [tabs, documentId]
);
```

### 10. Update Document Streaming Fix

**File**: `mastra/tools/update-document-tool.ts`

**Issue**: The "Update Document" tool caused infinite loading indicators in the UI because it failed to emit `data-id` events. Without the document ID, the client-side streaming synchronization (`useTabStreamSync`) couldn't route the `data-finish` event to the correct tab, leaving the tab status stuck in "streaming".

**Fix**: Added `data-id` emission to `updateDocumentTool`:

```typescript
await writer?.write({
  type: "data-id",
  data: id,
  transient: true,
});
```

### 11. Duplicate Widget Prevention

**File**: `components/tools/document.tsx`

**Issue**: When the AI agent called both `createDocument` and `updateDocument` in sequence, duplicate widgets appeared in the chat. The user would see "Creating document..." followed by "Updating document..." which was redundant since the document was already visible in the side panel.

**Fix**: Modified `DocumentTool` to hide the widget if the tool is `updateDocument` AND the document is already open in a tab. This "Show, don't tell" approach relies on the visible side panel updating in real-time instead of cluttering the chat.

```typescript
const toolName = getToolName(part);
if (toolName === "updateDocument" && isDocumentInTab) {
  return null;
}
```

### 12. Document Streaming UI Persistence Fix

**File**: `components/tools/document.tsx`

**Issue**: The streaming UI (loading spinner, "Generating content..." text, pulsing blue dot) in the document chat widget persisted even after the document was fully generated. This happened because `isGenerating` relied on the chat-level `isStreaming` prop (from `useChat` status), which remains `true` as long as the overall chat is streaming—including any text the AI generates after the tool call completes.

**Fix**: Updated the `isGenerating` calculation to use the tab's actual `status` (which is correctly set to `"idle"` by `useTabStreamSync` when `data-finish` is received) once the tool has completed (i.e., when `part.output` exists).

```typescript
// Before: Always relied on chat-level isStreaming
const isGenerating =
  isStreaming ||
  (activeTab?.artifact.documentId === documentId &&
    activeTab?.artifact.status === "streaming");

// After: Use tab's actual status once tool completes
const documentTab = useMemo(
  () => tabs.find((tab) => tab.artifact.documentId === documentId),
  [tabs, documentId]
);

const hasToolOutput = Boolean(part.output);
const isTabStreaming = documentTab?.artifact.status === "streaming";

const isGenerating = hasToolOutput
  ? isTabStreaming  // After tool completes, use tab's actual status
  : isStreaming;    // Before tool completes, use chat streaming status
```

**Important**: All hooks must be called before any conditional returns to comply with React's Rules of Hooks. The component uses a `shouldHideWidget` flag that is computed after all hooks, and the conditional `return null` happens after all `useEffect` and `useCallback` hooks are called. This prevents the "Rendered fewer hooks than expected" error.

### 13. Document Selector Auto-Open Fix

**File**: `components/tools/load-invoice.tsx`

**Issue**: When requesting to see all available documents, the document selector canvas tab did not open automatically. Users had to manually click the "Documenti Disponibili" widget to open the panel.

**Fix**: Added a `useEffect` hook that automatically opens the document selector panel when files are returned from the `loadInvoice` tool. Uses a signature-based tracking system to prevent re-opening on re-renders while allowing new file sets to trigger a fresh auto-open.

```typescript
// Track which file set we've already auto-opened the panel for
const autoOpenedForSignatureRef = useRef<string | null>(null);

// Create a signature for the current file set
const filesSignature = useMemo(() => {
  if (!filesWithValidation) return null;
  return `${filesWithValidation.length}:${filesWithValidation[0]?.fileId || ""}`;
}, [filesWithValidation]);

// AUTO-OPEN: When files are available, automatically open the document selector panel
useEffect(() => {
  if (!filesWithValidation || !filesSignature) return;
  if (autoOpenedForSignatureRef.current === filesSignature) return;
  
  autoOpenedForSignatureRef.current = filesSignature;
  openTab({ ... }, "UI fatture");
}, [filesWithValidation, filesSignature, openTab]);
```

**UX Behavior**:
- When user asks to see documents, the panel opens automatically
- The widget in chat remains as a fallback to re-open if panel is closed
- Signature-based tracking prevents duplicate openings on re-renders

### 14. Document Streaming and Status Transition Fix

**Files**: `hooks/use-artifact-streaming.ts`, `hooks/use-canvas-tabs.ts`, `mastra/tools/create-document-tool.ts`, `mastra/tools/update-document-tool.ts`, `components/artifacts/document.tsx`

**Issues Fixed**:

1. **Content not streaming incrementally**: Documents (especially code and sheet types) showed all content at once instead of streaming character-by-character.
   - **Cause**: `useTabStreamSync` only handled `data-textDelta` events, ignoring `data-codeDelta` and `data-sheetDelta`.
   - **Fix**: Updated `useTabStreamSync` to handle all three delta types uniformly.

2. **Documents stuck in "Generating" state**: After document generation completed, the UI continued showing "Generating..." indefinitely.
   - **Cause**: If `data-finish` wasn't emitted (due to errors) or wasn't properly routed to the tab, the status never transitioned to "idle".
   - **Fix**: 
     - Wrapped document handler calls in `try/finally` blocks to guarantee `data-finish` emission
     - Added defensive fallback in `useTabStreamSync` to reset pending tabs on `data-finish` even without a known documentId

3. **Timing race condition between tab creation and stream events**: Stream events (`data-id`, `data-textDelta`) could arrive BEFORE the pending tab was created by `DocumentTool`'s useEffect.
   - **Cause**: The `DocumentTool` component opens pending tabs in a `useEffect`, which runs after the component renders. However, stream events from the backend can arrive before React's useEffect phase completes. Additionally, for fast-completing tools, by the time `DocumentTool` renders, `part.output` already exists, causing the pending tab creation effect to be skipped entirely.
   - **Fix**: Implemented multi-layered timing resilience:
     - `mutateTabByDocumentId` now returns `boolean` indicating if a tab was found
     - On content delta events, if the update fails (no tab found), the hook attempts to bind any pending tab first, then retries
     - Added `resetAllStreamingTabs()` helper that resets ALL tabs with "streaming" or "pending" status to "idle"
     - On `data-finish`, this helper is called as a defensive fallback to ensure no tabs get stuck
     - **Direct tab creation in `useTabStreamSync`**: When `data-id` arrives and no pending tab exists, creates a tab directly with buffered metadata (`data-kind`, `data-title`)
     - **Fallback tab creation in `DocumentTool`**: Third effect creates a tab when tool output arrives but no tab exists for that document yet

**Key Changes:**

```typescript
// hooks/use-canvas-tabs.ts - mutateTabByDocumentId now returns success status
export function mutateTabByDocumentId(...): boolean {
  let didUpdate = false;
  // ... mutation logic sets didUpdate = true if tab found
  return didUpdate;
}

// hooks/use-canvas-tabs.ts - new helper to reset stuck tabs
export function resetAllStreamingTabs(): number {
  // Finds all tabs with status "streaming" or "pending"
  // Resets them to "idle"
  // Returns count of tabs reset
}

// hooks/use-artifact-streaming.ts - retry logic in useTabStreamSync
const updateTabWithRetry = (docId, updates) => {
  let success = mutateTabByDocumentId(docId, updates);
  if (!success && !tabBoundRef.current) {
    // Try binding pending tab first, then retry
    const didBind = tryBindPendingTab(docId);
    if (didBind) {
      success = mutateTabByDocumentId(docId, updates);
    }
  }
  return success;
};

// hooks/use-artifact-streaming.ts - direct tab creation when no pending tab exists
case "data-id": {
  const actualDocId = delta.data;
  const didBind = tryBindPendingTab(actualDocId);
  if (!didBind) {
    // No pending tab - create one directly with buffered metadata
    const kind = pendingKindRef.current || "text";
    const title = pendingTitleRef.current || "Document";
    openPendingTab(`stream-${actualDocId.slice(0, 8)}`, kind, title);
    bindPendingTabToDocument(pendingId, actualDocId);
  }
  break;
}

// components/tools/document.tsx - fallback effect for fast-completing tools
useEffect(() => {
  if (!isCreateDocument || !documentId) return;
  if (relatedTab?.artifact.documentId === documentId) return;
  // No tab exists - create one directly with actual document ID
  openTab({ documentId, kind, ... }, title);
}, [documentId, relatedTab, ...]);
```

**Manual Testing Steps:**

To verify document streaming works correctly:

1. **Text Document Creation**:
   - Ask the assistant to "Write a short article about climate change"
   - Verify: Tab opens immediately, content streams in character-by-character, "Generating..." indicator clears when done

2. **Code Document Creation**:
   - Ask the assistant to "Create a Python function to calculate fibonacci numbers"
   - Verify: Same streaming behavior as text documents

3. **Sheet Document Creation**:
   - Ask the assistant to "Create a spreadsheet with monthly sales data"
   - Verify: Same streaming behavior as text documents

4. **Document Update**:
   - After creating a document, ask "Add more details to the document"
   - Verify: Existing tab activates, content updates with streaming, status transitions correctly

5. **Tab Status Indicators**:
   - During streaming: Blue pulsing dot in chat widget, "Generating..." in tab header
   - After completion: Static file icon in chat widget, "Updated X ago" in tab header

6. **Rapid Document Requests** (tests timing fix):
   - Quickly request multiple documents in succession
   - Verify: All tabs open correctly, no stuck "Generating..." states, content streams properly

### 15. Streaming Performance Optimization

**Files**: `hooks/use-artifact-streaming.ts`, `hooks/use-canvas-tabs.ts`, `components/assistant-chat.tsx`

**Issue**: When sub-agents started streaming, the page became unresponsive. This was caused by:
1. Content updates triggering SWR mutations on every stream delta (multiple times per second)
2. Double message rendering in both main thread and canvas thread
3. Non-memoized filter functions causing re-subscriptions

**Fixes Applied**:

1. **Throttled Content Updates** (`hooks/use-artifact-streaming.ts`):
   - Added 50ms throttle interval for tab content updates
   - Content deltas are accumulated and flushed at a controlled rate
   - Final content is always flushed on `data-finish`

```typescript
const CONTENT_UPDATE_THROTTLE_MS = 50;

const scheduleContentUpdate = useCallback(() => {
  const now = Date.now();
  const timeSinceLastFlush = now - lastFlushTimeRef.current;

  // If enough time has passed, flush immediately
  if (timeSinceLastFlush >= CONTENT_UPDATE_THROTTLE_MS) {
    flushContentUpdate();
    return;
  }

  // Otherwise, schedule a flush
  if (!flushPendingRef.current) {
    flushPendingRef.current = true;
    throttleTimerRef.current = setTimeout(flushContentUpdate, delay);
  }
}, [flushContentUpdate]);
```

2. **Memoized Filter Functions** (`hooks/use-artifact-streaming.ts`):
   - Moved stream filter function outside component to prevent recreation on every render
   - Both `useArtifactStreaming` and `useTabStreamSync` use the same stable filter reference

```typescript
// Stable filter function defined outside component
const filterDataStreamParts = (part: { type: string }) =>
  part.type.startsWith("data-");
```

3. **Early-Exit Optimization** (`hooks/use-canvas-tabs.ts`):
   - Added cache-based early-exit to `mutateTabByDocumentId`
   - Skips SWR mutation entirely if no tabs exist or no matching documentId
   - Reduces unnecessary iterations during non-document streaming

4. **Conditional Canvas Thread Rendering** (`components/assistant-chat.tsx`):
   - Canvas thread messages are only rendered when user interacts with the canvas
   - Uses `canvasThreadActive` state triggered by `onMouseEnter` or `onFocus`
   - Shows lightweight placeholder until activated, preventing double-rendering during streaming

```typescript
const [canvasThreadActive, setCanvasThreadActive] = useState(false);

// In canvas thread:
<ChatThreadContent
  onFocus={() => setCanvasThreadActive(true)}
  onMouseEnter={() => setCanvasThreadActive(true)}
>
  {canvasThreadActive ? (
    <MessageIterator ... />
  ) : (
    <div className="...">
      {messages.length} messages
    </div>
  )}
</ChatThreadContent>
```

5. **Memoized Canvas Thread Placeholder and Event Handlers** (`components/assistant-chat.tsx`):
   - Event handlers (`onFocus`, `onMouseEnter`) are memoized with `useCallback` to prevent `ChatThreadContent` re-renders
   - The placeholder component is memoized with `React.memo` and custom comparison to only re-render when `messageCount` changes
   - This prevents the canvas thread from re-rendering on every text streaming update

```typescript
// Memoized event handlers
const handleCanvasThreadFocus = useCallback(() => {
  setCanvasThreadActive(true);
}, []);

const handleCanvasThreadMouseEnter = useCallback(() => {
  setCanvasThreadActive(true);
}, []);

// Memoized placeholder component
const CanvasThreadPlaceholder = memo(
  function CanvasThreadPlaceholder({ messageCount }: { messageCount: number }) {
    return (
      <div className="...">
        <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.messageCount === nextProps.messageCount
);
```

**Impact**: These optimizations significantly reduce re-renders during sub-agent streaming, preventing page unresponsiveness when invoice analysis or other sub-agent operations are in progress.

### 16. Non-Blocking Invoice Analysis Streaming

**Files**: `components/chat/context.tsx`, `components/chat/iterators.tsx`, `components/messages/assistant-message.tsx`, `components/messages/user-message.tsx`, `components/tools/load-invoice.tsx`

**Issue**: When the Invoice Analyzer sub-agent streams a long answer token by token, each token caused:
1. A state update in the chat layer
2. A re-render of the entire chat tree
3. Secondary re-renders of tools and canvas widgets

This made the UI feel "blocked" during invoice analysis on larger screens (chat + canvas + tools).

**Solution**: Combined React transitions with aggressive component memoization:

1. **Low-Priority Streaming Updates** (`components/chat/context.tsx`):
   - Wrapped `setDataStream` in `startTransition` to deprioritize artifact streaming updates
   - Usage feedback (`data-usage`) stays synchronous for UI responsiveness

```typescript
import { startTransition } from "react";

onData(dataPart) {
  // Wrap data stream updates in startTransition for non-blocking streaming
  startTransition(() => {
    setDataStream((ds) => (ds ? [...ds, dataPart] : [dataPart]));
  });
  // Usage update stays synchronous (important for UI feedback)
  if (dataPart.type === "data-usage") {
    setUsage(dataPart.data);
  }
},
```

2. **Deferred Message Rendering** (`components/chat/iterators.tsx`):
   - Added `useDeferredValue` for the messages array
   - Allows React to skip intermediate states during rapid token delivery

```typescript
import { useDeferredValue } from "react";

const { messages, status } = useChat({ chat: runtime.chat });
const deferredMessages = useDeferredValue(messages);
```

3. **Memoized Message Components**:
   - `AssistantMessage` (`components/messages/assistant-message.tsx`)
   - `UserMessage` (`components/messages/user-message.tsx`)
   - Both use `React.memo` with custom comparators and `fast-deep-equal` for deep message comparison

```typescript
import { memo } from "react";
import equal from "fast-deep-equal";

export const AssistantMessage = memo(PureAssistantMessage, (prev, next) => {
  return (
    equal(prev.message, next.message) &&
    prev.isStreaming === next.isStreaming &&
    prev.isLastMessage === next.isLastMessage &&
    prev.isReadonly === next.isReadonly &&
    prev.vote?.isUpvoted === next.vote?.isUpvoted
  );
});
```

4. **Memoized Tool Component** (`components/tools/load-invoice.tsx`):
   - `LoadInvoiceTool` wrapped with `React.memo` and deep equality comparison for `part` prop

**Impact**: During Invoice Analyzer streaming:
- UI interactions (scroll, click, resize) remain snappy
- React is allowed to deprioritize streaming updates
- Only the streaming message component re-renders per token
- Heavy components (`LoadInvoiceTool`, `DocumentSelectorArtifact`, canvas tabs) remain stable

### 17. Multiple Document Streaming Fix

**Files**: `hooks/use-artifact-streaming.ts`, `hooks/use-canvas-tabs.ts`, `components/tools/document.tsx`

**Issue**: When creating multiple documents in sequence, only the first document streamed live into the canvas tab. For subsequent documents, a new tab opened but content didn't stream in real-time - it only appeared at the end or after manually interacting with the chat widget.

**Root Cause**: The streaming pipeline treated each `createDocument` call as part of a continuous session rather than independent sessions:

1. `findPendingTab()` returned any pending tab, not the one for the current stream
2. Session state (refs) could carry over between document sessions
3. Fallback tab creation used synthetic IDs that didn't match `DocumentTool`'s expected pending IDs
4. SWR cache wasn't always updated synchronously after binding operations

**Key Changes:**

1. **New `findMostRecentPendingTab()` function** (`hooks/use-canvas-tabs.ts`):
   - Returns the most recently created pending tab (based on `createdAt`)
   - Critical for multi-document streaming where multiple pending tabs may exist briefly

```typescript
export function findMostRecentPendingTab(): CanvasTab | null {
  const state = getTabsState();
  const pendingTabs = state.tabs.filter((tab) =>
    isPendingDocumentId(tab.artifact.documentId)
  );

  if (pendingTabs.length === 0) return null;

  // Return the newest pending tab
  return pendingTabs.reduce((newest, tab) =>
    tab.createdAt > newest.createdAt ? tab : newest
  );
}
```

2. **Refactored `useTabStreamSync`** (`hooks/use-artifact-streaming.ts`):
   - Each `data-id` event starts a completely fresh streaming session
   - Removed `tabBoundRef` guard that prevented retry attempts
   - Always retries binding on content delta failures

```typescript
// Each data-id resets ALL session state
case "data-id": {
  const actualDocId = delta.data;

  // Cancel previous timers
  if (throttleTimerRef.current) {
    clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = null;
  }

  // Fresh session state
  streamingDocumentIdRef.current = actualDocId;
  accumulatedContentRef.current = "";
  flushPendingRef.current = false;
  lastFlushTimeRef.current = 0;

  // Bind most recent pending tab
  const didBind = tryBindPendingTab(actualDocId);
  // ... handle binding or create fallback tab
}
```

3. **Cache synchronization in `bindPendingTabToDocument`** (`hooks/use-canvas-tabs.ts`):
   - Now calls `updateCacheReference()` after mutation
   - Ensures subsequent `peekTabsState()` calls see updated documentId immediately

```typescript
export function bindPendingTabToDocument(pendingDocId, actualDocId): boolean {
  globalMutate<CanvasTabsState>(CANVAS_TABS_KEY, (current) => {
    // ... update tab ...
    const newState = { ...currentState, tabs: updatedTabs };
    updateCacheReference(newState);  // Critical for cache sync
    return newState;
  }, { revalidate: false });
  return didBind;
}
```

4. **Enhanced `DocumentTool` component** (`components/tools/document.tsx`):
   - Tracks toolCallId changes to ensure clean state
   - Three-layer fallback system for tab creation

**Behavior After Fix:**

For each `createDocument` call:
1. `DocumentTool` opens pending tab (`pending-{toolCallId}`) immediately
2. `data-id` event resets session state and binds the most recent pending tab
3. `data-textDelta` events stream content to the correct tab
4. `data-finish` marks tab as idle and fully resets for next document
5. Next `data-id` starts completely fresh - no interference from previous sessions

**Manual Testing:**

1. Ask the assistant to "Create 3 short documents: one about cats, one about dogs, and one about birds"
2. Verify: Each document gets its own tab, all three stream live, no stuck states

### 18. Document Streaming Visibility Fix (Sheet and Code)

**Files**: `artifacts/sheet/server.ts`, `artifacts/code/server.ts`, `artifacts/sheet/client.tsx`, `artifacts/code/client.tsx`

**Issue**: Only text documents showed streaming progress to the user. When creating sheet (CSV) or code documents, the document appeared to be created instantly at the end instead of streaming character-by-character like text documents.

**Root Cause**: Two inconsistencies between the text document handler (which worked correctly) and the sheet/code handlers:

1. **Server-side**: Sheet and Code handlers used `dataStream.write()` instead of `dataStream.custom()`:
   ```typescript
   // Broken (sheet/code)
   await dataStream.write({ type: "data-sheetDelta", ... });
   
   // Working (text)
   await dataStream.custom({ type: "data-textDelta", ... } as any);
   ```

2. **Client-side**: Sheet and Code handlers REPLACED content instead of APPENDING:
   ```typescript
   // Broken (sheet/code)
   content: streamPart.data  // Replaces entire content
   
   // Working (text)
   content: draftArtifact.content + streamPart.data  // Appends
   ```

**Fix Applied**:

1. Updated `artifacts/sheet/server.ts` to use `dataStream.custom()`:
   ```typescript
   await dataStream.custom({
     type: "data-sheetDelta",
     data: chunk,
     transient: true,
   } as any);
   ```

2. Updated `artifacts/code/server.ts` to use `dataStream.custom()`:
   ```typescript
   await dataStream.custom({
     type: "data-codeDelta",
     data: chunk,
     transient: true,
   } as any);
   ```

3. Updated `artifacts/sheet/client.tsx` to append content:
   ```typescript
   setArtifact((draftArtifact) => ({
     ...draftArtifact,
     content: draftArtifact.content + streamPart.data,
     isVisible:
       draftArtifact.status === "streaming" &&
       draftArtifact.content.length > 400 &&
       draftArtifact.content.length < 450
         ? true
         : draftArtifact.isVisible,
     status: "streaming",
   }));
   ```

4. Updated `artifacts/code/client.tsx` to append content:
   ```typescript
   setArtifact((draftArtifact) => ({
     ...draftArtifact,
     content: draftArtifact.content + streamPart.data,
     // ... same visibility logic as before
   }));
   ```

**Pattern Reference**: All document handlers (text, code, sheet) now follow the same streaming pattern:
- Server: Use `dataStream.custom()` with `{ type: "data-*Delta", data: chunk, transient: true } as any`
- Client: Append content with `content: draftArtifact.content + streamPart.data`

### 19. CSV/Sheet Grid Streaming View Fix

**Files**: `hooks/use-canvas-tabs.ts`, `hooks/use-artifact-streaming.ts`

**Issue**: When streaming CSV/sheet documents, the content was initially rendered as plain text instead of in the spreadsheet grid view. The grid only appeared after the user manually closed and reopened the tab.

**Root Cause**: When a document tool call starts streaming, `DocumentTool` opens a pending tab immediately. However, at that moment, `part.input.kind` may not be available (tool inputs stream progressively), so `initialKind` defaults to `"text"`. The tab remains with `kind: "text"` even after `data-kind` event arrives with `"sheet"`, causing the wrong renderer (text editor) to be used.

**Fix**:

1. **Extended `mutateTabByDocumentId`** to support `kind` updates:
   ```typescript
   // hooks/use-canvas-tabs.ts
   export function mutateTabByDocumentId(
     documentId: string,
     updates: {
       content?: unknown;
       status?: WidgetStatus;
       title?: string;
       kind?: WidgetKind;  // Added
     }
   ): boolean {
     // ... also updates artifact.kind and tab.type when kind is provided
   }
   ```

2. **Update tab kind when `data-kind` event arrives** in `useTabStreamSync`:
   ```typescript
   // hooks/use-artifact-streaming.ts
   case "data-kind":
     pendingKindRef.current = delta.data;
     // If we already have a document ID, update the tab's kind immediately
     if (streamingDocumentIdRef.current) {
       mutateTabByDocumentId(streamingDocumentIdRef.current, {
         kind: delta.data as WidgetKind,
       });
     }
     break;
   ```

3. **Apply buffered kind when binding pending tab** to actual document ID:
   ```typescript
   // When data-id arrives and binding succeeds
   if (pendingKindRef.current) {
     mutateTabByDocumentId(actualDocId, {
       kind: pendingKindRef.current as WidgetKind,
     });
   }
   ```

**Behavior After Fix**:
- Tab opens with default kind (`"text"`) when tool call starts
- When `data-kind` event arrives with actual kind (e.g., `"sheet"`), tab kind is updated
- Correct renderer (spreadsheet grid) is used immediately during streaming
- No need to close/reopen tab to see the grid view

---

## Temporary Testing Configuration

### ⚠️ Unlimited Requests (Rate Limiting Disabled)

**File**: `lib/ai/entitlements.ts`

Rate limiting has been **temporarily disabled** for testing purposes. Both guest and regular users now have unlimited message requests.

**Original values:**
```typescript
guest: { maxMessagesPerDay: 20, ... }
regular: { maxMessagesPerDay: 100, ... }
```

**Current (testing) values:**
```typescript
guest: { maxMessagesPerDay: Number.POSITIVE_INFINITY, ... }
regular: { maxMessagesPerDay: Number.POSITIVE_INFINITY, ... }
```

**To restore rate limiting**, change `Number.POSITIVE_INFINITY` back to the original values (20 for guest, 100 for regular).

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [FatturaElettronica XML Spec](https://www.fatturapa.gov.it/export/fatturazione/sdi/Specifiche_tecniche_del_formato_FatturaPA_v1.2.pdf)
- [Next.js Documentation](https://nextjs.org/docs)
