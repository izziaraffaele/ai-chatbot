"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
} from "@/components/chat/artifact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { cn } from "@/lib/utils";
import type { OracleViewsResponse } from "@/app/(chat)/api/oracle/views/route";
import type { OracleViewSchemaResponse } from "@/app/(chat)/api/oracle/view-schema/route";
import type { OracleViewDataResponse } from "@/app/(chat)/api/oracle/view-data/route";
import type { ImpegnoRecord, OracleColumnInfo } from "@/lib/db/oracle-types";

// ============================================================================
// TYPES
// ============================================================================

type ConnectionStatus =
  | "ok"
  | "vpn_disconnected"
  | "server_unreachable"
  | "port_blocked"
  | "ssh_tunnel_available"
  | "ssh_tunnel_error"
  | "loading"
  | "error";

type ViewState = {
  status: ConnectionStatus;
  statusMessage: string;
  sshTunnelEnabled: boolean;
  sshTunnelConnected: boolean;
  selectedUser: string;
  columns: OracleColumnInfo[];
  rows: ImpegnoRecord[];
  currentPage: number;
  pageSize: number;
  cigFilter: string;
  isLoadingSchema: boolean;
  isLoadingData: boolean;
  error: string | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const USERS = [
  { value: "all", label: "Tutti (Aggregato)" },
  { value: "cp_ia01", label: "cp_ia01 (SIB01)" },
  { value: "cp_ia02", label: "cp_ia02 (SIB02)" },
  { value: "cp_ia03", label: "cp_ia03 (SIB03)" },
  { value: "cp_ia04", label: "cp_ia04 (SIB04)" },
  { value: "cp_ia05", label: "cp_ia05 (SIB05)" },
  { value: "cp_ia06", label: "cp_ia06 (SIB06)" },
  { value: "cp_ia07", label: "cp_ia07 (SIB07)" },
  { value: "cp_ia08", label: "cp_ia08 (SIB08)" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Priority columns to show first in the table
const PRIORITY_COLUMNS = ["CIG", "CUP", "BENEFICIARIO", "IMPORTO", "DESCRIZIONE", "ANNO", "STATO"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: ConnectionStatus, sshTunnelConnected?: boolean) {
  switch (status) {
    case "ok":
      // Show terminal icon if connected via SSH tunnel
      return sshTunnelConnected ? (
        <Terminal className="size-4 text-emerald-500" />
      ) : (
        <Wifi className="size-4 text-emerald-500" />
      );
    case "loading":
      return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
    case "vpn_disconnected":
      return <WifiOff className="size-4 text-red-500" />;
    case "server_unreachable":
    case "port_blocked":
    case "ssh_tunnel_error":
      return <AlertTriangle className="size-4 text-amber-500" />;
    case "ssh_tunnel_available":
      return <Terminal className="size-4 text-blue-500" />;
    default:
      return <AlertTriangle className="size-4 text-red-500" />;
  }
}

function getStatusBadgeVariant(status: ConnectionStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ok":
      return "default";
    case "loading":
      return "secondary";
    case "ssh_tunnel_available":
      return "outline";
    default:
      return "destructive";
  }
}

function getStatusLabel(status: ConnectionStatus, sshTunnelConnected?: boolean): string {
  switch (status) {
    case "ok":
      return sshTunnelConnected ? "SSH Tunnel" : "Connesso";
    case "loading":
      return "Verifica...";
    case "ssh_tunnel_available":
      return "SSH Disponibile";
    case "ssh_tunnel_error":
      return "Errore SSH";
    default:
      return "Disconnesso";
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return value.toLocaleString("it-IT");
  }
  if (value instanceof Date) {
    return value.toLocaleDateString("it-IT");
  }
  return String(value);
}

function sortColumnsByPriority(columns: OracleColumnInfo[]): OracleColumnInfo[] {
  return [...columns].sort((a, b) => {
    const aIndex = PRIORITY_COLUMNS.indexOf(a.columnName);
    const bIndex = PRIORITY_COLUMNS.indexOf(b.columnName);
    
    // Both in priority list - sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Only a is in priority list - a comes first
    if (aIndex !== -1) {
      return -1;
    }
    // Only b is in priority list - b comes first
    if (bIndex !== -1) {
      return 1;
    }
    // Neither in priority list - alphabetical
    return a.columnName.localeCompare(b.columnName);
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export type SibacViewsExplorerArtifactProps = {
  className?: string;
};

export function SibacViewsExplorerArtifact({
  className,
}: SibacViewsExplorerArtifactProps) {
  const { activeTab, closeTab } = useCanvasTabs();
  
  // View state
  const [state, setState] = useState<ViewState>({
    status: "loading",
    statusMessage: "Verifica connessione...",
    sshTunnelEnabled: false,
    sshTunnelConnected: false,
    selectedUser: "cp_ia01",
    columns: [],
    rows: [],
    currentPage: 0,
    pageSize: 25,
    cigFilter: "",
    isLoadingSchema: false,
    isLoadingData: false,
    error: null,
  });

  // Selected row for detail view
  const [selectedRow, setSelectedRow] = useState<ImpegnoRecord | null>(null);

  // CIG search input (debounced)
  const [cigInput, setCigInput] = useState("");

  // ============================================================================
  // API CALLS
  // ============================================================================

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    setState(prev => ({ ...prev, status: "loading", statusMessage: "Verifica connessione..." }));
    
    try {
      const response = await fetch("/api/oracle/views");
      const data: OracleViewsResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        status: data.status.status,
        statusMessage: data.status.message,
        sshTunnelEnabled: data.status.sshTunnelEnabled ?? false,
        sshTunnelConnected: data.status.sshTunnelConnected ?? false,
      }));
      
      return data.success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: "error",
        statusMessage: `Errore: ${error instanceof Error ? error.message : String(error)}`,
        sshTunnelEnabled: false,
        sshTunnelConnected: false,
      }));
      return false;
    }
  }, []);

  // Fetch schema for selected user
  const fetchSchema = useCallback(async (userParam: string) => {
    // For aggregated view, use cp_ia01 schema as reference
    const user = userParam === "all" ? "cp_ia01" : userParam;
    
    setState(prev => ({ ...prev, isLoadingSchema: true }));
    
    try {
      const response = await fetch(`/api/oracle/view-schema?user=${user}`);
      const data: OracleViewSchemaResponse = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          columns: sortColumnsByPriority(data.columns),
          isLoadingSchema: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          columns: [],
          isLoadingSchema: false,
          error: data.error ?? "Schema fetch failed",
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        columns: [],
        isLoadingSchema: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  // Fetch data with pagination and filters
  const fetchData = useCallback(async (user: string, page: number, pageSize: number, cig?: string) => {
    setState(prev => ({ ...prev, isLoadingData: true, error: null }));
    
    try {
      const params = new URLSearchParams({
        user,
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (cig) {
        params.set("cig", cig);
      }
      
      const response = await fetch(`/api/oracle/view-data?${params}`);
      const data: OracleViewDataResponse = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          rows: data.rows,
          isLoadingData: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          rows: [],
          isLoadingData: false,
          error: data.error ?? "Data fetch failed",
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        rows: [],
        isLoadingData: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  // ============================================================================
  // REFS
  // ============================================================================
  
  const isInitialized = useRef(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial load - check connection status (runs once on mount)
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
    
    const init = async () => {
      setState(prev => ({ ...prev, status: "loading", statusMessage: "Verifica connessione..." }));
      
      try {
        const statusResponse = await fetch("/api/oracle/views");
        const statusData: OracleViewsResponse = await statusResponse.json();
        
        setState(prev => ({
          ...prev,
          status: statusData.status.status,
          statusMessage: statusData.status.message,
          sshTunnelEnabled: statusData.status.sshTunnelEnabled ?? false,
          sshTunnelConnected: statusData.status.sshTunnelConnected ?? false,
        }));
        
        if (statusData.success) {
          // Fetch schema
          setState(prev => ({ ...prev, isLoadingSchema: true }));
          const schemaResponse = await fetch("/api/oracle/view-schema?user=cp_ia01");
          const schemaData: OracleViewSchemaResponse = await schemaResponse.json();
          
          if (schemaData.success) {
            setState(prev => ({
              ...prev,
              columns: sortColumnsByPriority(schemaData.columns),
              isLoadingSchema: false,
            }));
          }
          
          // Fetch initial data
          setState(prev => ({ ...prev, isLoadingData: true }));
          const dataResponse = await fetch("/api/oracle/view-data?user=cp_ia01&limit=25&offset=0");
          const dataData: OracleViewDataResponse = await dataResponse.json();
          
          if (dataData.success) {
            setState(prev => ({
              ...prev,
              rows: dataData.rows,
              isLoadingData: false,
            }));
          } else {
            setState(prev => ({
              ...prev,
              isLoadingData: false,
              error: dataData.error ?? "Data fetch failed",
            }));
          }
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: "error",
          statusMessage: `Errore: ${error instanceof Error ? error.message : String(error)}`,
          isLoadingSchema: false,
          isLoadingData: false,
        }));
      }
    };
    
    init();
  }, []);

  // Handle user change
  const handleUserChange = useCallback(async (user: string) => {
    setState(prev => ({ ...prev, selectedUser: user, currentPage: 0 }));
    await fetchSchema(user);
    await fetchData(user, 0, state.pageSize, state.cigFilter || undefined);
  }, [fetchSchema, fetchData, state.pageSize, state.cigFilter]);

  // Handle page change
  const handlePageChange = useCallback(async (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
    await fetchData(state.selectedUser, page, state.pageSize, state.cigFilter || undefined);
  }, [fetchData, state.selectedUser, state.pageSize, state.cigFilter]);

  // Handle page size change
  const handlePageSizeChange = useCallback(async (size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 0 }));
    await fetchData(state.selectedUser, 0, size, state.cigFilter || undefined);
  }, [fetchData, state.selectedUser, state.cigFilter]);

  // Handle CIG search
  const handleCigSearch = useCallback(async () => {
    const cig = cigInput.trim().toUpperCase();
    setState(prev => ({ ...prev, cigFilter: cig, currentPage: 0 }));
    await fetchData(state.selectedUser, 0, state.pageSize, cig || undefined);
  }, [cigInput, fetchData, state.selectedUser, state.pageSize]);

  // Handle clear CIG filter
  const handleClearCigFilter = useCallback(async () => {
    setCigInput("");
    setState(prev => ({ ...prev, cigFilter: "", currentPage: 0 }));
    await fetchData(state.selectedUser, 0, state.pageSize);
  }, [fetchData, state.selectedUser, state.pageSize]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    const isConnected = await fetchStatus();
    if (isConnected) {
      await fetchData(state.selectedUser, state.currentPage, state.pageSize, state.cigFilter || undefined);
    }
  }, [fetchStatus, fetchData, state.selectedUser, state.currentPage, state.pageSize, state.cigFilter]);

  // Handle close
  const handleClose = useCallback(() => {
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [activeTab, closeTab]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isLoading = state.isLoadingSchema || state.isLoadingData;
  const canFetchData = state.status === "ok";
  const hasData = state.rows.length > 0;
  const hasMorePages = state.rows.length === state.pageSize;

  // Visible columns (limit to avoid horizontal overflow)
  const visibleColumns = useMemo(() => {
    return state.columns.slice(0, 8);
  }, [state.columns]);

  // ============================================================================
  // RENDER: ROW DETAIL VIEW
  // ============================================================================

  if (selectedRow) {
    return (
      <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
        <ChatArtifactHeader
          actions={
            <Button onClick={() => setSelectedRow(null)} size="sm" variant="ghost">
              <X className="mr-2 size-4" />
              Chiudi
            </Button>
          }
          onClose={handleClose}
          subtitle="Dettaglio record"
          title="Vista Record"
        />
        <ChatArtifactBody>
          <div className="flex h-full flex-col overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.entries(selectedRow)
                .filter(([key]) => !key.startsWith("_"))
                .map(([key, value]) => (
                  <div
                    className="rounded-lg border border-border bg-card p-3"
                    key={key}
                  >
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {key}
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {formatCellValue(value)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </ChatArtifactBody>
      </ChatArtifact>
    );
  }

  // ============================================================================
  // RENDER: MAIN VIEW
  // ============================================================================

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(state.status)}>
              {getStatusIcon(state.status, state.sshTunnelConnected)}
              <span className="ml-1.5">{getStatusLabel(state.status, state.sshTunnelConnected)}</span>
            </Badge>
            <Button
              disabled={state.status === "loading"}
              onClick={handleRefresh}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        }
        onClose={handleClose}
        subtitle="Esplora le viste Oracle SIBAC"
        title={activeTab?.title ?? "Viste SIBAC"}
      />

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Controls */}
          <div className="flex flex-col gap-3 border-border border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* User Selector */}
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <Select
                disabled={!canFetchData || isLoading}
                onValueChange={handleUserChange}
                value={state.selectedUser}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleziona utente" />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CIG Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute left-3 top-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 pr-8 w-40"
                  disabled={!canFetchData || isLoading}
                  onChange={(e) => setCigInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCigSearch();
                    }
                  }}
                  placeholder="Cerca CIG..."
                  value={cigInput}
                />
                {state.cigFilter && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={handleClearCigFilter}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button
                disabled={!canFetchData || isLoading || !cigInput.trim()}
                onClick={handleCigSearch}
                size="sm"
                variant="secondary"
              >
                Cerca
              </Button>
            </div>

            {/* Page Size */}
            <Select
              disabled={!canFetchData || isLoading}
              onValueChange={(v) => handlePageSizeChange(Number(v))}
              value={String(state.pageSize)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} righe
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Messages */}
          {state.status !== "ok" && state.status !== "loading" && (
            <div className={cn(
              "mx-4 mt-4 rounded-lg border p-4",
              state.status === "ssh_tunnel_available"
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            )}>
              <div className="flex items-center gap-2">
                {getStatusIcon(state.status, state.sshTunnelConnected)}
                <span>{state.statusMessage}</span>
              </div>
              {state.status === "ssh_tunnel_available" && (
                <p className="mt-2 text-sm opacity-80">
                  Per abilitare il tunnel SSH, impostare SSH_TUNNEL_ENABLED=true nelle variabili d&apos;ambiente.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {state.error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span>Caricamento dati...</span>
              </div>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && canFetchData && (
            <div className="flex-1 overflow-auto p-4">
              {hasData ? (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map((col) => (
                          <TableHead className="whitespace-nowrap" key={col.columnName}>
                            {col.columnName}
                          </TableHead>
                        ))}
                        {state.columns.length > visibleColumns.length && (
                          <TableHead className="text-muted-foreground">
                            +{state.columns.length - visibleColumns.length}
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.rows.map((row, index) => (
                        <TableRow
                          className="cursor-pointer hover:bg-accent/50"
                          // biome-ignore lint/suspicious/noArrayIndexKey: rows don't have stable unique IDs
                          key={index}
                          onClick={() => setSelectedRow(row)}
                        >
                          {visibleColumns.map((col) => (
                            <TableCell
                              className="max-w-48 truncate"
                              key={col.columnName}
                              title={formatCellValue(row[col.columnName])}
                            >
                              {formatCellValue(row[col.columnName])}
                            </TableCell>
                          ))}
                          {state.columns.length > visibleColumns.length && (
                            <TableCell className="text-muted-foreground">...</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Database className="mb-3 size-10 opacity-50" />
                  <p className="font-medium">Nessun record trovato</p>
                  {state.cigFilter && (
                    <p className="mt-1 text-sm">
                      Nessun risultato per CIG: {state.cigFilter}
                    </p>
                  )}
                </div>
              )}

              {/* Pagination */}
              {hasData && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Pagina {state.currentPage + 1} · {state.rows.length} record
                    {state.cigFilter && ` · Filtro CIG: ${state.cigFilter}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={state.currentPage === 0 || isLoading}
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronLeft className="size-4" />
                      Precedente
                    </Button>
                    <Button
                      disabled={!hasMorePages || isLoading}
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      size="sm"
                      variant="outline"
                    >
                      Successivo
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}
