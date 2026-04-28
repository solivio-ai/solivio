import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { calculateTotals } from "../lib/calculateTotals";
import { formatDate, formatMoney, formatNumber, formatVatRate } from "../lib/formatters";
import type { PdfOfferRequest } from "../lib/schema";

Font.registerHyphenationCallback((word) => [word]);

const YELLOW = "#FACC15";
const TEAL = "#134E4A";
const GRAY_50 = "#F9FAFB";
const GRAY_200 = "#E5E7EB";
const GRAY_500 = "#6B7280";
const BLACK = "#111827";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BLACK,
    paddingTop: 36,
    paddingBottom: 54,
    paddingHorizontal: 36,
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1 },
  brandTagline: { fontSize: 7, color: GRAY_500, marginTop: 2 },
  offerMeta: { alignItems: "flex-end" },
  offerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: TEAL },
  offerNumber: { fontSize: 9, color: GRAY_500, marginTop: 2 },
  offerDate: { fontSize: 9, color: GRAY_500, marginTop: 1 },

  // Divider
  divider: { borderBottomWidth: 1.5, borderBottomColor: YELLOW, marginBottom: 16 },
  dividerThin: { borderBottomWidth: 0.5, borderBottomColor: GRAY_200, marginBottom: 12 },

  // Parties
  parties: { flexDirection: "row", gap: 16, marginBottom: 20 },
  partyBox: { flex: 1, backgroundColor: GRAY_50, borderRadius: 4, padding: 10 },
  partyLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: TEAL, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  partyDetail: { fontSize: 8, color: GRAY_500, marginTop: 1, lineHeight: 1.4 },

  // Intro
  intro: { fontSize: 9, color: GRAY_500, marginBottom: 16, lineHeight: 1.5 },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: TEAL, padding: "5 6", borderRadius: "3 3 0 0" },
  tableHeaderText: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 7.5 },
  tableRow: { flexDirection: "row", padding: "5 6", borderBottomWidth: 0.5, borderBottomColor: GRAY_200 },
  tableRowAlt: { backgroundColor: GRAY_50 },
  tableCell: { fontSize: 8.5, color: BLACK, lineHeight: 1.3 },
  tableCellGray: { fontSize: 8, color: GRAY_500, lineHeight: 1.3 },

  // Column widths
  colLp: { width: 22 },
  colName: { flex: 2.5 },
  colQty: { width: 32, textAlign: "right" },
  colUnit: { width: 28, textAlign: "center" },
  colPrice: { width: 60, textAlign: "right" },
  colValueNet: { width: 64, textAlign: "right" },
  colVat: { width: 30, textAlign: "center" },
  colGross: { width: 68, textAlign: "right" },

  // Totals
  totalsSection: { marginTop: 8, alignItems: "flex-end" },
  totalsBox: { width: 240, borderTopWidth: 1.5, borderTopColor: YELLOW, paddingTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { fontSize: 9, color: GRAY_500 },
  totalsValue: { fontSize: 9, color: BLACK },
  totalGrossRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: GRAY_200 },
  totalGrossLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: TEAL },
  totalGrossValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: TEAL },

  // Terms
  termsSection: { marginTop: 20 },
  termsSectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  termsRow: { flexDirection: "row", marginBottom: 3 },
  termsKey: { fontSize: 8, color: GRAY_500, width: 90 },
  termsVal: { fontSize: 8, color: BLACK, flex: 1 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  footerBrand: { fontSize: 7, color: GRAY_500 },
  footerPowered: { fontSize: 7, color: GRAY_500 },
  footerPage: { fontSize: 7, color: GRAY_500 },
});

type Props = { data: PdfOfferRequest };

export function OfferDocument({ data }: Props) {
  const { offer, seller, buyer, items, terms } = data;
  const { itemsWithTotals, totals } = calculateTotals(items);

  return (
    <Document title={`Oferta ${offer.number}`} author={seller.name}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>SOLIVIO</Text>
            <Text style={s.brandTagline}>Platforma ofertowania B2B</Text>
          </View>
          <View style={s.offerMeta}>
            <Text style={s.offerTitle}>OFERTA</Text>
            <Text style={s.offerNumber}>{offer.number}</Text>
            <Text style={s.offerDate}>Data wystawienia: {formatDate(offer.issueDate)}</Text>
            <Text style={s.offerDate}>Ważna do: {formatDate(offer.validUntil)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Sprzedawca</Text>
            <Text style={s.partyName}>{seller.name}</Text>
            <Text style={s.partyDetail}>{seller.address}</Text>
            {seller.nip && <Text style={s.partyDetail}>NIP: {seller.nip}</Text>}
            {seller.contact && <Text style={s.partyDetail}>{seller.contact}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Nabywca</Text>
            <Text style={s.partyName}>{buyer.name}</Text>
            <Text style={s.partyDetail}>{buyer.address}</Text>
            {buyer.nip && <Text style={s.partyDetail}>NIP: {buyer.nip}</Text>}
            {buyer.contact && <Text style={s.partyDetail}>{buyer.contact}</Text>}
          </View>
        </View>

        {/* Intro */}
        <Text style={s.intro}>
          W odpowiedzi na Państwa zapytanie ofertowe, uprzejmie przedstawiamy ofertę na
          dostawę poniższych produktów. Wszystkie ceny podane są w {offer.currency}.
        </Text>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colLp]}>LP</Text>
          <Text style={[s.tableHeaderText, s.colName]}>Nazwa / Opis</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Ilość</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>J.m.</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Cena netto</Text>
          <Text style={[s.tableHeaderText, s.colValueNet]}>Wartość netto</Text>
          <Text style={[s.tableHeaderText, s.colVat]}>VAT</Text>
          <Text style={[s.tableHeaderText, s.colGross]}>Wartość brutto</Text>
        </View>

        {itemsWithTotals.map((item, index) => (
          <View
            key={index}
            style={[s.tableRow, index % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, s.colLp]}>{index + 1}.</Text>
            <View style={s.colName}>
              <Text style={s.tableCell}>{item.name}</Text>
              {item.sku && <Text style={s.tableCellGray}>SKU: {item.sku}</Text>}
              {item.description && (
                <Text style={s.tableCellGray}>{item.description}</Text>
              )}
            </View>
            <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tableCell, s.colUnit]}>{item.unit}</Text>
            <Text style={[s.tableCell, s.colPrice]}>
              {formatNumber(item.unitPriceNet)}
            </Text>
            <Text style={[s.tableCell, s.colValueNet]}>
              {formatNumber(item.valueNet)}
            </Text>
            <Text style={[s.tableCell, s.colVat]}>{formatVatRate(item.vatRate)}</Text>
            <Text style={[s.tableCell, s.colGross]}>
              {formatNumber(item.valueGross)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Razem netto</Text>
              <Text style={s.totalsValue}>
                {formatMoney(totals.totalNet, offer.currency)}
              </Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>VAT</Text>
              <Text style={s.totalsValue}>
                {formatMoney(totals.totalVat, offer.currency)}
              </Text>
            </View>
            <View style={s.totalGrossRow}>
              <Text style={s.totalGrossLabel}>RAZEM BRUTTO</Text>
              <Text style={s.totalGrossValue}>
                {formatMoney(totals.totalGross, offer.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {terms && (terms.delivery || terms.payment || terms.notes) && (
          <View style={s.termsSection}>
            <View style={s.dividerThin} />
            <Text style={s.termsSectionTitle}>Warunki oferty</Text>
            {terms.delivery && (
              <View style={s.termsRow}>
                <Text style={s.termsKey}>Termin realizacji:</Text>
                <Text style={s.termsVal}>{terms.delivery}</Text>
              </View>
            )}
            {terms.payment && (
              <View style={s.termsRow}>
                <Text style={s.termsKey}>Forma płatności:</Text>
                <Text style={s.termsVal}>{terms.payment}</Text>
              </View>
            )}
            {terms.notes && (
              <View style={s.termsRow}>
                <Text style={s.termsKey}>Uwagi:</Text>
                <Text style={s.termsVal}>{terms.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>{seller.name}</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) =>
              `Strona ${pageNumber} / ${totalPages}`
            }
          />
          <Text style={s.footerPowered}>Powered by Solivio</Text>
        </View>
      </Page>
    </Document>
  );
}
