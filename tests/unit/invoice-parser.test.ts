import { describe, expect, test } from "vitest";
import { parseInvoice } from "../../lib/invoice-parser";

describe("Invoice Parser", () => {
  const sampleXml = `
    <FatturaElettronica>
      <FatturaElettronicaHeader>
        <DatiTrasmissione>
          <IdTrasmittente>
            <IdPaese>IT</IdPaese>
            <IdCodice>12345678901</IdCodice>
          </IdTrasmittente>
          <ProgressivoInvio>00001</ProgressivoInvio>
          <FormatoTrasmissione>FPR12</FormatoTrasmissione>
          <CodiceDestinatario>0000000</CodiceDestinatario>
        </DatiTrasmissione>
        <CedentePrestatore>
          <DatiAnagrafici>
            <CodiceFiscale>12345678901</CodiceFiscale>
            <Anagrafica>
              <Denominazione>Fornitore SRL</Denominazione>
            </Anagrafica>
            <RegimeFiscale>RF01</RegimeFiscale>
          </DatiAnagrafici>
          <Sede>
            <Indirizzo>Via Roma 1</Indirizzo>
            <CAP>00100</CAP>
            <Comune>Roma</Comune>
            <Provincia>RM</Provincia>
            <Nazione>IT</Nazione>
          </Sede>
          <IscrizioneREA>
            <Ufficio>RM</Ufficio>
            <NumeroREA>123456</NumeroREA>
            <CapitaleSociale>10000.00</CapitaleSociale>
            <SocioUnico>SU</SocioUnico>
            <StatoLiquidazione>LN</StatoLiquidazione>
          </IscrizioneREA>
        </CedentePrestatore>
        <CessionarioCommittente>
          <Sede>
            <Indirizzo>Piazza del Popolo 1</Indirizzo>
            <CAP>48018</CAP>
            <Comune>Faenza</Comune>
            <Provincia>RA</Provincia>
            <Nazione>IT</Nazione>
          </Sede>
        </CessionarioCommittente>
      </FatturaElettronicaHeader>
      <FatturaElettronicaBody>
        <DatiGenerali>
          <DatiGeneraliDocumento>
            <TipoDocumento>TD01</TipoDocumento>
            <Divisa>EUR</Divisa>
            <Data>2025-01-01</Data>
            <Numero>100</Numero>
            <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
            <Causale>Fornitura materiale ufficio</Causale>
          </DatiGeneraliDocumento>
          <DatiOrdineAcquisto>
            <IdDocumento>123</IdDocumento>
            <NumItem>1</NumItem>
            <CodiceCIG>ABC1234567</CodiceCIG>
            <CodiceCUP>XYZ123456789012</CodiceCUP>
          </DatiOrdineAcquisto>
        </DatiGenerali>
        <DatiBeniServizi>
          <DettaglioLinee>
            <NumeroLinea>1</NumeroLinea>
            <Descrizione>Penne a sfera</Descrizione>
            <Quantita>10.00</Quantita>
            <PrezzoUnitario>1.00</PrezzoUnitario>
            <PrezzoTotale>10.00</PrezzoTotale>
            <AliquotaIVA>22.00</AliquotaIVA>
          </DettaglioLinee>
          <DettaglioLinee>
             <NumeroLinea>2</NumeroLinea>
             <Descrizione>Carta A4</Descrizione>
             <Quantita>5.00</Quantita>
             <PrezzoUnitario>18.00</PrezzoUnitario>
             <PrezzoTotale>90.00</PrezzoTotale>
             <AliquotaIVA>22.00</AliquotaIVA>
          </DettaglioLinee>
          <DatiRiepilogo>
            <AliquotaIVA>22.00</AliquotaIVA>
            <ImponibileImporto>100.00</ImponibileImporto>
            <Imposta>22.00</Imposta>
            <EsigibilitaIVA>I</EsigibilitaIVA>
          </DatiRiepilogo>
        </DatiBeniServizi>
        <DatiPagamento>
          <CondizioniPagamento>TP02</CondizioniPagamento>
          <DettaglioPagamento>
            <ModalitaPagamento>MP05</ModalitaPagamento>
            <DataScadenzaPagamento>2025-01-31</DataScadenzaPagamento>
            <ImportoPagamento>122.00</ImportoPagamento>
            <IBAN>IT00X0000000000000000000000</IBAN>
          </DettaglioPagamento>
        </DatiPagamento>
      </FatturaElettronicaBody>
    </FatturaElettronica>
  `;

  test("extracts supplier address", () => {
    const result = parseInvoice(sampleXml);
    expect(result.supplierAddress).toEqual({
      indirizzo: "Via Roma 1",
      cap: "00100",
      comune: "Roma",
      provincia: "RM",
      nazione: "IT",
    });
  });

  test("extracts buyer address", () => {
    const result = parseInvoice(sampleXml);
    expect(result.buyerAddress).toEqual({
      indirizzo: "Piazza del Popolo 1",
      cap: "48018",
      comune: "Faenza",
      provincia: "RA",
      nazione: "IT",
    });
  });

  test("extracts order data", () => {
    const result = parseInvoice(sampleXml);
    expect(result.ordineData).toEqual({
      idDocumento: "123",
      numItem: "1",
      codiceCIG: "ABC1234567",
      codiceCUP: "XYZ123456789012",
    });
  });

  test("extracts line items", () => {
    const result = parseInvoice(sampleXml);
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0]).toEqual({
      numero: "1",
      descrizione: "Penne a sfera",
      quantita: "10.00",
      prezzoUnitario: "1.00",
      prezzoTotale: "10.00",
      aliquotaIVA: "22.00",
      sconto: undefined,
    });
    expect(result.lineItems[1].descrizione).toBe("Carta A4");
  });

  test("extracts VAT summary", () => {
    const result = parseInvoice(sampleXml);
    expect(result.ivaRiepilogo).toHaveLength(1);
    expect(result.ivaRiepilogo[0]).toEqual({
      aliquota: "22.00",
      imponibile: "100.00",
      imposta: "22.00",
      esigibilita: "I",
    });
  });

  test("extracts payment data", () => {
    const result = parseInvoice(sampleXml);
    expect(result.pagamento).toEqual({
      condizioni: "TP02",
      modalita: "MP05",
      dataScadenza: "2025-01-31",
      importo: "122.00",
      iban: "IT00X0000000000000000000000",
      istituto: undefined,
    });
  });

  test("extracts causale", () => {
    const result = parseInvoice(sampleXml);
    expect(result.causale).toBe("Fornitura materiale ufficio");
  });

  test("handles missing optional fields gracefully", () => {
    const minimalXml = "<FatturaElettronica></FatturaElettronica>";
    const result = parseInvoice(minimalXml);

    expect(result.supplierAddress).toEqual({
      indirizzo: undefined,
      cap: undefined,
      comune: undefined,
      provincia: undefined,
      nazione: undefined,
    });
    expect(result.lineItems).toHaveLength(0);
    expect(result.ivaRiepilogo).toHaveLength(0);
  });
});
