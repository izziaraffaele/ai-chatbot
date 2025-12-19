/**
 * Oracle SIBAC Database Client
 *
 * Provides connection and query functions for the SIBAC Oracle database.
 * Connects via VPN to access all 8 SIB_V_IMPEGNI_X_CIG views (sib01-sib08).
 */

import oracledb from "oracledb";
import {
  isValidCIG,
  isValidCodiceDestinatario,
  isValidCodiceFiscale,
  isValidCUP,
  isValidIBAN,
  VALIDATION_FIELD_NAMES,
} from "@/mastra/utils/knowledge-base-loader";
import { withVpnConnection } from "../vpn/faenza-vpn";
import {
  type ImpegniQueryOptions,
  type ImpegnoForUI,
  type ImpegnoRecord,
  type ImpegnoValidation,
  ORACLE_DEFAULT_PASSWORD,
  ORACLE_USERS,
  type OracleColumnInfo,
  type OracleUser,
  type SchemaDiscoveryResult,
  USER_VIEW_MAPPING,
} from "./oracle-types";

// oracledb 6.x uses Thin mode by default (no Oracle Client installation required)

// Regex patterns at top level for performance
const SOURCE_PREFIX_REGEX = /^(cp_ia0[1-8]):(.+)$/;
const CIG_EXACT_REGEX = /^[A-Z0-9]{10}$/i;
const CIG_EXTRACT_REGEX = /([A-Z0-9]{10})/i;

/** Connection pools for each Oracle user */
const pools: Map<OracleUser, oracledb.Pool> = new Map();

/** Flags to track pool initialization per user */
const poolInitializing: Map<OracleUser, boolean> = new Map();

/**
 * Get Oracle connection configuration from environment
 */
function getConnectionConfig(user?: OracleUser) {
  const host = process.env.ORACLE_HOST ?? "192.168.0.204";
  const port = Number.parseInt(process.env.ORACLE_PORT ?? "1521", 10);
  const serviceName = process.env.ORACLE_SERVICE_NAME ?? "SIBAC";
  const selectedUser =
    user ?? ((process.env.ORACLE_USER ?? "cp_ia01") as OracleUser);
  const password = process.env.ORACLE_PASSWORD ?? ORACLE_DEFAULT_PASSWORD;

  return { host, port, serviceName, user: selectedUser, password };
}

/**
 * Build the Oracle connection string
 */
function buildConnectString(
  host: string,
  port: number,
  serviceName: string
): string {
  // Using Easy Connect syntax: host:port/service_name
  return `${host}:${port}/${serviceName}`;
}

/**
 * Initialize a connection pool for a specific user
 */
async function initializePoolForUser(user: OracleUser): Promise<oracledb.Pool> {
  const existingPool = pools.get(user);
  if (existingPool) {
    return existingPool;
  }

  if (poolInitializing.get(user)) {
    // Wait for the pool to be initialized
    while (poolInitializing.get(user)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const pool = pools.get(user);
    if (pool) {
      return pool;
    }
  }

  poolInitializing.set(user, true);

  try {
    const { host, port, serviceName, password } = getConnectionConfig(user);
    const connectString = buildConnectString(host, port, serviceName);

    console.log(`[Oracle] Initializing pool for ${user} to ${connectString}`);

    const pool = await oracledb.createPool({
      user,
      password,
      connectString,
      poolMin: 0,
      poolMax: 2,
      poolIncrement: 1,
      poolTimeout: 60,
      poolAlias: user,
    });

    pools.set(user, pool);
    console.log(`[Oracle] Pool for ${user} initialized successfully`);
    return pool;
  } catch (error) {
    console.error(`[Oracle] Failed to initialize pool for ${user}:`, error);
    throw error;
  } finally {
    poolInitializing.set(user, false);
  }
}

/**
 * Get a connection for a specific user
 */
async function getConnectionForUser(
  user: OracleUser
): Promise<oracledb.Connection> {
  const pool = await initializePoolForUser(user);
  return pool.getConnection();
}

/**
 * Close all connection pools
 */
export async function closeAllPools(): Promise<void> {
  const closePromises = Array.from(pools.entries()).map(
    async ([user, pool]) => {
      try {
        await pool.close(0);
        pools.delete(user);
        console.log(`[Oracle] Pool for ${user} closed`);
      } catch (error) {
        console.error(`[Oracle] Error closing pool for ${user}:`, error);
      }
    }
  );

  await Promise.all(closePromises);
}

/**
 * Discover the schema of the SIB_V_IMPEGNI_X_CIG view
 */
export async function discoverViewSchema(
  user?: OracleUser
): Promise<SchemaDiscoveryResult> {
  const targetUser = user ?? "cp_ia01";

  return withVpnConnection(async () => {
    const connection = await getConnectionForUser(targetUser);
    const viewName = USER_VIEW_MAPPING[targetUser] ?? "SIB_V_IMPEGNI_X_CIG";

    try {
      console.log(
        `[Oracle] Discovering schema for ${viewName} as ${targetUser}`
      );

      const result = await connection.execute(
        `SELECT 
          COLUMN_NAME as "columnName",
          DATA_TYPE as "dataType",
          NULLABLE as "nullable",
          DATA_LENGTH as "dataLength",
          DATA_PRECISION as "dataPrecision",
          DATA_SCALE as "dataScale"
        FROM ALL_TAB_COLUMNS 
        WHERE TABLE_NAME = 'SIB_V_IMPEGNI_X_CIG'
        ORDER BY COLUMN_ID`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = result.rows as Record<string, unknown>[] | undefined;
      const columns: OracleColumnInfo[] = (rows ?? []).map((row) => ({
        columnName: String(row.columnName ?? ""),
        dataType: String(row.dataType ?? ""),
        nullable: row.nullable === "Y",
        dataLength: row.dataLength as number | undefined,
        dataPrecision: row.dataPrecision as number | undefined,
        dataScale: row.dataScale as number | undefined,
      }));

      console.log(`[Oracle] Found ${columns.length} columns in ${viewName}`);

      return {
        success: true,
        tableName: viewName,
        columns,
      };
    } catch (error) {
      console.error(
        `[Oracle] Schema discovery failed for ${targetUser}:`,
        error
      );
      return {
        success: false,
        tableName: viewName,
        columns: [],
        error: String(error),
      };
    } finally {
      await connection.close();
    }
  });
}

/**
 * Query impegni from a single user's view
 */
async function queryImpegniForUser(
  user: OracleUser,
  options: ImpegniQueryOptions = {}
): Promise<{ user: OracleUser; records: ImpegnoForUI[]; error?: string }> {
  try {
    const connection = await getConnectionForUser(user);

    try {
      // Build the query - using synonym which points to the correct view
      let query = "SELECT * FROM SIB_V_IMPEGNI_X_CIG";
      const binds: Record<string, string | number> = {};
      const conditions: string[] = [];

      if (options.cig) {
        conditions.push("CIG = :cig");
        binds.cig = options.cig;
      }

      if (options.cup) {
        conditions.push("CUP = :cup");
        binds.cup = options.cup;
      }

      if (options.anno) {
        conditions.push("ANNO = :anno");
        binds.anno = options.anno;
      }

      if (options.beneficiario) {
        conditions.push("UPPER(BENEFICIARIO) LIKE :beneficiario");
        binds.beneficiario = `%${options.beneficiario.toUpperCase()}%`;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      // Add pagination - limit per view
      const limitPerView = Math.ceil(
        (options.limit ?? 100) / ORACLE_USERS.length
      );
      const offset = options.offset ?? 0;
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${limitPerView} ROWS ONLY`;

      const result = await connection.execute(query, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const records = (result.rows ?? []) as ImpegnoRecord[];
      console.log(`[Oracle] ${user}: Retrieved ${records.length} records`);

      return {
        user,
        records: records.map((r) => mapRecordToUI(r, user)),
      };
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.error(`[Oracle] Query failed for ${user}:`, error);
    return {
      user,
      records: [],
      error: String(error),
    };
  }
}

/**
 * List all impegni records from ALL database views
 *
 * Queries all 8 views (sib01-sib08) in parallel and aggregates results.
 */
export async function listImpegni(
  options: ImpegniQueryOptions = {}
): Promise<ImpegnoForUI[]> {
  return withVpnConnection(async () => {
    console.log("[Oracle] Querying all 8 views in parallel...");

    // Query all views in parallel
    const results = await Promise.all(
      ORACLE_USERS.map((user) => queryImpegniForUser(user, options))
    );

    // Aggregate results
    const allRecords: ImpegnoForUI[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.error) {
        errors.push(`${result.user}: ${result.error}`);
      }
      allRecords.push(...result.records);
    }

    if (errors.length > 0) {
      console.warn(
        `[Oracle] Some views had errors: ${errors.length}/${ORACLE_USERS.length}`
      );
    }

    console.log(`[Oracle] Total records retrieved: ${allRecords.length}`);

    // Apply global limit if needed
    const limit = options.limit ?? 100;
    if (allRecords.length > limit) {
      return allRecords.slice(0, limit);
    }

    return allRecords;
  });
}

/**
 * List impegni from a single user's view only
 */
export async function listImpegniForUser(
  user: OracleUser,
  options: ImpegniQueryOptions = {}
): Promise<ImpegnoForUI[]> {
  return withVpnConnection(async () => {
    const result = await queryImpegniForUser(user, options);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.records;
  });
}

/**
 * Get a specific impegno by CIG code (searches all views)
 */
export async function getImpegnoByCig(
  cig: string
): Promise<ImpegnoForUI | null> {
  const results = await listImpegni({ cig, limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Get a specific impegno by its identifier (CIG or composite ID)
 */
export async function getImpegnoById(id: string): Promise<ImpegnoForUI | null> {
  // Check if it contains a source prefix (e.g., "cp_ia01:CIG123456AB")
  const sourceMatch = id.match(SOURCE_PREFIX_REGEX);
  if (sourceMatch) {
    const user = sourceMatch[1] as OracleUser;
    const actualId = sourceMatch[2];
    const results = await listImpegniForUser(user, { cig: actualId, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  // If it looks like a CIG (10 alphanumeric chars), query by CIG
  if (CIG_EXACT_REGEX.test(id)) {
    return getImpegnoByCig(id);
  }

  // Otherwise, try to extract CIG from composite ID
  const cigMatch = id.match(CIG_EXTRACT_REGEX);
  if (cigMatch) {
    return getImpegnoByCig(cigMatch[1]);
  }

  return null;
}

/**
 * Map a raw Oracle record to the UI format
 */
function mapRecordToUI(
  record: ImpegnoRecord,
  sourceUser?: OracleUser
): ImpegnoForUI {
  const cig = record.CIG ?? record.cig ?? null;
  const anno = record.ANNO ?? record.anno ?? null;
  const numero = record.NUMERO_IMPEGNO ?? record.numero_impegno ?? null;

  // Create a unique identifier with source prefix for disambiguation
  let fileId: string;
  const prefix = sourceUser ? `${sourceUser}:` : "";

  if (cig) {
    fileId = `${prefix}${cig}`;
  } else if (anno && numero) {
    fileId = `${prefix}${anno}_${numero}`;
  } else if (record.ID_IMPEGNO) {
    fileId = `${prefix}IMP_${record.ID_IMPEGNO}`;
  } else {
    fileId = `${prefix}REC_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Create display name with source indicator
  const beneficiario =
    record.BENEFICIARIO ?? record.beneficiario ?? "Sconosciuto";
  const importo = record.IMPORTO ?? record.importo ?? 0;
  const sourceLabel = sourceUser
    ? ` [${sourceUser.replace("cp_ia0", "SIB0")}]`
    : "";
  const displayName = `${beneficiario} - €${importo.toLocaleString("it-IT")}${sourceLabel}`;

  return {
    fileId,
    displayName,
    cig: cig ? String(cig) : null,
    cup: record.CUP ?? record.cup ?? null,
    descrizione: record.DESCRIZIONE ?? record.descrizione ?? null,
    importo: record.IMPORTO ?? record.importo ?? null,
    beneficiario: record.BENEFICIARIO ?? record.beneficiario ?? null,
    codiceFiscale: record.CODICE_FISCALE ?? record.codice_fiscale ?? null,
    partitaIva: record.PARTITA_IVA ?? record.partita_iva ?? null,
    iban: record.IBAN ?? record.iban ?? null,
    codicePA: record.CODICE_PA ?? record.codice_pa ?? null,
    anno: anno ? Number(anno) : null,
    numeroImpegno: numero ? Number(numero) : null,
    stato: record.STATO ?? record.stato ?? null,
    rawRecord: record,
  };
}

/**
 * Validate an impegno record for required fields
 */
export function validateImpegno(impegno: ImpegnoForUI): ImpegnoValidation {
  const campiMancanti: string[] = [];
  const campiNonValidi: string[] = [];

  // Validate IBAN
  if (!impegno.iban) {
    campiMancanti.push("iban");
  } else if (!isValidIBAN(impegno.iban)) {
    campiNonValidi.push("iban");
  }

  // Validate CIG
  if (!impegno.cig) {
    campiMancanti.push("cig");
  } else if (!isValidCIG(impegno.cig)) {
    campiNonValidi.push("cig");
  }

  // Validate CUP
  if (!impegno.cup) {
    campiMancanti.push("cup");
  } else if (!isValidCUP(impegno.cup)) {
    campiNonValidi.push("cup");
  }

  // Validate Codice Fornitore (Partita IVA)
  if (!impegno.partitaIva) {
    campiMancanti.push("codiceFornitore");
  }

  // Validate Importo
  if (impegno.importo === null || impegno.importo === undefined) {
    campiMancanti.push("importoSpesa");
  }

  // Validate Descrizione
  if (!impegno.descrizione) {
    campiMancanti.push("descrizioneSpesa");
  }

  // Validate Codice PA
  if (!impegno.codicePA) {
    campiMancanti.push("codicePA");
  } else if (!isValidCodiceDestinatario(impegno.codicePA)) {
    campiNonValidi.push("codicePA");
  }

  // Validate Codice Fiscale
  if (!impegno.codiceFiscale) {
    campiMancanti.push("codiceFiscale");
  } else if (!isValidCodiceFiscale(impegno.codiceFiscale)) {
    campiNonValidi.push("codiceFiscale");
  }

  const fatturaValida =
    campiMancanti.length === 0 && campiNonValidi.length === 0;

  return {
    iban: impegno.iban && isValidIBAN(impegno.iban) ? impegno.iban : null,
    cig: impegno.cig && isValidCIG(impegno.cig) ? impegno.cig : null,
    cup: impegno.cup && isValidCUP(impegno.cup) ? impegno.cup : null,
    codiceFornitore: impegno.partitaIva,
    importoSpesa: impegno.importo,
    descrizioneSpesa: impegno.descrizione,
    codicePA:
      impegno.codicePA && isValidCodiceDestinatario(impegno.codicePA)
        ? impegno.codicePA
        : null,
    codiceFiscale:
      impegno.codiceFiscale && isValidCodiceFiscale(impegno.codiceFiscale)
        ? impegno.codiceFiscale
        : null,
    fatturaValida,
    campiMancanti: campiMancanti.map(
      (field) => VALIDATION_FIELD_NAMES[field] ?? field
    ),
    campiNonValidi: campiNonValidi.map(
      (field) => VALIDATION_FIELD_NAMES[field] ?? field
    ),
  };
}

/**
 * Convert an ImpegnoForUI to a metadata format compatible with InvoiceMetadata
 */
export function impegnoToMetadata(impegno: ImpegnoForUI) {
  return {
    fileId: impegno.fileId,
    fileName: impegno.displayName,
    supplier: impegno.beneficiario ?? undefined,
    supplierVatId: impegno.partitaIva ?? undefined,
    buyer: "Comune di Faenza",
    buyerVatId: undefined,
    date: undefined,
    invoiceNumber: impegno.numeroImpegno?.toString(),
    documentType: "IMPEGNO",
    totalAmount: impegno.importo ?? undefined,
    currency: "EUR",
  };
}

/**
 * Test database connection for all users
 */
export async function testAllConnections(): Promise<{
  success: boolean;
  results: Array<{ user: OracleUser; success: boolean; message: string }>;
}> {
  try {
    return await withVpnConnection(async () => {
      const results: Array<{
        user: OracleUser;
        success: boolean;
        message: string;
      }> = [];

      for (const user of ORACLE_USERS) {
        try {
          const connection = await getConnectionForUser(user);
          try {
            await connection.execute("SELECT 1 FROM DUAL");
            results.push({
              user,
              success: true,
              message: "Connessione riuscita",
            });
          } finally {
            await connection.close();
          }
        } catch (error) {
          results.push({
            user,
            success: false,
            message: `Errore: ${error}`,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        success: successCount > 0,
        results,
      };
    });
  } catch (error) {
    return {
      success: false,
      results: ORACLE_USERS.map((user) => ({
        user,
        success: false,
        message: `VPN Error: ${error}`,
      })),
    };
  }
}

/**
 * Test database connection for a single user
 */
export async function testConnection(user?: OracleUser): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  const targetUser = user ?? "cp_ia01";

  try {
    return await withVpnConnection(async () => {
      const connection = await getConnectionForUser(targetUser);

      try {
        const result = await connection.execute(
          "SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const rows = result.rows as Array<{ BANNER?: string }> | undefined;
        const banner = rows?.[0]?.BANNER ?? "Connected";

        return {
          success: true,
          message: "Connessione al database riuscita",
          details: {
            banner,
            user: targetUser,
          },
        };
      } finally {
        await connection.close();
      }
    });
  } catch (error) {
    return {
      success: false,
      message: `Connessione fallita: ${error}`,
    };
  }
}
