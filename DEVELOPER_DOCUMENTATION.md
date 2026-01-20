# Faenza Assistant - Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agents](#agents)
4. [Knowledge Base System](#knowledge-base-system)
5. [Oracle Database Integration](#oracle-database-integration-sibac)
6. [SIBAC Shared Folder Integration](#sibac-shared-folder-integration)
7. [Invoice Validation System](#invoice-validation-system)
8. [Hierarchical File System UI](#hierarchical-file-system-ui)
9. [Document Template System](#document-template-system)
10. [Canvas Widget System](#canvas-widget-system)
11. [Activity System](#activity-system)
12. [Activity Tracking System](#activity-tracking-system)
13. [Tools Reference](#tools-reference)
14. [Hooks Reference](#hooks-reference)
15. [Data Flow](#data-flow)
16. [File Structure](#file-structure)
17. [Adding New Features](#adding-new-features)
18. [Troubleshooting](#troubleshooting)

---

## Overview

Faenza Assistant is an AI-powered application for the **Comune di Faenza** (Municipality of Faenza, Italy). The primary agent, **Assistente Comune**, helps users manage and analyze Italian electronic invoices (FatturaElettronica).

### Key Features

- **Assistente Comune**: Official AI assistant for document management
- **Invoice Knowledge Base**: Access to XML invoice files or Oracle database
- **Intelligent Parsing**: Automatic extraction of invoice metadata
- **Invoice Validation**: Automatic validation of required fields for invoice liquidation
- **Document Templates**: Template-based generation for administrative documents (e.g., Documento di Liquidazione)
- **Italian Interface**: System prompt and interactions in Italian
- **Dual Data Source**: Support for local XML files and remote Oracle database (SIBAC)
- **VPN Integration**: Automatic VPN connection for remote database access

### Key Technologies

- **Next.js 15**: React framework with App Router
- **Mastra Framework**: AI agent framework for tool orchestration
  - `@mastra/core`: Core agent and tool definitions
  - `@mastra/ai-sdk`: Integration with Vercel AI SDK for streaming
  - `@mastra/memory`: Conversation memory management
  - `@mastra/libsql`: LibSQL storage adapter for memory persistence
  - `@mastra/client-js`: Client-side tool creation utilities
- **OpenAI GPT-5.1**: Default LLM for chat responses (via `openai/gpt-5.1` model)
- **Vercel AI SDK**: Streaming responses and UI message handling (`ai` package v5)
- **LibSQL**: Memory storage for conversation history
- **TypeScript**: Type-safe codebase
- **OracleDB**: Oracle database connectivity for SIBAC integration
- **Drizzle ORM**: Database schema and migrations for PostgreSQL

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
│  │  - Tools: createDocument, updateDocument, requestSuggestions,         │   │
│  │           loadInvoice                                                 │   │
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
- Create new documents (text, code, spreadsheets) in the canvas
- Update existing documents with AI-assisted editing
- Request AI suggestions for document improvements

**Configuration:**

```typescript
export const chatAgent = new Agent({
  name: "Assistente Comune",
  instructions: ({ runtimeContext }) => {
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    const canvasContext = getCanvasContext(runtimeContext);
    return chatAgentSystemPrompt(config, geoHints, canvasContext);
  },
  model: "openai/gpt-5.1",
  // Sub-agent for deep invoice analysis
  agents: { invoiceAnalyzerAgent },
  tools: {
    // Document creation and editing tools
    createDocument: mastraTools.createDocument,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
    // Invoice management tool
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
3. **Tool Usage**: Instructions for all tools:
   - `loadInvoice` - Invoice/document access
   - `createDocument` - Create new documents (text, code, sheet)
   - `updateDocument` - Edit existing documents
   - `requestSuggestions` - AI-powered document suggestions
4. **Canvas Context**: Awareness of currently active document in the canvas
5. **Document Format**: FatturaElettronica XML guide
6. **Communication Style**: Professional Italian
7. **Greeting**: Welcome message template

### Invoice Analyzer Agent (`mastra/agents/faenza/invoice-analyzer-agent/`)

A specialized sub-agent for deep analysis of invoice XML documents. This agent is **called by the chat agent** when users click "Analizza Fattura" on an invalid invoice. The button sends an automatic message to the chat, and the chat agent delegates to this sub-agent to search for missing fields in non-standard XML locations.

**Purpose:**
- **Load invoice content** using `loadInvoice` tool (can access all sources including SIBAC shared)
- Search entire XML document for missing required fields
- Extract potential values from non-standard locations
- Validate extracted values using specialized validation tools
- Return analysis results that appear in the chat conversation

**How it's called:**
1. User clicks "Analizza Fattura" button
2. UI sends message: "Analizza la fattura [fileId] per trovare i seguenti campi mancanti: [fields]"
3. Chat agent receives message and delegates to `invoiceAnalyzerAgent`
4. Sub-agent loads the invoice using `loadInvoice` tool, then analyzes content
5. Analysis results appear in the chat thread

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
  tools: {
    ...invoiceValidationTools,
    loadInvoice: loadInvoiceTool,  // Can load invoices from all sources
  },
});

// Factory function for custom missing fields (optional)
const customAnalyzer = createInvoiceAnalyzerAgent(["CUP", "IBAN"]);
```

**Tools:**

| Tool | Purpose | Description |
|------|---------|-------------|
| `loadInvoice` | Load invoice content | Loads invoice from any source (local, Oracle, sibac-shared) |
| `validateIban` | Validates Italian IBAN | Pattern: `^IT\d{2}[A-Z0-9]{23}$` |
| `validateCig` | Validates CIG code | Pattern: `^[A-Z0-9]{10}$` |
| `validateCup` | Validates CUP code | Pattern: `^[A-Z0-9]{15}$` |
| `validateCodiceFiscale` | Validates Italian tax code | Company: `^\d{11}$` / Individual: 16 chars |
| `validateCodicePa` | Validates PA code | Pattern: `^[A-Z0-9]{6,7}$` |

**Workflow:**
1. **Load invoice first**: Call `loadInvoice({ fileId: "sibac-shared:Faenza/repositoryFE/..." })` to get XML content
2. **Analyze XML**: Search for missing fields in returned content
3. **Validate findings**: Use validation tools to verify extracted values
4. **Report results**: Stream findings back to chat

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

## Oracle Database Integration (SIBAC)

### Overview

The system supports fetching invoice/impegni data from the remote Oracle SIBAC database via VPN connection. This is an alternative to the local XML file storage.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│   VPN Service   │────▶│  Oracle SIBAC   │
│   (Next.js)     │     │  (faenza-vpn)   │     │  192.168.0.204  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌───────────────┐
                        │ SIB_V_IMPEGNI │
                        │   _X_CIG      │
                        └───────────────┘
```

### Configuration

Set the following environment variables:

```env
# Data source selection
INVOICE_DATA_SOURCE=oracle  # or "local" for XML files

# Oracle Database
ORACLE_HOST=192.168.0.204
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=SIBAC
ORACLE_USER=cp_ia01  # cp_ia01 through cp_ia08
ORACLE_PASSWORD=p4ss_ia1

# VPN
VPN_NAME=faenza vpn
VPN_AUTO_CONNECT=true
```

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| VPN Service | `lib/vpn/faenza-vpn.ts` | Manages VPN connection via macOS scutil or Linux vpnc |
| SSH Tunnel | `lib/vpn/ssh-tunnel.ts` | SSH port forwarding for firewalled Oracle access |
| Oracle Client | `lib/db/oracle-sibac.ts` | Oracle database connection pool and queries |
| Oracle Types | `lib/db/oracle-types.ts` | TypeScript types for Oracle data |

### VPN Service (`lib/vpn/faenza-vpn.ts`)

The VPN service supports **cross-platform** operation:
- **macOS** (local development): Uses native `scutil` for Cisco IPSec VPN
- **Linux/AWS** (production): Uses `vpnc` for Cisco IPSec VPN

```typescript
// Check VPN status
const isConnected = await isVpnConnected();

// Connect to VPN
const result = await connectVpn();
// { success: true, status: "connected", message: "VPN connesso" }

// Execute code with VPN (auto-connects if needed)
const data = await withVpnConnection(async () => {
  return await fetchOracleData();
});

// Get VPN info (without sensitive data)
const info = getVpnInfo();
// { platform: "darwin", serviceName: "faenza vpn", serverAddress: "...", configured: true }
```

### Oracle Connection Diagnostics

The system includes comprehensive diagnostics to distinguish between different connection issues:

```typescript
import { diagnoseOracleConnection } from "@/lib/vpn/faenza-vpn";

const diagnosis = await diagnoseOracleConnection();
// Returns: {
//   vpnConnected: boolean,
//   serverReachable: boolean,
//   portReachable: boolean,
//   sshTunnelEnabled: boolean,
//   sshTunnelConnected: boolean,
//   status: "ok" | "vpn_disconnected" | "server_unreachable" | "port_blocked" | "ssh_tunnel_available" | "ssh_tunnel_error",
//   message: string  // Human-readable error message (Italian)
// }
```

**Status codes and their meanings:**
| Status | Description |
|--------|-------------|
| `ok` | All checks passed, Oracle is accessible (direct or via SSH tunnel) |
| `vpn_disconnected` | VPN not connected |
| `server_unreachable` | VPN connected but server doesn't respond to ping |
| `port_blocked` | Server reachable but port 1521 blocked (firewall or Oracle service down) |
| `ssh_tunnel_available` | Port blocked but SSH is available - set SSH_TUNNEL_ENABLED=true |
| `ssh_tunnel_error` | SSH tunnel enabled but connection failed |

### UI Error Messages

The document selector shows specific error messages based on the diagnostic status:
- **VPN disconnected**: "VPN non connesso. Connettere al VPN per accedere al database."
- **Server unreachable**: "Server Oracle non raggiungibile. Verificare la configurazione VPN."
- **Port blocked**: "Porta Oracle 1521 non raggiungibile. Il servizio Oracle potrebbe essere spento o bloccato dal firewall."

### VPN Environment Variables

```env
# VPN Configuration
VPN_NAME="faenza vpn"              # VPN service name (macOS only)
VPN_SERVER="195.62.179.98"         # VPN server address
VPN_USERNAME="your_username"       # VPN username
VPN_PASSWORD="your_password"       # VPN password
VPN_SHARED_SECRET="your_secret"    # IPSec shared secret
VPN_GROUP_NAME="Memoraiz"          # IPSec group name
VPN_AUTO_CONNECT="true"            # Auto-connect when needed
```

### SSH Tunnel for Oracle Access

When Oracle port 1521 is firewalled and only accessible locally on the server (common security configuration), the system can route database connections through an SSH tunnel.

#### Architecture with SSH Tunnel

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│   VPN Service   │────▶│   SSH Tunnel    │────▶│  Oracle SIBAC   │
│   (Next.js)     │     │  (faenza-vpn)   │     │  (ssh-tunnel)   │     │  localhost:1521 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                              │
        └──────────────── localhost:11521 ─────────────┘
```

The tunnel creates a local port (11521) that forwards to the Oracle port (1521) on the remote server via SSH.

#### SSH Tunnel Service (`lib/vpn/ssh-tunnel.ts`)

```typescript
import {
  connectSshTunnel,
  disconnectSshTunnel,
  isSshTunnelEnabled,
  isTunnelConnected,
  withSshTunnel,
  getSshTunnelInfo,
  testSshConnection
} from "@/lib/vpn/ssh-tunnel";

// Check if SSH tunnel is enabled
if (isSshTunnelEnabled()) {
  // Establish SSH tunnel
  const result = await connectSshTunnel();
  // { success: true, status: "connected", message: "...", localPort: 11521 }
}

// Check tunnel status
const connected = isTunnelConnected();

// Execute code with SSH tunnel (auto-connects if enabled)
const data = await withSshTunnel(async () => {
  return await queryOracle();
});

// Test SSH connectivity
const testResult = await testSshConnection();

// Get tunnel info
const info = getSshTunnelInfo();
// { enabled: true, status: "connected", sshHost: "...", localPort: 11521, ... }
```

#### SSH Tunnel Environment Variables

```env
# SSH Tunnel Configuration
SSH_TUNNEL_ENABLED="false"         # Enable SSH tunnel (true | false)
SSH_HOST="192.168.0.204"           # SSH server (defaults to ORACLE_HOST)
SSH_PORT="22"                      # SSH port
SSH_USERNAME=""                    # SSH username (defaults to VPN_USERNAME)
SSH_PASSWORD=""                    # SSH password (defaults to VPN_PASSWORD)
SSH_PRIVATE_KEY=""                 # Path to SSH private key (alternative to password)
SSH_PRIVATE_KEY_CONTENT=""         # SSH key content (for containerized deployments)
SSH_LOCAL_PORT="11521"             # Local tunnel port (default: 11521)
```

#### When to Enable SSH Tunnel

Enable SSH tunnel when you see this error:
> "Porta Oracle 1521 non raggiungibile su 192.168.0.204"

This typically occurs when:
1. The Oracle database is firewalled and only accessible locally on the server
2. The VPN allows access to the server but not to specific ports
3. The IT team requires database access via RDP or SSH only

To enable:
1. Set `SSH_TUNNEL_ENABLED="true"`
2. Set `SSH_USERNAME` and `SSH_PASSWORD` (same credentials used for RDP access)
3. Restart the application

#### Connection Flow with SSH Tunnel

```
1. Check VPN connection ─────────────────▶ Connect VPN if needed
                                               │
2. Check SSH tunnel enabled ─────────────▶ Connect SSH tunnel
                                               │
3. Create Oracle connection ─────────────▶ Use localhost:11521
   (via withOracleConnection wrapper)         (forwarded to 192.168.0.204:1521)
```

#### Diagnostic Status Codes (with SSH)

| Status | Description |
|--------|-------------|
| `ok` | Connected (direct or via SSH tunnel) |
| `vpn_disconnected` | VPN not connected |
| `server_unreachable` | Server doesn't respond to ping |
| `port_blocked` | Port 1521 blocked, no SSH tunnel configured |
| `ssh_tunnel_available` | Port blocked but SSH is available - enable tunnel |
| `ssh_tunnel_error` | SSH tunnel enabled but failed to connect |

### VPN Setup Scripts

| Script | Platform | Description |
|--------|----------|-------------|
| `scripts/setup-vpn-macos.sh` | macOS | Guides macOS VPN profile creation |
| `scripts/setup-vpn-linux.sh` | Linux | Installs vpnc and creates config |

See `lib/vpn/README.md` for detailed setup instructions.

### Oracle Client (`lib/db/oracle-sibac.ts`)

```typescript
// List impegni from database
const impegni = await listImpegni({ limit: 100 });

// Get specific impegno by CIG
const impegno = await getImpegnoByCig("ABC1234567");

// Validate impegno fields
const validation = validateImpegno(impegno);

// Discover view schema (useful for initial setup)
const schema = await discoverViewSchema();
```

### Database Users

The system connects to **all 8 database views in parallel** to aggregate impegni data from different municipal departments:

| User | View | Tablespace |
|------|------|------------|
| cp_ia01 | sib01.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib01 |
| cp_ia02 | sib02.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib02 |
| cp_ia03 | sib03.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib03 |
| cp_ia04 | sib04.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib04 |
| cp_ia05 | sib05.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib05 |
| cp_ia06 | sib06.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib06 |
| cp_ia07 | sib07.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib07 |
| cp_ia08 | sib08.SIB_V_IMPEGNI_X_CIG | ak_tasp_sib08 |

All users share the password: `p4ss_ia1`

### Multi-View Query Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     listImpegni()                           │
│                          │                                  │
│     ┌────────────────────┼────────────────────┐            │
│     │                    │                    │            │
│     ▼                    ▼                    ▼            │
│ ┌─────────┐        ┌─────────┐         ┌─────────┐        │
│ │ cp_ia01 │        │ cp_ia02 │   ...   │ cp_ia08 │        │
│ │  pool   │        │  pool   │         │  pool   │        │
│ └────┬────┘        └────┬────┘         └────┬────┘        │
│      │                  │                   │              │
│      ▼                  ▼                   ▼              │
│  SIB01 view         SIB02 view          SIB08 view        │
│                          │                                 │
│     └────────────────────┼────────────────────┘           │
│                          │                                 │
│                    Aggregate Results                       │
│                  (with source prefix)                      │
└─────────────────────────────────────────────────────────────┘
```

Each record includes a source indicator (e.g., `cp_ia01:CIG123456AB`) for traceability.

### Unified Data Access

The knowledge base loader provides unified functions that work with all data sources:

```typescript
import {
  getDataSource,
  listRecordsWithValidation,
  loadRecord
} from "@/mastra/utils/knowledge-base-loader";

// Check current data source
const source = getDataSource(); // "local" | "oracle" | "sibac-shared"

// List all records (works with all sources)
const records = await listRecordsWithValidation();

// Load specific record (auto-detects source from prefix)
const record = await loadRecord("sibac-shared:INVOICE_001");
const record2 = await loadRecord("CIG_OR_FILE_ID");
// Returns: { recordId, metadata, content, validation, source, impegno? }
// recordId is the canonical identifier for re-loading (e.g., "sibac-shared:path/to/file.xml")
```

### SIBAC Views Explorer

The **SIBAC Views Explorer** is a canvas widget that allows users to directly browse the `SIB_V_IMPEGNI_X_CIG` Oracle views across all 8 database users (cp_ia01-08).

#### Features

- **User Selection**: Dropdown to select specific database user (cp_ia01-08) or "All" for aggregated view
- **Connection Status**: Real-time VPN/Oracle connectivity indicator
- **CIG Search**: Exact match search by CIG code
- **Paginated Data Table**: Dynamic columns based on view schema with pagination
- **Row Detail View**: Click any row to see all fields in a formatted detail panel

#### Opening the Explorer

The Views Explorer can be opened from the Document Selector root view:
1. Open the Document Selector panel
2. Click the "Esplora Viste SIBAC" card (purple icon)
3. The explorer opens in a new canvas tab

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/oracle/views` | GET | List available views + VPN/Oracle status |
| `/api/oracle/view-schema` | GET | Get column metadata for a user's view |
| `/api/oracle/view-data` | GET | Fetch paginated rows with optional CIG filter |

**Query Parameters for `/api/oracle/view-data`:**
- `user`: Oracle user (`cp_ia01` - `cp_ia08`) or `all` for aggregated
- `limit`: Max rows (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)
- `cig`: Optional CIG filter (exact match)

#### Backend Functions

```typescript
import {
  getAvailableViews,
  listViewData,
  listViewDataAllUsers,
  isValidOracleUser,
} from "@/lib/db/oracle-sibac";

// Get list of view targets
const views = getAvailableViews();
// Returns: [{ id, user, name, fullPath }, ...]

// Fetch data for a specific user
const result = await listViewData("cp_ia01", { limit: 50, cig: "ABC1234567" });
// Returns: { success, user, view, rows, limit, offset }

// Fetch aggregated data from all users
const result = await listViewDataAllUsers({ limit: 100 });
// Returns: { success, user: "all", view, rows, ... }
```

#### Security

- User parameter validated against static allowlist (`ORACLE_USERS`)
- View name is fixed to `SIB_V_IMPEGNI_X_CIG` (not user-controllable)
- All queries use bind variables (no SQL injection)
- Max limit enforced server-side (200 rows)
- Oracle credentials only in server environment variables

---

## SIBAC Shared Folder Integration

### Overview

The SIBAC Shared Folder provides automatic file synchronization from the Windows machine's shared folder "SIBAC 01 - Cartella Condivisa" at `192.168.0.204`. The system automatically mounts the SMB share and syncs files to a local directory for processing.

### Automatic SMB Sync

When VPN is connected, the system automatically:
1. Mounts the Windows SMB share
2. Copies new/updated files to the local directory
3. Unmounts after sync

**Key module:** `lib/smb/sibac-share.ts`

```typescript
import {
  syncSibacFiles,
  isSibacShareAccessible,
  getLocalSibacFileCount,
} from "@/lib/smb/sibac-share";

// Sync files from Windows share (auto-mounts SMB)
const result = await syncSibacFiles();
// Returns: { success, message, filesFound, filesSynced, errors }

// Check if share is accessible
const status = await isSibacShareAccessible();
// Returns: { accessible, message }

// Get count of locally synced files
const count = getLocalSibacFileCount();
```

### Environment Variables

```bash
SMB_HOST="192.168.0.204"
SMB_SHARE_NAME="SIBAC 01 - Cartella Condivisa"
SMB_USERNAME=""  # Defaults to VPN_USERNAME
SMB_PASSWORD=""  # Defaults to VPN_PASSWORD
SMB_DOMAIN="WORKGROUP"
```

### Manual Access (Fallback)

If automatic sync fails, access via RDP:

```bash
# Connect via XQuartz + xfreerdp (macOS)
open -a XQuartz
export DISPLAY=:0
xfreerdp /v:192.168.0.204 /u:eprocino /p:YOUR_PASSWORD /cert:ignore
```

### Local Directory

Files are synced to:

```
mastra/knowledgebase/sibac-shared/
```

Supported file formats: `.xml`, `.pdf`, `.doc`, `.docx`

### Key Functions

```typescript
import {
  listSibacSharedFiles,
  loadSibacSharedFile,
  loadRecord,
} from "@/mastra/utils/knowledge-base-loader";

// List files from SIBAC shared folder
const files = listSibacSharedFiles();

// Load a specific file by name (legacy)
const invoice = loadSibacSharedFile("INVOICE_001");

// Load a file using canonical record ID (recommended)
// Supports nested paths like "sibac-shared:Faenza/repositoryFE/XMLP/2023/file.xml"
const record = await loadRecord("sibac-shared:path/to/file.xml");
// Returns: { recordId, metadata, content, validation, source }
```

### Canonical Record IDs

SIBAC shared files use canonical record IDs with the format `sibac-shared:<relative-path>`. This ensures:
- **Consistent identification**: The same ID works for loading and analysis
- **Nested path support**: Files in subdirectories are correctly identified
- **Path traversal protection**: Security checks prevent `../` escape attempts

### UI Display

The folder appears as "SIBAC 01 - Cartella Condivisa" with a `FolderSync` icon in the document selector panel, positioned first in the hierarchy.

### Error Handling

The folder displays specific error messages based on status:
- **VPN disconnected**: "VPN non connesso. Connettere al VPN per sincronizzare i file."
- **SMB error**: "Impossibile accedere alla cartella condivisa Windows. Verificare le credenziali SMB."
- **Sync pending**: "Sincronizzazione in corso..."

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

---

## Hierarchical File System UI

### Overview

The UI fatture panel supports a hierarchical file system view that organizes documents into folders. This allows users to browse:
- **Database SIBAC**: Files fetched from the Oracle database (when VPN connected)
- **Fatture Locali (Debug)**: Local XML files for development and debugging

### File System Types

```typescript
// Base type for file system items
type FileSystemItemBase = {
  id: string;
  name: string;
  type: "file" | "folder";
};

// A file in the file system
type FileSystemFile = FileSystemItemBase & {
  type: "file";
  fileId: string;
  displayName?: string;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
  source: "local" | "oracle" | "sibac-shared";
};

// A folder in the file system
type FileSystemFolder = FileSystemItemBase & {
  type: "folder";
  children: FileSystemItem[];
  fileCount: number;      // Total files (including subfolders)
  validCount: number;     // Count of valid files
  invalidCount: number;   // Count of invalid files
  defaultExpanded?: boolean;
  icon?: string;          // "database", "database-off", "hard-drive", "folder-sync"
  description?: string;
};

// Root structure for the file system UI
type FileSystemRoot = {
  items: FileSystemItem[];
  totalFiles: number;
  totalValid: number;
  totalInvalid: number;
};
```

### Getting Hierarchical Data

```typescript
import { getFileSystemHierarchy } from "@/mastra/utils/knowledge-base-loader";

// Get hierarchical structure with local, Oracle, and SIBAC shared folders
const fileSystem = await getFileSystemHierarchy();

// Returns:
// {
//   items: [
//     { id: "folder:sibac-shared", name: "SIBAC 01 - Cartella Condivisa", type: "folder", ... },
//     { id: "folder:oracle", name: "Database SIBAC", type: "folder", ... },
//     { id: "folder:local", name: "Fatture Locali (Debug)", type: "folder", ... }
//   ],
//   totalFiles: 66,
//   totalValid: 6,
//   totalInvalid: 60
// }
```

### UI Components (Card-Based Navigation)

The document selector (`components/artifacts/document-selector.tsx`) uses a **card-based page navigation** pattern:

**Navigation Pattern:**
- Files and folders are displayed as **squared cards** (~120x120px) in a responsive grid
- Clicking a **folder** navigates to a new "page" showing its contents
- Clicking a **file** opens the invoice detail view in the same side panel
- A **"Back" button** (Indietro) allows returning to the parent folder
- Supports both **Grid** and **List** view modes

**Card Components:**

1. **FolderCard** (Grid View): Squared card for folders
   - Folder icon (colored by type)
   - Folder name (truncated if long)
   - File count badge

2. **FolderListItem** (List View): Horizontal item for folders
   - Folder icon with name and description
   - File count badge

3. **FileCard** (Grid View): Squared card for files
   - File icon (colored by validation status)
   - File name (truncated if long)
   - Validation dot indicator (green/red)

4. **FileListItem** (List View): Horizontal item for files
   - File icon with name
   - Validation badge

**Navigation State:**
```typescript
// Current folder being viewed (null = root level)
const [currentFolder, setCurrentFolder] = useState<FileSystemFolder | null>(null);
// History stack for back navigation
const [folderHistory, setFolderHistory] = useState<FileSystemFolder[]>([]);
```

### Folder Icons

| Icon | Folder Type | Description |
|------|-------------|-------------|
| FolderSync | `folder:sibac-shared` | SIBAC 01 - Cartella Condivisa (Windows shared folder) |
| Database | `folder:oracle` | Oracle SIBAC database |
| DatabaseZap | `folder:oracle` (disconnected) | VPN not connected |
| HardDrive | `folder:local` | Local XML files |
| Folder | default | Generic folder |

### UI Validation Display

**Document Grid/List View:**
- **Valid files**: Blue icon with green validation dot
- **Invalid files**: Red icon with red validation dot
- **Header stats**: Shows count of valid/invalid/total invoices
- **Back navigation**: Shows current folder name and "Indietro" button

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

The Document Template System allows generating structured documents (like "Documento di Liquidazione") using data extracted from loaded invoices. When a user requests a document that matches a registered template, the system automatically populates the template with invoice data instead of using AI generation.

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **Template Types** | `lib/templates/types.ts` | TypeScript interfaces for templates |
| **Template Registry** | `lib/templates/index.ts` | Central registry and rendering functions |
| **Liquidation Determination** | `lib/templates/liquidation-determination.ts` | "Documento di Liquidazione" template (Markdown with tables) |

### Template Context

When a template is rendered, it receives a `TemplateContext` object with:

```typescript
type TemplateContext = {
  metadata: InvoiceMetadata;    // Supplier, buyer, amount, dates, etc.
  validation: InvoiceValidation; // IBAN, CIG, CUP, validation status
  content?: string;              // Raw XML content (optional)
  custom?: Record<string, unknown>; // Custom data (e.g., impegno, firmatario)
};
```

### Available Templates

| Template ID | Name | Trigger Keywords |
|-------------|------|------------------|
| `liquidation-determination` | Documento di Liquidazione | documento di liquidazione, determina di liquidazione |

**Note:** The template uses Markdown format with tables for the official liquidation document. Missing fields are filled with "DA COMPILARE" fallback text. The Markdown format provides clean, editable text that renders well in the document viewer.

### Liquidation Determination Template

The "Documento di Liquidazione" template (`lib/templates/liquidation-determination.ts`) follows the official Unione della Romagna Faentina format:

**Template Structure:**
1. **Header**: UNIONE della ROMAGNA FAENTINA branding with organizational units
2. **Title**: "COMUNICAZIONE DI LIQUIDAZIONE n. X / YYYY"
3. **Object**: Description of the liquidation
4. **Body**: Administrative text with Delibera references (checkbox items)
5. **Table 1 (FATTURA)**: Invoice details with columns for CAP/ART, IMPEGNO, CREDITORE, FATTURA
6. **Table 2 (CONTRIBUTO)**: Transfer/contribution details (alternative to invoices)
7. **Footer**: Date and director's digital signature

**Auto-filled Fields from Invoice:**
| Template Variable | Source |
|-------------------|--------|
| `CREDITORE_DENOMINAZIONE` | `metadata.supplier` |
| `CREDITORE_IBAN` | `validation.iban` |
| `CREDITORE_CIG` | `validation.cig` |
| `CREDITORE_CUP` | `validation.cup` |
| `FATTURA_OGGETTO` | `validation.descrizioneSpesa` |
| `FATTURA_N_DEL` | `metadata.invoiceNumber` + `metadata.date` |
| `FATTURA_IMPORTO` | `metadata.totalAmount` |
| `IMPORTO_TOTALE_EURO` | `metadata.totalAmount` |

### Main Agent Template Generation

The main agent (Assistente Comune) has the liquidation document template **directly in its system prompt**. When a user requests a liquidation document:

1. **Main agent loads invoice data** via `loadInvoice`
2. **Main agent fills the template** with invoice data following the mapping rules
3. **Main agent calls `createDocument`** passing the filled content directly

**Architecture:**

```
User Request → Main Agent (has template in prompt) → fills template
                                                          ↓
                              createDocument(title, kind, content, invoiceFileId)
                                                          ↓
                                        Content streamed to Canvas Tab
```

**Key advantage:** The template and generation logic are in one place (main agent prompt), making it easier to maintain and modify.

**createDocument Tool Parameters:**

```typescript
{
  title: string;           // Document title
  kind: "text" | "code" | "sheet";
  content?: string;        // Filled template content (provided by agent)
  invoiceFileId?: string;  // Associated invoice ID
}
```

When `content` is provided, the tool streams it directly to the canvas without generating new content.

**Template in Main Agent Prompt:**

The main agent's system prompt (`mastra/agents/faenza/invoices-manager/system-prompt.ts`) includes:
- Full Markdown template for "Documento di Liquidazione"
- Placeholder-to-data mapping table
- Formatting rules (Italian numbers, dates)
- Instructions on how to call `createDocument` with the filled content

**Text Handler (simplified):**

The text handler (`artifacts/text/server.ts`) is now simplified and only handles:
- Generic document generation (no template)
- Document updates

Template-based documents are generated by the main agent and passed directly to `createDocument`.

### Document Export

Documents can be exported as Word-compatible `.docx` files (recommended) or legacy `.doc` files:

**API Endpoints:**
- `GET /api/document/export?id=DOC_ID&format=docx` (recommended)
- `GET /api/document/export?id=DOC_ID&format=doc` (legacy)

**DOCX Export (format=docx):**
The recommended export uses a proper Markdown→DOCX pipeline (`lib/export/markdown-to-docx.ts`) that:
- Parses Markdown using `unified` + `remark-parse` + `remark-gfm`
- Converts to real DOCX elements using the `docx` library
- Produces true OpenXML `.docx` files that open correctly in Microsoft Word and LibreOffice

**Supported Markdown Elements:**
- Headings (H1-H3)
- Bold/italic text
- Bullet lists, numbered lists, task lists (checkboxes)
- Tables with borders
- Blockquotes, code blocks, horizontal rules

**Liquidation Document Tables:**
The DOCX exporter includes special handling for the "Documento di Liquidazione" tables:
- Detects tables by their header row pattern (CAP/ART, Impegno N., etc.)
- Renders a **two-row grouped header** matching the official template format:
  - Row 1: `CAP/ART` | `IMPEGNO` (spans 3) | `CREDITORE` (spans 3) | `FATTURA` (spans 4)
  - Row 2: Sub-columns for each group
- Applies shaded header cells and consistent column widths

**Legacy DOC Export (format=doc):**
- Wraps HTML content in Word-compatible XML wrapper
- Converts Markdown to basic HTML
- Returns downloadable `.doc` file

**Download Button:**
The document viewer includes a prominent "Word" download button in the header actions bar. The button:
- Is visible after the document finishes streaming
- Is disabled during streaming or for unsaved documents
- Triggers download of `.docx` file via the export API

**Auto-Save on Streaming Completion:**
When a document is created via AI streaming (e.g., `createDocument` tool), the document content is only held in client-side tab state during streaming. To ensure the document can be exported immediately after streaming completes, an auto-save effect in `components/artifacts/document.tsx` automatically persists the document to the database when:
- Streaming status transitions to "idle"
- The document has content
- No database entry exists yet (first save)
- The document ID is not a pending placeholder

**Important Implementation Detail:** The auto-save calls the document API directly without triggering `chatDocument.mutate()`. This is intentional - calling mutate would refetch the document and cause the display content to get out of sync (the content would briefly disappear due to timing issues between draft state and database state). The document continues to display from the tab state while being persisted to the database for export.

This ensures newly generated documents are always available for export without requiring manual user edits.

### Selected Invoice Context

The system tracks the currently selected invoice for deterministic document generation:

**Store:** `lib/canvas/selected-invoice-store.ts`

```typescript
import { setSelectedInvoice, getSelectedInvoice, clearSelectedInvoice } from "@/lib/canvas";

// When user selects an invoice
setSelectedInvoice(recordId);

// Get current selection (synchronously)
const invoiceId = getSelectedInvoice();

// Clear selection
clearSelectedInvoice();
```

The selected invoice ID is automatically included in chat requests as `invoiceContext.selectedInvoiceRecordId` and passed to the runtime context.

---

## Tools Reference

### Assistente Comune Tools

The chat agent has access to the following tools for document management and creation:

| Tool | Description | Input |
|------|-------------|-------|
| `createDocument` | Create a new document (text, code, sheet). For templates, pass filled content directly | `{ title: string, kind: ArtifactKind, content?: string, invoiceFileId?: string }` |
| `updateDocument` | Update an existing document with AI-assisted changes | `{ id: string, description: string }` |
| `requestSuggestions` | Request AI suggestions for document improvements | `{ documentId: string }` |
| `loadInvoice` | Load invoice from knowledge base | `{ fileId?: string }` |

### Tool Details

#### createDocument

Creates a new document in the canvas with streaming content generation.

```typescript
// Input
{
  title: string;                    // Document title
  kind: "text" | "code" | "sheet";  // Document type
  invoiceFileId?: string;           // Optional invoice ID for template-based generation
}

// Output
{
  id: string;      // Generated document ID
  title: string;
  kind: ArtifactKind;
  content: string; // Confirmation message
}
```

**Template Integration:** When `invoiceFileId` is provided, the tool loads the invoice data and uses it for template-based document generation (e.g., "Documento di Liquidazione").

#### updateDocument

Updates an existing document based on a natural language description.

```typescript
// Input
{
  id: string;          // Document ID to update
  description: string; // Description of changes to make
}

// Output
{
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string; // Confirmation message
}
```

#### requestSuggestions

Requests AI-powered suggestions for improving a document.

```typescript
// Input
{
  documentId: string; // Document ID
}

// Output (success)
{
  id: string;
  title: string;
  kind: ArtifactKind;
  message: string;
}

// Output (error)
{
  error: string;
}
```

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
  // For SIBAC shared files, pass the COMPLETE path: "sibac-shared:Faenza/repositoryFE/.../file.xml"
  // For local files: "CSB_IT00185240397_00IS8" or partial like "00185240397"
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
  recordId?: string,                            // Canonical ID for re-loading (NEW)
  metadata?: InvoiceMetadata,                   // Extracted invoice details
  content?: string,                             // Raw XML content
  validation?: InvoiceValidation,               // Validation result
  truncated?: boolean,                          // If content was truncated
  originalSize?: number,                        // Original content size
  error?: string
}
```

**File Identifier Formats:**
- **SIBAC shared files**: Must include the full path with prefix: `sibac-shared:Faenza/repositoryFE/XMLP/2023/08/21/CSB_xxx.xml`
- **Local XML files**: Can use full name, partial ID, or VAT number
- **Oracle database**: Use CIG codes or impegno identifiers

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

## Hooks Reference

The application provides a comprehensive set of React hooks for state management, AI integration, and UI interactions.

### Canvas & Tab Hooks

#### useCanvasTabs

Manages multi-tab state for the canvas panel. Supports opening, closing, switching, and updating tabs.

```typescript
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";

function MyComponent() {
  const {
    // State
    tabs,              // All open tabs
    activeTabId,       // Currently active tab ID
    activeTab,         // Active tab data
    hasOpenTabs,       // Whether any tabs are open
    isCanvasVisible,   // Whether canvas should be shown
    
    // Actions
    openTab,           // Open a new tab
    closeTab,          // Close a tab by ID
    switchTab,         // Switch to a specific tab
    closeAllTabs,      // Close all tabs
    updateTabContent,  // Update tab content
    updateTabStatus,   // Update tab status
  } = useCanvasTabs();
}
```

**Direct Mutation Functions** (for streaming sync):

```typescript
import {
  mutateTabByDocumentId,
  openPendingTab,
  bindPendingTabToDocument,
  wasDocumentClosedByUser,
} from "@/hooks/use-canvas-tabs";

// Update tab without hook context (for streaming)
mutateTabByDocumentId("doc-123", {
  content: "New content",
  status: "idle",
});

// Open a pending tab before document ID is known
const pendingId = openPendingTab("toolcall-abc", "text", "New Document");

// Bind pending tab to actual document ID
bindPendingTabToDocument(pendingId, "doc-123");
```

### AI & Agent Hooks

#### useAssistantAction

Registers client-side AI actions (tools) from React components with automatic lifecycle management.

```typescript
import { useAssistantAction } from "@/hooks/use-assistant-action";
import { createTool } from "@mastra/client-js";
import { z } from "zod";

function MyComponent() {
  const myAction = createTool({
    id: "myCustomAction",
    description: "Performs a custom action",
    inputSchema: z.object({
      input: z.string(),
    }),
    execute: async ({ context }) => {
      return { result: `Processed: ${context.input}` };
    },
  });

  // Register on mount, deregister on unmount
  useAssistantAction(myAction);

  return <div>Component with custom action</div>;
}
```

#### useClientTools

Provides direct access to the assistant actions registry.

```typescript
import { useClientTools } from "@/hooks/use-client-tools";

function MyComponent() {
  const registry = useClientTools();
  
  // Get all registered tools
  const tools = registry.getTools();
  
  // Manually register/deregister (prefer useAssistantAction)
  registry.register(myTool);
  registry.deregister("toolId");
}
```

#### useSelectedAgent

Manages the currently selected AI agent in the UI.

```typescript
import { useSelectedAgent } from "@/hooks/use-selected-agent";

function AgentPicker() {
  const { selectedAgent, setSelectedAgent, agents } = useSelectedAgent();
  
  return (
    <select
      value={selectedAgent.id}
      onChange={(e) => setSelectedAgent(e.target.value)}
    >
      {agents.map(agent => (
        <option key={agent.id} value={agent.id}>{agent.name}</option>
      ))}
    </select>
  );
}
```

### Document & Artifact Hooks

#### useArtifactStreaming

Handles streaming of artifact content from AI tools.

```typescript
import { useArtifactStreaming } from "@/hooks/use-artifact-streaming";

function ArtifactViewer() {
  const { streamingContent, status } = useArtifactStreaming({
    documentId: "doc-123",
    onContentUpdate: (content) => console.log("New content:", content),
  });
}
```

#### useChatDocument

Manages document state within the chat context.

```typescript
import { useChatDocument } from "@/hooks/use-chat-document";

function DocumentEditor() {
  const {
    document,
    isLoading,
    saveDocument,
    updateContent,
  } = useChatDocument("doc-123");
}
```

### UI & Configuration Hooks

#### useRuntimeConfig

Accesses runtime configuration for the chat interface.

```typescript
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

function ConfiguredComponent() {
  const { config, updateConfig } = useRuntimeConfig();
  
  // Access branding, feature flags, etc.
  console.log(config.branding.name);
}
```

#### useBranding

Provides branding configuration (name, logo, colors).

```typescript
import { useBranding } from "@/hooks/use-branding";

function BrandedHeader() {
  const { name, logo, primaryColor } = useBranding();
  
  return (
    <header style={{ backgroundColor: primaryColor }}>
      <img src={logo} alt={name} />
    </header>
  );
}
```

#### useMobile

Detects mobile viewport for responsive layouts.

```typescript
import { useMobile } from "@/hooks/use-mobile";

function ResponsiveLayout() {
  const isMobile = useMobile();
  
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
```

### All Available Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useCanvasTabs` | Multi-tab canvas state management | `hooks/use-canvas-tabs.ts` |
| `useAssistantAction` | Register client-side AI actions | `hooks/use-assistant-action.ts` |
| `useClientTools` | Access assistant actions registry | `hooks/use-client-tools.ts` |
| `useSelectedAgent` | Agent selection state | `hooks/use-selected-agent.ts` |
| `useArtifactStreaming` | Handle artifact streaming | `hooks/use-artifact-streaming.ts` |
| `useArtifact` | Artifact state management | `hooks/use-artifact.ts` |
| `useChatDocument` | Document state in chat | `hooks/use-chat-document.ts` |
| `useChatVisibility` | Chat visibility controls | `hooks/use-chat-visibility.ts` |
| `useChatVotes` | Message voting functionality | `hooks/use-chat-votes.ts` |
| `useRuntimeConfig` | Runtime configuration | `hooks/use-runtime-config.ts` |
| `useBranding` | Branding configuration | `hooks/use-branding.ts` |
| `useDemoConfig` | Demo mode configuration | `hooks/use-demo-config.ts` |
| `useMessages` | Chat messages management | `hooks/use-messages.tsx` |
| `useMobile` | Mobile viewport detection | `hooks/use-mobile.ts` |
| `useDebouncedSave` | Debounced save operations | `hooks/use-debounced-save.ts` |
| `useScrollToBottom` | Auto-scroll functionality | `hooks/use-scroll-to-bottom.tsx` |

---

## Data Flow

### Document Listing Flow (with Hierarchical File System)

```
1. User: "Mostrami i documenti"
         │
         ▼
2. Agent calls loadInvoice({}) - no fileId
         │
         ▼
3. Tool calls getFileSystemHierarchy():
   - Gets local files: listKnowledgeBaseFiles() → validate each
   - Gets Oracle files (if VPN connected): listImpegni() → validate each
   - Organizes into folders: "Database SIBAC" and "Fatture Locali (Debug)"
         │
         ▼
4. Tool returns { 
     success: true, 
     fileSystem: {
       items: [
         { id: "folder:oracle", name: "Database SIBAC", type: "folder", children: [...], ... },
         { id: "folder:local", name: "Fatture Locali (Debug)", type: "folder", children: [...], ... }
       ],
       totalFiles: 66,
       totalValid: 6,
       totalInvalid: 60
     },
     filesWithValidation: [...] // Legacy flat format for backward compatibility
   }
         │
         ▼
5. LoadInvoiceTool UI component:
   - Shows "Documenti Disponibili" card with stats (valid/invalid/total)
   - AUTOMATICALLY opens the side panel (document-selector tab)
   - Side panel shows hierarchical folder view with expand/collapse
```

### Invoice Analysis Flow (Deep Search via Sub-Agent)

When an invoice is invalid and the user clicks "Analizza Fattura":

```
1. User clicks "Analizza Fattura" button on invalid invoice
         │
         ▼
2. UI component sends automatic message to chat:
   "Analizza la fattura [fileId] per trovare i seguenti campi mancanti: [elenco]"
   Note: fileId includes full canonical ID (e.g., "sibac-shared:Faenza/repositoryFE/...")
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
5. Invoice Analyzer Agent loads the invoice:
   - Calls loadInvoice({ fileId: "sibac-shared:Faenza/repositoryFE/..." })
   - Gets full XML content from the response
   - Works with all sources: local, Oracle, SIBAC shared folder
         │
         ▼
6. Invoice Analyzer Agent analyzes content:
   a. Searches XML content for missing fields
   b. Uses LLM to find values in non-standard locations
   c. Calls validation tools (validateCig, validateCup, etc.)
   d. Repeats for each missing field
         │
         ▼
7. Results appear in chat thread:
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
│   │   ├── index.ts               # Research agent
│   │   └── system-prompt.ts       # Research agent prompt
│   └── index.ts                   # Agent exports and types
├── knowledgebase/
│   ├── faenza/
│   │   └── *.xml                  # Local invoice files (debug)
│   └── sibac-shared/
│       └── *.*                    # Files from Windows shared folder
├── tools/
│   ├── index.ts                   # Tool exports and types
│   ├── create-document-tool.ts    # Document creation tool
│   ├── update-document-tool.ts    # Document update tool
│   ├── request-suggestions-tool.ts # AI suggestions tool
│   ├── load-invoice-tool.ts       # Invoice loading tool
│   ├── invoice-validation-tools.ts # Validation tools for analyzer
│   └── weather-tool.ts            # Weather information tool
├── utils/
│   ├── knowledge-base-loader.ts   # Faenza KB utilities + validation
│   ├── runtime-utils.ts           # Runtime context helpers
│   └── stream-utils.ts            # Streaming utilities
├── vectors/
│   ├── index.ts                   # Vector store exports
│   ├── embedder.ts                # Embedding utilities
│   └── pgvector.ts                # PostgreSQL vector store
└── index.ts                       # Mastra instance

app/
├── (auth)/
│   ├── actions.ts                 # Auth server actions
│   ├── auth.ts                    # NextAuth configuration
│   ├── login/
│   │   └── page.tsx               # Login page
│   ├── register/
│   │   └── page.tsx               # Registration page
│   └── api/
│       └── auth/
│           └── [...nextauth]/     # NextAuth API routes
├── (chat)/
│   ├── page.tsx                   # Main chat page
│   ├── chat/
│   │   └── [id]/
│   │       └── page.tsx           # Chat session page
│   └── api/
│       ├── chat/
│       │   ├── route.ts           # Main chat endpoint
│       │   └── schema.ts          # Request validation schemas
│       ├── invoice/
│       │   └── route.ts           # Direct invoice loading API
│       ├── analyze-invoice/
│       │   └── route.ts           # Invoice analysis endpoint
│       ├── document/
│       │   └── route.ts           # Document CRUD endpoint
│       ├── history/
│       │   └── route.ts           # Chat history endpoint
│       ├── suggestions/
│       │   └── route.ts           # Suggestions endpoint
│       ├── smb/
│       │   └── route.ts           # SMB share endpoint
│       └── oracle/
│           ├── views/
│           │   └── route.ts       # List views + VPN status
│           ├── view-schema/
│           │   └── route.ts       # View column metadata
│           └── view-data/
│               └── route.ts       # Paginated view data

lib/
├── ai/
│   ├── agent-config.ts            # UI agent configuration
│   ├── client-tools.ts            # Client-side tool registry
│   ├── entitlements.ts            # Rate limiting and entitlements
│   ├── models.ts                  # Model configuration
│   ├── models.mock.ts             # Mock models for testing
│   └── prompts.ts                 # System prompts
├── activity-tracking/             # NEW: Activity attempt tracking
│   ├── index.ts                   # Module exports
│   ├── store.ts                   # AttemptStore class
│   ├── events.ts                  # ActivityEvent dispatcher
│   ├── errors.ts                  # AttemptError types
│   ├── types.ts                   # TypeScript interfaces
│   └── validation.ts              # Validation utilities
├── canvas/                        # NEW: Widget registry system
│   ├── index.ts                   # Module exports
│   ├── widget-registry.ts         # Widget type registry
│   ├── widget-context.tsx         # Widget React context
│   ├── widget-definitions.tsx     # Built-in widget definitions
│   └── visible-content-store.ts   # Visible content tracking
├── db/
│   ├── schema.ts                  # Drizzle database schema
│   ├── queries.ts                 # Database query functions
│   ├── utils.ts                   # Database utilities
│   ├── migrate.ts                 # Migration runner
│   ├── oracle-sibac.ts            # Oracle SIBAC client
│   ├── oracle-types.ts            # Oracle type definitions
│   └── migrations/                # Drizzle migrations
├── i18n/                          # Internationalization
│   ├── context.tsx                # Translation context
│   ├── use-translations.ts        # Translation hook
│   ├── types.ts                   # i18n types
│   ├── utils.ts                   # i18n utilities
│   └── translations/
│       ├── en.ts                  # English translations
│       └── it.ts                  # Italian translations
├── smb/
│   └── sibac-share.ts             # SMB share integration
├── vpn/
│   ├── faenza-vpn.ts              # Cross-platform VPN service
│   ├── vpnc.conf.template         # Linux vpnc config template
│   └── README.md                  # VPN setup documentation
├── templates/
│   ├── index.ts                   # Template registry
│   ├── types.ts                   # Template types
│   └── liquidation-determination.ts # Liquidation template (Documento di Liquidazione)
├── artifacts/
│   └── server.ts                  # Server-side artifact handling
├── branding/
│   ├── inject-script.ts           # Branding injection
│   └── theme-presets.ts           # Theme configuration
├── editor/                        # ProseMirror editor
│   ├── config.ts
│   ├── functions.tsx
│   └── ...
├── constants.ts                   # Application constants
├── errors.ts                      # Error types
├── types.ts                       # Shared TypeScript types
├── utils.ts                       # Utility functions
├── usage.ts                       # Usage tracking types
└── tokenlens.ts                   # Token usage enrichment

hooks/
├── use-canvas-tabs.ts             # Multi-tab canvas management
├── use-assistant-action.ts        # Client-side AI action registration
├── use-client-tools.ts            # Client tools registry access
├── use-artifact-streaming.ts      # Artifact streaming handler
├── use-artifact.ts                # Artifact state management
├── use-chat-document.ts           # Document state in chat
├── use-selected-agent.ts          # Agent selection state
├── use-runtime-config.ts          # Runtime configuration
├── use-branding.ts                # Branding configuration
├── use-demo-config.ts             # Demo mode configuration
├── use-chat-visibility.ts         # Chat visibility controls
├── use-chat-votes.ts              # Message voting
├── use-messages.tsx               # Chat messages management
├── use-mobile.ts                  # Mobile viewport detection
├── use-debounced-save.ts          # Debounced save operations
└── use-scroll-to-bottom.tsx       # Auto-scroll functionality

components/
├── activities/                    # NEW: Interactive activities
│   ├── index.ts                   # Activity registry and exports
│   ├── README.md                  # Activities documentation
│   ├── flashcards/
│   │   ├── index.tsx              # FlashcardActivity component
│   │   ├── components.tsx         # Flashcard sub-components
│   │   ├── player.tsx             # State management context
│   │   └── schema.tsx             # Zod schemas and types
│   ├── quiz/
│   │   ├── index.tsx              # QuizActivity component
│   │   ├── components.tsx         # Quiz sub-components
│   │   ├── player.tsx             # State management context
│   │   └── schema.tsx             # Zod schemas and types
│   └── document-selector/
│       ├── index.tsx              # Document selector activity
│       └── schema.tsx             # Document selector schemas
├── artifacts/
│   ├── index.ts                   # Artifact exports and types
│   ├── document.tsx               # Document artifact renderer
│   ├── document-selector.tsx      # Document selector panel
│   ├── markdown-viewer.tsx        # Markdown viewer
│   ├── media.tsx                  # Media artifacts
│   └── sibac-views-explorer.tsx   # SIBAC Views Explorer widget
├── chat/
│   ├── canvas.tsx                 # Resizable canvas layout
│   ├── canvas-tabs.tsx            # Multi-tab bar component
│   ├── canvas-widget.tsx          # Widget container
│   ├── agent-selector.tsx         # Agent selection UI
│   ├── composer.tsx               # Message composer
│   ├── context.tsx                # Chat context provider
│   ├── thread.tsx                 # Message thread
│   ├── message.tsx                # Message component
│   ├── message-parts.tsx          # Message part renderers
│   ├── streaming.tsx              # Streaming state management
│   ├── suggestions.tsx            # AI suggestions UI
│   └── ...
├── elements/                      # AI Elements UI components
│   ├── conversation.tsx           # Conversation wrapper
│   ├── message.tsx                # Message element
│   ├── response.tsx               # AI response element
│   ├── reasoning.tsx              # Reasoning display
│   ├── tool.tsx                   # Tool invocation display
│   ├── code-block.tsx             # Code block renderer
│   └── ...
├── tools/
│   ├── index.tsx                  # Tool component exports
│   ├── types.ts                   # Tool component types
│   ├── load-invoice.tsx           # Invoice tool UI
│   ├── document.tsx               # Document tool UI
│   ├── activity.tsx               # Activity tool UI
│   ├── weather.tsx                # Weather tool UI
│   └── fallback.tsx               # Fallback tool UI
├── ui/                            # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ... (30+ components)
├── demo-config/                   # Demo configuration panel
│   ├── index.tsx
│   ├── panel.tsx
│   └── ...
└── ... (other top-level components)

scripts/
├── setup-vpn-macos.sh             # macOS VPN setup script
├── setup-vpn-linux.sh             # Linux/AWS VPN setup script
└── diagnose-typescript.sh         # TypeScript diagnostics

tests/
├── e2e/                           # End-to-end tests
│   ├── chat.test.ts
│   ├── artifacts.test.ts
│   └── ...
├── routes/                        # Route tests
│   ├── chat.test.ts
│   └── document.test.ts
├── unit/                          # Unit tests
│   └── invoice-parser.test.ts
├── pages/                         # Page object models
│   ├── chat.ts
│   ├── auth.ts
│   └── artifact.ts
├── fixtures.ts                    # Test fixtures
└── helpers.ts                     # Test helpers
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

## Canvas Widget System

The canvas panel (right side of the application) implements a comprehensive widget registry system that allows users to work with multiple documents and widgets simultaneously. The system is designed for extensibility and provides streaming support for AI-generated content.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Canvas Component                            │
│  components/chat/canvas.tsx                                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Canvas Tabs                           │    │
│  │  components/chat/canvas-tabs.tsx                         │    │
│  │  [Tab 1] [Tab 2] [Tab 3] ...                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Widget Registry                        │    │
│  │  lib/canvas/widget-registry.ts                          │    │
│  │  - Lookup widget definition by kind                     │    │
│  │  - Get renderer component                               │    │
│  │  - Check streaming support                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Widget Context Provider                 │    │
│  │  lib/canvas/widget-context.tsx                          │    │
│  │  - Provides widget state to renderers                   │    │
│  │  - Manages content, status, metadata                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Widget Renderer                        │    │
│  │  (TextEditor, CodeEditor, SheetEditor, etc.)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **Widget Registry** | `lib/canvas/widget-registry.ts` | Centralized registry for widget type definitions |
| **Widget Context** | `lib/canvas/widget-context.tsx` | React context provider for widget state |
| **Widget Definitions** | `lib/canvas/widget-definitions.tsx` | Built-in widget type configurations |
| **Visible Content Store** | `lib/canvas/visible-content-store.ts` | Tracks visible content in active widgets |

### Widget Kinds

| Kind | Label | Multiple Allowed | Streaming | Icon |
|------|-------|------------------|-----------|------|
| `text` | Documento di testo | Yes | Yes | FileText |
| `code` | Codice | Yes | Yes | Code2 |
| `sheet` | Foglio di calcolo | Yes | Yes | FileSpreadsheet |
| `image` | Immagine | Yes | No | Image |
| `markdown-viewer` | Visualizzatore Markdown | Yes | No | BookOpenText |
| `document-selector` | Selettore documenti | No | No | LayoutGrid |
| `sibac-views-explorer` | Esplora Viste SIBAC | Yes | No | Database |

### Widget Status Lifecycle

```typescript
type WidgetStatus = "pending" | "idle" | "streaming" | "error";
```

| Status | Description |
|--------|-------------|
| `pending` | Tab opened before document ID is known (waiting for stream to start) |
| `idle` | Tab is ready and not actively streaming |
| `streaming` | Content is being streamed to the tab |
| `error` | An error occurred |

### Widget Registry API

```typescript
import { widgetRegistry, WIDGET_KINDS } from "@/lib/canvas";

// Register a custom widget
widgetRegistry.register({
  kind: "my-widget",
  label: "My Custom Widget",
  icon: MyIcon,
  renderer: MyWidgetRenderer,
  allowMultiple: true,
  supportsStreaming: false,
  defaultContent: "",
});

// Get widget definition
const definition = widgetRegistry.get(WIDGET_KINDS.TEXT);

// Check capabilities
const canStream = widgetRegistry.supportsStreaming("text"); // true
const allowsMultiple = widgetRegistry.allowsMultiple("document-selector"); // false

// Get renderer component
const Renderer = widgetRegistry.getRenderer("code");
```

### Widget Context Hooks

```typescript
import {
  useWidgetContext,
  useWidgetIdentity,
  useWidgetContent,
  useWidgetStatus,
  useWidgetActions,
  useWidgetMeta,
} from "@/lib/canvas";

function MyWidgetRenderer() {
  // Full context access
  const ctx = useWidgetContext();
  
  // Selective access (performance optimized)
  const { tabId, documentId, title } = useWidgetIdentity();
  const { content, onContentChange } = useWidgetContent();
  const { status } = useWidgetStatus();
  const { onClose } = useWidgetActions();
  const { meta } = useWidgetMeta();
  
  return <div>...</div>;
}
```

### Tab Data Structure

```typescript
type CanvasTabData<TContent = unknown, TMeta = unknown> = {
  id: string;           // Unique tab identifier
  kind: WidgetKind;     // Widget type
  documentId: string;   // Document identifier (for persistence/streaming)
  title: string;        // Tab title
  content: TContent;    // Widget content
  status: WidgetStatus; // Current status
  createdAt: number;    // Creation timestamp
  meta?: TMeta;         // Optional metadata
};
```

### Visible Content Store

The visible content store tracks what content is currently visible in the canvas, enabling the AI to be aware of the user's context:

```typescript
import {
  setVisibleContent,
  getVisibleContent,
  clearVisibleContent,
  subscribeToVisibleContent,
} from "@/lib/canvas";

// Set visible content for a tab
setVisibleContent("tab-123", {
  kind: "text",
  documentId: "doc-456",
  content: "Document content here...",
});

// Get visible content
const content = getVisibleContent("tab-123");

// Subscribe to changes
const unsubscribe = subscribeToVisibleContent("tab-123", (content) => {
  console.log("Content changed:", content);
});
```

### Adding a Custom Widget

1. Define the widget in `lib/canvas/widget-definitions.tsx`:

```typescript
export const myWidgetDefinition: WidgetDefinition<"my-widget", MyContent> = {
  kind: "my-widget",
  label: "My Widget",
  icon: MyIcon,
  renderer: MyWidgetRenderer,
  allowMultiple: true,
  supportsStreaming: false,
  defaultContent: { /* initial content */ },
};
```

2. Register in `registerBuiltInWidgets()`:

```typescript
export function registerBuiltInWidgets() {
  // ... existing registrations
  widgetRegistry.register(myWidgetDefinition);
}
```

3. Create the renderer component:

```typescript
function MyWidgetRenderer(props: WidgetRendererProps<MyContent>) {
  const { content, onContentChange, status } = props;
  
  return (
    <div className="p-4">
      {/* Widget UI */}
    </div>
  );
}
```

---

## Activity System

The Activity System provides interactive learning experiences that can be generated by AI and rendered within the chat. Activities include flashcards for study sessions and quizzes for knowledge assessment.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Model Generation                          │
│  - Generates ModelActivity with minimal schema                  │
│  - Uses Zod schemas for validation                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Activity Registry                             │
│  components/activities/index.ts                                  │
│  - Maps activity types to components, schemas, converters       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Conversion (toUI)                              │
│  - ModelActivity → UIActivity                                   │
│  - Validates and transforms AI output for UI                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Activity Component                              │
│  - FlashcardActivity or QuizActivity                            │
│  - Welcome, study/play, and completion screens                  │
└─────────────────────────────────────────────────────────────────┘
```

### Activity Registry

The registry maps activity types to their components, schemas, and conversion functions:

```typescript
import { activities, isValidActivityType, getActivityComponent } from "@/components/activities";

// Available activity types
const activityTypes = Object.keys(activities); // ["flashcard", "quiz"]

// Check if a type is valid
if (isValidActivityType("flashcard")) {
  const Component = getActivityComponent("flashcard");
}

// Get schema for AI generation
const schema = getActivitySchema("quiz");
```

### Activity Types

| Type | Component | Purpose |
|------|-----------|---------|
| `flashcard` | `FlashcardActivity` | Study sessions with front/back cards |
| `quiz` | `QuizActivity` | Multiple-choice knowledge assessment |

### Model vs UI Activity Types

Activities have two type variants:

1. **ModelActivity** - Minimal schema for AI generation (auto-generated IDs, simpler structure)
2. **UIActivity** - Full schema for UI components (required IDs, complete structure)

```typescript
// Model activity (from AI)
type ModelActivity<T extends string, P> = {
  id?: string;           // Auto-generated if not provided
  type: T;
  payload: P;
  title: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  objectives?: string[];
};

// UI activity (for components)
type UIActivity<T extends string, P> = {
  id: string;            // Required
  type: T;
  payload: P;
  title: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  objectives: string[];  // Required (can be empty array)
};
```

### Flashcard Activity

**Schema (Model - for AI generation):**

```typescript
const ModelFlashcardSchema = z.object({
  id: z.string().default(generateUUID),
  front: z.string().describe("Question or prompt"),
  back: z.string().describe("Answer or explanation"),
  hint: z.string().describe("Guide without giving away the answer"),
  explanation: z.string().optional(),
});
```

**Component Usage:**

```typescript
import { FlashcardActivity } from "@/components/activities";

<FlashcardActivity
  activity={uiFlashcardActivity}
  shuffle={true}
  showHints={true}
  trackConfidence={true}
  defaultScreen="welcome"
/>
```

**Screens:**
- **Welcome Screen**: Shows card count, estimated time, start button
- **Study Screen**: Card display with flip, navigation, confidence rating
- **End Screen**: Statistics, confidence distribution, restart option

### Quiz Activity

**Schema (Model - for AI generation):**

```typescript
const ModelQuizQuestionSchema = z.object({
  id: z.string().default(generateUUID),
  question: z.string().describe("Clear, specific question"),
  choices: z.array(z.string()).min(2).max(6),
  correctAnswerIndex: z.number().describe("Index of correct choice"),
  explanation: z.string().optional(),
});
```

**Component Usage:**

```typescript
import { QuizActivity } from "@/components/activities";

<QuizActivity
  activity={uiQuizActivity}
  shuffle={true}
  showExplanations={true}
  defaultScreen="welcome"
/>
```

### Conversion Functions

Each activity type has a `toUI` function that converts AI-generated data to UI format:

```typescript
import { toChatActivity } from "@/components/activities";

// Convert model activity to UI activity
const uiActivity = toChatActivity("flashcard", modelFlashcardActivity);
const quizUI = toChatActivity("quiz", modelQuizActivity);
```

### Adding a New Activity Type

1. Create the activity folder in `components/activities/`:

```
components/activities/my-activity/
├── index.tsx         # Main activity component
├── components.tsx    # Sub-components
├── player.tsx        # State management context
└── schema.tsx        # Zod schemas and types
```

2. Define schemas in `schema.tsx`:

```typescript
// Model schema (for AI)
export const ModelMyActivitySchema = z.object({
  id: z.string().default(generateUUID),
  // ... fields
});

// UI schema (for components)
export const UIMyActivitySchema = z.object({
  id: z.string(),
  // ... fields
});

// Conversion function
export function toUIMyActivity(source: ModelMyActivity): UIMyActivity {
  // Transform model to UI format
}
```

3. Register in `components/activities/index.ts`:

```typescript
import { MyActivity } from "./my-activity";
import { ModelMyActivitySchema, toUIMyActivity } from "./my-activity/schema";

export const activities = {
  // ... existing
  "my-activity": defineActivity({
    type: "my-activity",
    Component: MyActivity,
    schema: z.array(ModelMyActivitySchema),
    toUI: toUIMyActivity,
  }),
};
```

---

## Activity Tracking System

The Activity Tracking System provides state management for interactive activities, tracking user attempts, progress, and scores.

### Overview

Located in `lib/activity-tracking/`, this system provides:
- Attempt lifecycle management (start, complete, cancel)
- Event dispatching for activity state changes
- Score tracking and validation
- Subscription-based state updates

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **AttemptStore** | `lib/activity-tracking/store.ts` | Main state management class |
| **ActivityEvent** | `lib/activity-tracking/events.ts` | Custom event dispatching |
| **AttemptError** | `lib/activity-tracking/errors.ts` | Error types for attempt operations |

### Attempt States

```typescript
type AttemptStatus = "pending" | "in_progress" | "completed" | "cancelled";
```

| Status | Description |
|--------|-------------|
| `pending` | Initial state, attempt not yet started |
| `in_progress` | User is actively working on the activity |
| `completed` | Activity finished (with or without score) |
| `cancelled` | User cancelled the activity |

### Using the AttemptStore

```typescript
import { createAttemptStore } from "@/lib/activity-tracking";

// Create a store for an activity
const store = createAttemptStore<StartData, CompleteData>(
  "flashcards-session-123",  // Activity ID
  "flashcard"                 // Activity type
);

// Start an attempt
store.start({ shuffled: true, cardCount: 10 });

// Get current state
const state = store.getState();
// { status: "in_progress", startedAt: Date, ... }

// Complete the attempt
store.complete({
  score: { correct: 8, total: 10 },
  timeSpent: 120,
});

// Subscribe to state changes
const unsubscribe = store.subscribe((state, event) => {
  console.log("State changed:", state, event);
});
```

### Attempt Interface

```typescript
type Attempt<START = unknown, COMPLETE = unknown> = {
  id: string;
  activityId: string;
  activityType: string;
  status: AttemptStatus;
  startedAt?: Date;
  completedAt?: Date;
  startData?: START;
  completeData?: COMPLETE;
  score?: AttemptScore;
};

type AttemptScore = {
  correct: number;
  total: number;
  percentage?: number;
};
```

### Event System

The `ActivityEvent` class provides custom event dispatching:

```typescript
import { ActivityEvent } from "@/lib/activity-tracking";

// Events are dispatched on state changes
// - "attempt:start"
// - "attempt:complete"
// - "attempt:cancel"
// - "attempt:reset"
```

### Error Handling

```typescript
import { AttemptError } from "@/lib/activity-tracking";

try {
  store.start(data);
} catch (error) {
  if (error instanceof AttemptError) {
    console.error("Attempt error:", error.code, error.message);
  }
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

#### Document Template Not Using Invoice Data

**Symptom**: When creating a "Documento di Liquidazione", the template shows "DA COMPILARE" for all fields instead of invoice data.

**Cause**: The `createDocument` tool wasn't finding the invoice context.

**Fix Applied**: The tool now checks multiple sources for invoice data:
1. Explicit `invoiceFileId` parameter from the agent
2. `selectedInvoiceRecordId` from runtime context (UI selection)
3. `loadedInvoice` from previous `loadInvoice` tool call

**Debug**:
```typescript
// Check console logs for:
[CreateDocument] Loading from selectedInvoiceRecordId: sibac-shared:...
[CreateDocument] Invoice loaded from selection: SUPPLIER_NAME, amount=1234.56
[CreateDocument] title="...", kind="text", hasInvoiceContext=true
```

#### Document Has Wrong Invoice Data or Intro/Outro Text

**Symptom**: When creating a "Documento di Liquidazione", the document shows incorrect data (N/A or wrong values) or has unwanted introductory/closing text from the LLM.

**Causes**:
1. The `formatInvoiceDataForAgent()` function was using wrong field names that didn't match the actual `InvoiceMetadata` type
2. The system prompt wasn't explicit enough about not adding intro/outro text

**Fix Applied** (New Architecture):

1. **Template moved to main agent prompt** (`mastra/agents/faenza/invoices-manager/system-prompt.ts`):
   - Full Markdown template included in the main agent's system prompt
   - Placeholder-to-data mapping table with examples
   - Formatting rules (Italian numbers: 1.234,56 / dates: GG/MM/AAAA)
   - Agent fills the template and passes content to `createDocument`

2. **createDocument tool enhanced** (`mastra/tools/create-document-tool.ts`):
   - New `content` parameter allows agent to pass filled template directly
   - When content is provided, streams it to canvas without generating
   - `invoiceFileId` parameter for reference

3. **Text handler simplified** (`artifacts/text/server.ts`):
   - No longer handles template-based documents
   - Only handles generic document generation and updates

**Debug**:
```typescript
// Check console logs for:
[TextHandler] Creating document: title="...", hasInvoiceContext=true
[TextHandler] Template search result: liquidation-determination
[TextHandler] Using template "liquidation-determination" + invoice data for agent generation
```

#### Streaming Content Has Missing Characters

**Symptom**: During template streaming, some parts of words appear to be missing or garbled.

**Cause**: Individual `startTransition` calls for each chunk could be batched/dropped during rapid streaming (10ms intervals).

**Fix Applied**: Implemented a batching mechanism in `components/chat/context.tsx`:
- Data parts are accumulated synchronously in a ref (no chunks dropped)
- Batched state updates via `requestAnimationFrame` (~16ms intervals)
- `startTransition` is used for the batched update (non-blocking UI)

This hybrid approach ensures no data is lost while maintaining smooth UI performance.

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
