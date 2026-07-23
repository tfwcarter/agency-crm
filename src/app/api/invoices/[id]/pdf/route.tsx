import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700 },
  muted: { color: "#666666" },
  section: { marginBottom: 16 },
  table: { marginTop: 12, borderTop: "1 solid #dddddd" },
  row: { flexDirection: "row", borderBottom: "1 solid #eeeeee", paddingVertical: 6 },
  headerRow: { flexDirection: "row", paddingVertical: 6, fontWeight: 700 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", gap: 40, marginBottom: 4 },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
      ...(session.user.userType === "client" ? { clientId: session.user.id } : {}),
    },
    include: { client: true, lineItems: { orderBy: { order: "asc" } }, organization: true },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{invoice.organization.name}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700 }}>{invoice.type.toUpperCase()}</Text>
            <Text style={styles.muted}>{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.muted}>Billed to</Text>
          <Text>{invoice.client.businessName}</Text>
          {invoice.client.email && <Text style={styles.muted}>{invoice.client.email}</Text>}
          {invoice.client.address && <Text style={styles.muted}>{invoice.client.address}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.muted}>Issue date: {formatDate(invoice.issueDate)}</Text>
          {invoice.dueDate && <Text style={styles.muted}>Due date: {formatDate(invoice.dueDate)}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.lineItems.map((item) => (
            <View style={styles.row} key={item.id}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{formatCurrency(invoice.tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.muted}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {invoice.signedByName && (
          <View style={styles.section}>
            <Text style={styles.muted}>
              Signed by {invoice.signedByName} on {invoice.signedAt ? formatDate(invoice.signedAt) : ""}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
