// FatturaPA (Italian Electronic Invoice) XML Parser
// Extracts structured data from FatturaPA XML content

type Address = {
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
};

type LineItem = {
  numero: string;
  descrizione: string;
  quantita: string;
  prezzoUnitario: string;
  prezzoTotale: string;
  sconto: string;
  aliquotaIVA: string;
};

type IvaRiepilogo = {
  aliquota: string;
  imponibile: string;
  imposta: string;
  esigibilita: string;
};

export type ParsedInvoice = {
  trasmissione: {
    progressivo: string;
    codiceDestinatario: string;
    formatoTrasmissione: string;
  };
  supplierAddress: Address;
  reaData: {
    ufficio: string;
    numero: string;
    capitale: string;
    socioUnico: string;
    statoLiquidazione: string;
  };
  contatti: {
    telefono: string;
    fax: string;
    email: string;
  };
  buyerAddress: Address;
  ordineData: {
    idDocumento: string;
    numItem: string;
    codiceCIG: string;
    codiceCUP: string;
  };
  salData: {
    riferimentoFase: string;
  };
  ddtData: {
    numeroDDT: string;
    dataDDT: string;
  };
  causale: string;
  lineItems: LineItem[];
  ivaRiepilogo: IvaRiepilogo[];
  pagamento: {
    condizioni: string;
    modalita: string;
    dataScadenza: string;
    importo: string;
    istituto: string;
    iban: string;
  };
};

/**
 * Extract text content from a simple XML tag
 */
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

/**
 * Extract a block of XML content between opening and closing tags
 */
function extractBlock(xml: string, tagName: string): string {
  const regex = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`,
    "i"
  );
  const match = xml.match(regex);
  return match?.[1] ?? "";
}

/**
 * Extract all blocks matching a tag name
 */
function extractAllBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`,
    "gi"
  );
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Parse address from XML block
 */
function parseAddress(block: string): Address {
  return {
    indirizzo: extractTag(block, "Indirizzo"),
    cap: extractTag(block, "CAP"),
    comune: extractTag(block, "Comune"),
    provincia: extractTag(block, "Provincia"),
    nazione: extractTag(block, "Nazione"),
  };
}

/**
 * Parse FatturaPA XML content and extract structured data
 */
export function parseInvoice(xmlContent: string): ParsedInvoice {
  // Default empty structure
  const defaultResult: ParsedInvoice = {
    trasmissione: {
      progressivo: "",
      codiceDestinatario: "",
      formatoTrasmissione: "",
    },
    supplierAddress: {
      indirizzo: "",
      cap: "",
      comune: "",
      provincia: "",
      nazione: "",
    },
    reaData: {
      ufficio: "",
      numero: "",
      capitale: "",
      socioUnico: "",
      statoLiquidazione: "",
    },
    contatti: {
      telefono: "",
      fax: "",
      email: "",
    },
    buyerAddress: {
      indirizzo: "",
      cap: "",
      comune: "",
      provincia: "",
      nazione: "",
    },
    ordineData: {
      idDocumento: "",
      numItem: "",
      codiceCIG: "",
      codiceCUP: "",
    },
    salData: {
      riferimentoFase: "",
    },
    ddtData: {
      numeroDDT: "",
      dataDDT: "",
    },
    causale: "",
    lineItems: [],
    ivaRiepilogo: [],
    pagamento: {
      condizioni: "",
      modalita: "",
      dataScadenza: "",
      importo: "",
      istituto: "",
      iban: "",
    },
  };

  if (!xmlContent) {
    return defaultResult;
  }

  try {
    // Parse DatiTrasmissione
    const datiTrasmissione = extractBlock(xmlContent, "DatiTrasmissione");
    const trasmissione = {
      progressivo: extractTag(datiTrasmissione, "ProgressivoInvio"),
      codiceDestinatario: extractTag(datiTrasmissione, "CodiceDestinatario"),
      formatoTrasmissione: extractTag(datiTrasmissione, "FormatoTrasmissione"),
    };

    // Parse CedentePrestatore (Supplier)
    const cedentePrestatore = extractBlock(xmlContent, "CedentePrestatore");
    const sedeFornitore = extractBlock(cedentePrestatore, "Sede");
    const supplierAddress = parseAddress(sedeFornitore);

    // Parse IscrizioneREA
    const iscrizioneRea = extractBlock(cedentePrestatore, "IscrizioneREA");
    const reaData = {
      ufficio: extractTag(iscrizioneRea, "Ufficio"),
      numero: extractTag(iscrizioneRea, "NumeroREA"),
      capitale: extractTag(iscrizioneRea, "CapitaleSociale"),
      socioUnico: extractTag(iscrizioneRea, "SocioUnico"),
      statoLiquidazione: extractTag(iscrizioneRea, "StatoLiquidazione"),
    };

    // Parse Contatti
    const contattiBlock = extractBlock(cedentePrestatore, "Contatti");
    const contatti = {
      telefono: extractTag(contattiBlock, "Telefono"),
      fax: extractTag(contattiBlock, "Fax"),
      email: extractTag(contattiBlock, "Email"),
    };

    // Parse CessionarioCommittente (Buyer)
    const cessionarioCommittente = extractBlock(
      xmlContent,
      "CessionarioCommittente"
    );
    const sedeCliente = extractBlock(cessionarioCommittente, "Sede");
    const buyerAddress = parseAddress(sedeCliente);

    // Parse DatiOrdineAcquisto
    const datiOrdine = extractBlock(xmlContent, "DatiOrdineAcquisto");
    const ordineData = {
      idDocumento: extractTag(datiOrdine, "IdDocumento"),
      numItem: extractTag(datiOrdine, "NumItem"),
      codiceCIG: extractTag(datiOrdine, "CodiceCIG"),
      codiceCUP: extractTag(datiOrdine, "CodiceCUP"),
    };

    // Parse DatiSAL
    const datiSal = extractBlock(xmlContent, "DatiSAL");
    const salData = {
      riferimentoFase: extractTag(datiSal, "RiferimentoFase"),
    };

    // Parse DatiDDT
    const datiDdt = extractBlock(xmlContent, "DatiDDT");
    const ddtData = {
      numeroDDT: extractTag(datiDdt, "NumeroDDT"),
      dataDDT: extractTag(datiDdt, "DataDDT"),
    };

    // Parse Causale
    const causale = extractTag(xmlContent, "Causale");

    // Parse DettaglioLinee (Line Items)
    const lineItemBlocks = extractAllBlocks(xmlContent, "DettaglioLinee");
    const lineItems: LineItem[] = lineItemBlocks.map((block) => {
      const scontoBlock = extractBlock(block, "ScontoMaggiorazione");
      return {
        numero: extractTag(block, "NumeroLinea"),
        descrizione: extractTag(block, "Descrizione"),
        quantita: extractTag(block, "Quantita"),
        prezzoUnitario: extractTag(block, "PrezzoUnitario"),
        prezzoTotale: extractTag(block, "PrezzoTotale"),
        sconto: extractTag(scontoBlock, "Percentuale"),
        aliquotaIVA: extractTag(block, "AliquotaIVA"),
      };
    });

    // Parse DatiRiepilogo (VAT Summary)
    const riepilogoBlocks = extractAllBlocks(xmlContent, "DatiRiepilogo");
    const ivaRiepilogo: IvaRiepilogo[] = riepilogoBlocks.map((block) => ({
      aliquota: extractTag(block, "AliquotaIVA"),
      imponibile: extractTag(block, "ImponibileImporto"),
      imposta: extractTag(block, "Imposta"),
      esigibilita: extractTag(block, "EsigibilitaIVA"),
    }));

    // Parse DatiPagamento
    const datiPagamento = extractBlock(xmlContent, "DatiPagamento");
    const dettaglioPagamento = extractBlock(datiPagamento, "DettaglioPagamento");
    const pagamento = {
      condizioni: extractTag(datiPagamento, "CondizioniPagamento"),
      modalita: extractTag(dettaglioPagamento, "ModalitaPagamento"),
      dataScadenza: extractTag(dettaglioPagamento, "DataScadenzaPagamento"),
      importo: extractTag(dettaglioPagamento, "ImportoPagamento"),
      istituto: extractTag(dettaglioPagamento, "IstitutoFinanziario"),
      iban: extractTag(dettaglioPagamento, "IBAN"),
    };

    return {
      trasmissione,
      supplierAddress,
      reaData,
      contatti,
      buyerAddress,
      ordineData,
      salData,
      ddtData,
      causale,
      lineItems,
      ivaRiepilogo,
      pagamento,
    };
  } catch {
    return defaultResult;
  }
}


