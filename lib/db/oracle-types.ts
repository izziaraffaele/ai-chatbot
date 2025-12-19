/**
 * Oracle Database Types for SIBAC Integration
 *
 * Type definitions for the SIB_V_IMPEGNI_X_CIG database view
 * and related Oracle database operations.
 */

/**
 * Raw record from SIB_V_IMPEGNI_X_CIG view
 *
 * NOTE: This schema is based on the view name and common Italian PA patterns.
 * The actual columns should be discovered using discoverViewSchema() on first connection.
 * Update this type after schema discovery.
 */
export type ImpegnoRecord = {
  /** Unique identifier for the impegno (commitment) */
  ID_IMPEGNO?: number;

  /** CIG - Codice Identificativo Gara (tender identification code) */
  CIG?: string;

  /** CUP - Codice Unico di Progetto (unique project code) */
  CUP?: string;

  /** Description of the impegno/commitment */
  DESCRIZIONE?: string;

  /** Total amount of the commitment */
  IMPORTO?: number;

  /** Year of the commitment */
  ANNO?: number;

  /** Commitment number within the year */
  NUMERO_IMPEGNO?: number;

  /** Supplier/beneficiary name */
  BENEFICIARIO?: string;

  /** Supplier/beneficiary tax code (Codice Fiscale) */
  CODICE_FISCALE?: string;

  /** Supplier/beneficiary VAT number (Partita IVA) */
  PARTITA_IVA?: string;

  /** IBAN for payment */
  IBAN?: string;

  /** PA destination code */
  CODICE_PA?: string;

  /** Status of the commitment */
  STATO?: string;

  /** Creation date */
  DATA_CREAZIONE?: Date;

  /** Last modification date */
  DATA_MODIFICA?: Date;

  // Allow for additional columns discovered at runtime
  // biome-ignore lint/suspicious/noExplicitAny: Oracle returns dynamic columns
  [key: string]: any;
};

/**
 * Mapped impegno data for the UI
 *
 * This maps the Oracle record to the format expected by the UI fatture components.
 */
export type ImpegnoForUI = {
  /** Unique identifier (constructed from available data) */
  fileId: string;

  /** Display name for the record */
  displayName: string;

  /** CIG code */
  cig: string | null;

  /** CUP code */
  cup: string | null;

  /** Description */
  descrizione: string | null;

  /** Amount */
  importo: number | null;

  /** Beneficiary/supplier name */
  beneficiario: string | null;

  /** Codice Fiscale */
  codiceFiscale: string | null;

  /** Partita IVA */
  partitaIva: string | null;

  /** IBAN */
  iban: string | null;

  /** Codice PA */
  codicePA: string | null;

  /** Year */
  anno: number | null;

  /** Commitment number */
  numeroImpegno: number | null;

  /** Status */
  stato: string | null;

  /** Raw Oracle record for reference */
  rawRecord: ImpegnoRecord;
};

/**
 * Validation result for an impegno record
 * Mirrors the invoice validation structure for UI compatibility
 */
export type ImpegnoValidation = {
  iban: string | null;
  cig: string | null;
  cup: string | null;
  codiceFornitore: string | null;
  importoSpesa: number | null;
  descrizioneSpesa: string | null;
  codicePA: string | null;
  codiceFiscale: string | null;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
};

/**
 * Oracle connection configuration
 */
export type OracleConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  serviceName?: string;
  sid?: string;
};

/**
 * Column metadata from Oracle schema discovery
 */
export type OracleColumnInfo = {
  columnName: string;
  dataType: string;
  nullable: boolean;
  dataLength?: number;
  dataPrecision?: number;
  dataScale?: number;
};

/**
 * Result of schema discovery
 */
export type SchemaDiscoveryResult = {
  success: boolean;
  tableName: string;
  columns: OracleColumnInfo[];
  error?: string;
};

/**
 * Query options for fetching impegni
 */
export type ImpegniQueryOptions = {
  /** Filter by CIG code */
  cig?: string;

  /** Filter by CUP code */
  cup?: string;

  /** Filter by year */
  anno?: number;

  /** Filter by beneficiary name (partial match) */
  beneficiario?: string;

  /** Maximum number of records to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
};

/**
 * Available Oracle users for connection
 * Each user has access to a specific view in their schema
 */
export const ORACLE_USERS = [
  "cp_ia01",
  "cp_ia02",
  "cp_ia03",
  "cp_ia04",
  "cp_ia05",
  "cp_ia06",
  "cp_ia07",
  "cp_ia08",
] as const;

export type OracleUser = (typeof ORACLE_USERS)[number];

/**
 * Mapping of Oracle users to their tablespace/view
 */
export const USER_VIEW_MAPPING: Record<OracleUser, string> = {
  cp_ia01: "sib01.SIB_V_IMPEGNI_X_CIG",
  cp_ia02: "sib02.SIB_V_IMPEGNI_X_CIG",
  cp_ia03: "sib03.SIB_V_IMPEGNI_X_CIG",
  cp_ia04: "sib04.SIB_V_IMPEGNI_X_CIG",
  cp_ia05: "sib05.SIB_V_IMPEGNI_X_CIG",
  cp_ia06: "sib06.SIB_V_IMPEGNI_X_CIG",
  cp_ia07: "sib07.SIB_V_IMPEGNI_X_CIG",
  cp_ia08: "sib08.SIB_V_IMPEGNI_X_CIG",
};

/**
 * Default password for all Oracle users
 */
export const ORACLE_DEFAULT_PASSWORD = "p4ss_ia1";
