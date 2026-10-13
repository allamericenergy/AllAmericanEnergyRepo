import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import { displayDate, displayProcessedDate, money, monthLabel, summarizeAccountReport, type AccountReportRow } from "./accountReport";

export function createAccountReportPdf(rows: AccountReportRow[]) {
  if (!rows.length) throw new Error("No statement rows selected.");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const groups = new Map<string, AccountReportRow[]>();
  for (const row of [...rows].sort((a, b) => a.month.localeCompare(b.month) || a.company.localeCompare(b.company) || a.statementDate.localeCompare(b.statementDate))) {
    const key = JSON.stringify([row.month, row.company]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  [...groups.values()].forEach((group, index) => {
    if (index) doc.addPage();
    const first = group[0];
    doc.setFillColor(0, 112, 192).rect(30, 30, 732, 25, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(15).text("Account Report", 396, 47, { align: "center" });
    autoTable(doc, { startY: 65, margin: { left: 30, right: 30 }, tableWidth: 360,
      body: [["Year", first.month.slice(0, 4)], ["Month", monthLabel(first.month).replace(/ \d{4}$/, "")], ["Company", first.company || "Not provided"], ["Total", money(group.reduce((sum, row) => sum + row.cents, 0))]],
      styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.3, lineColor: 100 }, theme: "grid",
      columnStyles: { 0: { fillColor: [0, 0, 0], textColor: 255, cellWidth: 65 }, 1: { textColor: [225, 0, 90] } } });
    const metaEnd = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, { startY: metaEnd + 12, margin: { left: 30, right: 30 },
      head: [["Account Number", "Company Folder Name", "City", "Utility", "Product", "Amount", "Statement Date", "Service Address", "Processed Date"]],
      body: group.map(row => [row.account, row.utility, row.city, row.utility, row.product || "", money(row.cents), displayDate(row.statementDate), row.address, displayProcessedDate(row.processedDate)]),
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [255, 45, 150], textColor: 255, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 78 }, 5: { halign: "right", cellWidth: 65 }, 7: { cellWidth: 120 } },
      rowPageBreak: "avoid", theme: "plain" });
    const detailEnd = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, { startY: detailEnd + 14, margin: { left: 30, right: 30 }, tableWidth: 360,
      head: [["Utility type", "Account Total"]],
      body: [...summarizeAccountReport(group).map(item => [item.utilityType, money(item.cents)]), ["Total", money(group.reduce((sum, row) => sum + row.cents, 0))]],
      styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [0, 112, 192] }, columnStyles: { 1: { halign: "right" } },
      didParseCell: (data: CellHookData) => { if (data.section === "body" && data.row.index === summarizeAccountReport(group).length) { data.cell.styles.fillColor = [255, 255, 0]; data.cell.styles.fontStyle = "bold"; } } });
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFontSize(8).setTextColor(100).text(`Page ${page} of ${doc.getNumberOfPages()}`, 762, 595, { align: "right" });
  }
  return doc;
}
