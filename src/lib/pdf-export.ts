// Utilidades de exportação em PDF (client-side, via jsPDF).
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface SecaoPdf {
  titulo?: string;
  colunas: string[];
  linhas: (string | number)[][];
  /** Larguras relativas opcionais por coluna. */
}

export interface DocumentoPdf {
  titulo: string;
  subtitulo?: string;
  linhasInfo?: string[]; // linhas de cabeçalho (ex.: período, empresa)
  secoes: SecaoPdf[];
  rodape?: string;
}

const AZUL: [number, number, number] = [15, 43, 96]; // primary aproximado

/** Gera e baixa um PDF paisagem/retrato com uma ou mais tabelas. */
export function baixarPdf(nomeArquivo: string, doc: DocumentoPdf): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margem = 40;
  let y = margem;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
  pdf.text(doc.titulo, margem, y);
  y += 18;

  if (doc.subtitulo) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(90, 90, 90);
    pdf.text(doc.subtitulo, margem, y);
    y += 16;
  }

  if (doc.linhasInfo?.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    for (const l of doc.linhasInfo) {
      pdf.text(l, margem, y);
      y += 12;
    }
  }
  y += 6;

  for (const secao of doc.secoes) {
    if (secao.titulo) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
      pdf.text(secao.titulo, margem, y);
      y += 6;
    }
    autoTable(pdf, {
      head: [secao.colunas],
      body: secao.linhas.map((r) => r.map((c) => String(c ?? ""))),
      startY: y + 6,
      margin: { left: margem, right: margem },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: "grid",
    });
    // @ts-expect-error lastAutoTable é adicionado em runtime pelo plugin
    y = (pdf.lastAutoTable?.finalY ?? y) + 20;
  }

  if (doc.rodape) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(doc.rodape, margem, pdf.internal.pageSize.getHeight() - 20);
  }

  pdf.save(nomeArquivo);
}
