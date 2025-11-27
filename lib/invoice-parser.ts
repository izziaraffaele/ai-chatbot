// Types for parsed invoice data
export type ParsedInvoiceData = {
  supplierAddress: {
    indirizzo?: string;
    cap?: string;
    comune?: string;
    provincia?: string;
    nazione?: string;
  };
  reaData: {
    ufficio?: string;
    numero?: string;
    capitale?: string;
    socioUnico?: string;
    statoLiquidazione?: string;
  };
  buyerAddress: {
    indirizzo?: string;
    cap?: string;
    comune?: string;
    provincia?: string;
    nazione?: string;
  };
  trasmissione: {
    progressivo?: string;
    formatoTrasmissione?: string;
    codiceDestinatario?: string;
  };
  ordineData: {
    idDocumento?: string;
    numItem?: string;
    codiceCIG?: string;
    codiceCUP?: string;
  };
  salData: {
    riferimentoFase?: string;
  };
  ddtData: {
    numeroDDT?: string;
    dataDDT?: string;
  };
  causale?: string;
  lineItems: Array<{
    numero: string;
    descrizione: string;
    quantita?: string;
    prezzoUnitario?: string;
    sconto?: string;
    aliquotaIVA?: string;
    prezzoTotale?: string;
  }>;
  ivaRiepilogo: Array<{
    aliquota: string;
    imponibile: string;
    imposta: string;
    esigibilita?: string;
  }>;
  pagamento: {
    condizioni?: string;
    modalita?: string;
    dataScadenza?: string;
    importo?: string;
    istituto?: string;
    iban?: string;
  };
  contatti: {
    telefono?: string;
    fax?: string;
    email?: string;
  };
};

// Helper regex patterns (compiled once)
const TAG_REGEX_CACHE = new Map<string, RegExp>();
const BLOCK_REGEX_CACHE = new Map<string, RegExp>();

// Helper to extract a tag's text content
const extractTag = (tag: string, source: string): string | undefined => {
  let regex = TAG_REGEX_CACHE.get(tag);
  if (!regex) {
    regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    TAG_REGEX_CACHE.set(tag, regex);
  }
  const match = source.match(regex);
  return match ? match[1].trim() : undefined;
};

// Helper to extract a block (with nested content)
const extractBlock = (tag: string, source: string): string | undefined => {
  let regex = BLOCK_REGEX_CACHE.get(tag);
  if (!regex) {
    regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
    BLOCK_REGEX_CACHE.set(tag, regex);
  }
  const match = source.match(regex);
  return match ? match[1] : undefined;
};

// Specific regexes for data extraction
const INDIRIZZO_REGEX = /<Indirizzo>([^<]+)<\/Indirizzo>/i;
const CAP_REGEX = /<CAP>([^<]+)<\/CAP>/i;
const COMUNE_REGEX = /<Comune>([^<]+)<\/Comune>/i;
const PROVINCIA_REGEX = /<Provincia>([^<]+)<\/Provincia>/i;
const NAZIONE_REGEX = /<Nazione>([^<]+)<\/Nazione>/i;
const ISCRIZIONE_REA_REGEX = /<IscrizioneREA>([\s\S]*?)<\/IscrizioneREA>/i;
const UFFICIO_REGEX = /<Ufficio>([^<]+)<\/Ufficio>/i;
const NUMERO_REA_REGEX = /<NumeroREA>([^<]+)<\/NumeroREA>/i;
const CAPITALE_SOCIALE_REGEX = /<CapitaleSociale>([^<]+)<\/CapitaleSociale>/i;
const SOCIO_UNICO_REGEX = /<SocioUnico>([^<]+)<\/SocioUnico>/i;
const STATO_LIQUIDAZIONE_REGEX =
  /<StatoLiquidazione>([^<]+)<\/StatoLiquidazione>/i;
const SEDE_REGEX = /<Sede>([\s\S]*?)<\/Sede>/i;
const PROGRESSIVO_INVIO_REGEX =
  /<ProgressivoInvio>([^<]+)<\/ProgressivoInvio>/i;
const FORMATO_TRASMISSIONE_REGEX =
  /<FormatoTrasmissione>([^<]+)<\/FormatoTrasmissione>/i;
const CODICE_DESTINATARIO_REGEX =
  /<CodiceDestinatario>([^<]+)<\/CodiceDestinatario>/i;
const ID_DOCUMENTO_REGEX = /<IdDocumento>([^<]+)<\/IdDocumento>/i;
const NUM_ITEM_REGEX = /<NumItem>([^<]+)<\/NumItem>/i;
const CODICE_CIG_REGEX = /<CodiceCIG>([^<]+)<\/CodiceCIG>/i;
const CODICE_CUP_REGEX = /<CodiceCUP>([^<]+)<\/CodiceCUP>/i;
const RIFERIMENTO_FASE_REGEX = /<RiferimentoFase>([^<]+)<\/RiferimentoFase>/i;
const NUMERO_DDT_REGEX = /<NumeroDDT>([^<]+)<\/NumeroDDT>/i;
const DATA_DDT_REGEX = /<DataDDT>([^<]+)<\/DataDDT>/i;
const DETTAGLIO_LINEE_GLOBAL_REGEX =
  /<DettaglioLinee>([\s\S]*?)<\/DettaglioLinee>/gi;
const NUMERO_LINEA_REGEX = /<NumeroLinea>([^<]+)<\/NumeroLinea>/i;
const DESCRIZIONE_REGEX = /<Descrizione>([^<]+)<\/Descrizione>/i;
const QUANTITA_REGEX = /<Quantita>([^<]+)<\/Quantita>/i;
const PREZZO_UNITARIO_REGEX = /<PrezzoUnitario>([^<]+)<\/PrezzoUnitario>/i;
const PERCENTUALE_REGEX = /<Percentuale>([^<]+)<\/Percentuale>/i;
const ALIQUOTA_IVA_REGEX = /<AliquotaIVA>([^<]+)<\/AliquotaIVA>/i;
const PREZZO_TOTALE_REGEX = /<PrezzoTotale>([^<]+)<\/PrezzoTotale>/i;
const DATI_RIEPILOGO_GLOBAL_REGEX =
  /<DatiRiepilogo>([\s\S]*?)<\/DatiRiepilogo>/gi;
const IMPONIBILE_IMPORTO_REGEX =
  /<ImponibileImporto>([^<]+)<\/ImponibileImporto>/i;
const IMPOSTA_REGEX = /<Imposta>([^<]+)<\/Imposta>/i;
const ESIGIBILITA_IVA_REGEX = /<EsigibilitaIVA>([^<]+)<\/EsigibilitaIVA>/i;
const DETTAGLIO_PAGAMENTO_REGEX =
  /<DettaglioPagamento>([\s\S]*?)<\/DettaglioPagamento>/i;
const CONDIZIONI_PAGAMENTO_REGEX =
  /<CondizioniPagamento>([^<]+)<\/CondizioniPagamento>/i;
const MODALITA_PAGAMENTO_REGEX =
  /<ModalitaPagamento>([^<]+)<\/ModalitaPagamento>/i;
const DATA_SCADENZA_PAGAMENTO_REGEX =
  /<DataScadenzaPagamento>([^<]+)<\/DataScadenzaPagamento>/i;
const IMPORTO_PAGAMENTO_REGEX =
  /<ImportoPagamento>([^<]+)<\/ImportoPagamento>/i;
const ISTITUTO_FINANZIARIO_REGEX =
  /<IstitutoFinanziario>([^<]+)<\/IstitutoFinanziario>/i;
const IBAN_REGEX = /<IBAN>([^<]+)<\/IBAN>/i;
const TELEFONO_REGEX = /<Telefono>([^<]+)<\/Telefono>/i;
const FAX_REGEX = /<Fax>([^<]+)<\/Fax>/i;
const EMAIL_REGEX = /<Email>([^<]+)<\/Email>/i;

/**
 * Parses XML content of an Italian electronic invoice (FatturaElettronica)
 * and extracts relevant data into a structured object.
 */
export function parseInvoice(content: string): ParsedInvoiceData {
  // Extract supplier address
  const cedenteBlock = extractBlock("CedentePrestatore", content);
  const sedeBlock = cedenteBlock
    ? extractBlock("Sede", cedenteBlock)
    : undefined;

  const supplierAddress = {
    indirizzo: sedeBlock?.match(INDIRIZZO_REGEX)?.[1],
    cap: sedeBlock?.match(CAP_REGEX)?.[1],
    comune: sedeBlock?.match(COMUNE_REGEX)?.[1],
    provincia: sedeBlock?.match(PROVINCIA_REGEX)?.[1],
    nazione: sedeBlock?.match(NAZIONE_REGEX)?.[1],
  };

  // Extract REA data
  const reaBlock = cedenteBlock?.match(ISCRIZIONE_REA_REGEX)?.[1];
  const reaData = {
    ufficio: reaBlock?.match(UFFICIO_REGEX)?.[1],
    numero: reaBlock?.match(NUMERO_REA_REGEX)?.[1],
    capitale: reaBlock?.match(CAPITALE_SOCIALE_REGEX)?.[1],
    socioUnico: reaBlock?.match(SOCIO_UNICO_REGEX)?.[1],
    statoLiquidazione: reaBlock?.match(STATO_LIQUIDAZIONE_REGEX)?.[1],
  };

  // Extract buyer address
  const cessionarioBlock = extractBlock("CessionarioCommittente", content);
  const buyerSedeBlock = cessionarioBlock?.match(SEDE_REGEX)?.[1];

  const buyerAddress = {
    indirizzo: buyerSedeBlock?.match(INDIRIZZO_REGEX)?.[1],
    cap: buyerSedeBlock?.match(CAP_REGEX)?.[1],
    comune: buyerSedeBlock?.match(COMUNE_REGEX)?.[1],
    provincia: buyerSedeBlock?.match(PROVINCIA_REGEX)?.[1],
    nazione: buyerSedeBlock?.match(NAZIONE_REGEX)?.[1],
  };

  // Extract transmission data
  const trasmissioneBlock = extractBlock("DatiTrasmissione", content);
  const trasmissione = {
    progressivo: trasmissioneBlock?.match(PROGRESSIVO_INVIO_REGEX)?.[1],
    formatoTrasmissione: trasmissioneBlock?.match(
      FORMATO_TRASMISSIONE_REGEX
    )?.[1],
    codiceDestinatario: trasmissioneBlock?.match(
      CODICE_DESTINATARIO_REGEX
    )?.[1],
  };

  // Extract order data
  const ordineBlock = extractBlock("DatiOrdineAcquisto", content);
  const ordineData = {
    idDocumento: ordineBlock?.match(ID_DOCUMENTO_REGEX)?.[1],
    numItem: ordineBlock?.match(NUM_ITEM_REGEX)?.[1],
    codiceCIG: ordineBlock?.match(CODICE_CIG_REGEX)?.[1],
    codiceCUP: ordineBlock?.match(CODICE_CUP_REGEX)?.[1],
  };

  // Extract SAL data
  const salBlock = extractBlock("DatiSAL", content);
  const salData = {
    riferimentoFase: salBlock?.match(RIFERIMENTO_FASE_REGEX)?.[1],
  };

  // Extract DDT data
  const ddtBlock = extractBlock("DatiDDT", content);
  const ddtData = {
    numeroDDT: ddtBlock?.match(NUMERO_DDT_REGEX)?.[1],
    dataDDT: ddtBlock?.match(DATA_DDT_REGEX)?.[1],
  };

  // Extract Causale
  const causale = extractTag("Causale", content);

  // Extract line items
  const lineItems: ParsedInvoiceData["lineItems"] = [];

  const lineMatches = content.matchAll(DETTAGLIO_LINEE_GLOBAL_REGEX);
  for (const match of lineMatches) {
    const lineContent = match[1];
    lineItems.push({
      numero: lineContent.match(NUMERO_LINEA_REGEX)?.[1] || "",
      descrizione: lineContent.match(DESCRIZIONE_REGEX)?.[1] || "",
      quantita: lineContent.match(QUANTITA_REGEX)?.[1],
      prezzoUnitario: lineContent.match(PREZZO_UNITARIO_REGEX)?.[1],
      sconto: lineContent.match(PERCENTUALE_REGEX)?.[1],
      aliquotaIVA: lineContent.match(ALIQUOTA_IVA_REGEX)?.[1],
      prezzoTotale: lineContent.match(PREZZO_TOTALE_REGEX)?.[1],
    });
  }

  // Extract VAT summary
  const ivaRiepilogo: ParsedInvoiceData["ivaRiepilogo"] = [];

  const ivaMatches = content.matchAll(DATI_RIEPILOGO_GLOBAL_REGEX);
  for (const match of ivaMatches) {
    const ivaContent = match[1];
    ivaRiepilogo.push({
      aliquota: ivaContent.match(ALIQUOTA_IVA_REGEX)?.[1] || "",
      imponibile: ivaContent.match(IMPONIBILE_IMPORTO_REGEX)?.[1] || "",
      imposta: ivaContent.match(IMPOSTA_REGEX)?.[1] || "",
      esigibilita: ivaContent.match(ESIGIBILITA_IVA_REGEX)?.[1],
    });
  }

  // Extract payment data
  const pagamentoBlock = extractBlock("DatiPagamento", content);
  const dettaglioPagamento = pagamentoBlock?.match(
    DETTAGLIO_PAGAMENTO_REGEX
  )?.[1];
  const pagamento = {
    condizioni: pagamentoBlock?.match(CONDIZIONI_PAGAMENTO_REGEX)?.[1],
    modalita: dettaglioPagamento?.match(MODALITA_PAGAMENTO_REGEX)?.[1],
    dataScadenza: dettaglioPagamento?.match(DATA_SCADENZA_PAGAMENTO_REGEX)?.[1],
    importo: dettaglioPagamento?.match(IMPORTO_PAGAMENTO_REGEX)?.[1],
    istituto: dettaglioPagamento?.match(ISTITUTO_FINANZIARIO_REGEX)?.[1],
    iban: dettaglioPagamento?.match(IBAN_REGEX)?.[1],
  };

  // Extract contacts
  const contatti = {
    telefono: cedenteBlock?.match(TELEFONO_REGEX)?.[1],
    fax: cedenteBlock?.match(FAX_REGEX)?.[1],
    email: cedenteBlock?.match(EMAIL_REGEX)?.[1],
  };

  return {
    supplierAddress,
    reaData,
    buyerAddress,
    trasmissione,
    ordineData,
    salData,
    ddtData,
    causale,
    lineItems,
    ivaRiepilogo,
    pagamento,
    contatti,
  };
}
