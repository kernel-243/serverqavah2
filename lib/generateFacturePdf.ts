import { jsPDF } from "jspdf"

export interface FacturePdfData {
  code: string
  clientId: { nom: string; prenom: string }
  contratId: { code: string }
  somme: number
  devise: string
  methode: string
  date: string
  status: string
  reduction?: {
    pourcentage?: number
    montant?: number
    motif?: string
  }
}

/**
 * Génère un PDF de quittance localement (sans Firebase ni appel API).
 * Retourne un Blob pour téléchargement côté client.
 */
export function generateFacturePdf(data: FacturePdfData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Titre
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("QUITTANCE", pageWidth / 2, y, { align: "center" })
  y += 14

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label} : `, 20, y)
    const labelWidth = doc.getTextWidth(`${label} : `)
    doc.setFont("helvetica", "normal")
    doc.text(value, 20 + labelWidth, y)
    y += 8
  }

  const formatDate = (d: string) => {
    try {
      const date = new Date(d)
      return isNaN(date.getTime()) ? d : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    } catch {
      return d
    }
  }

  const statusLabel: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    cancelled: "Annulé",
    canceled: "Annulé",
  }
  const status = statusLabel[data.status] ?? data.status

  line("Code quittance", data.code)
  line("Date", formatDate(data.date))
  line("Client", `${data.clientId.prenom} ${data.clientId.nom}`)
  line("Contrat", data.contratId?.code ?? "—")
  line("Montant", `${data.somme.toLocaleString("fr-FR")} ${data.devise}`)
  line("Méthode de paiement", data.methode)
  line("Statut", status)

  if (data.reduction && (data.reduction.motif || data.reduction.pourcentage || data.reduction.montant)) {
    y += 4
    doc.setFont("helvetica", "bold")
    doc.text("Réduction appliquée", 20, y)
    y += 6
    doc.setFont("helvetica", "normal")
    if (data.reduction.pourcentage) {
      doc.text(`Pourcentage : ${data.reduction.pourcentage}%`, 20, y)
      y += 6
    }
    if (data.reduction.montant) {
      doc.text(`Montant : ${data.reduction.montant} ${data.devise}`, 20, y)
      y += 6
    }
    if (data.reduction.motif) {
      doc.text(`Motif : ${data.reduction.motif}`, 20, y)
      y += 6
    }
  }

  doc.setFont("helvetica", "normal")
  y = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text("Document généré localement — Qavahland", pageWidth / 2, y, { align: "center" })

  return doc.output("blob")
}

/**
 * Génère le PDF et déclenche le téléchargement dans le navigateur.
 */
export function downloadFacturePdf(data: FacturePdfData, filename?: string): void {
  const blob = generateFacturePdf(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename ?? `Quittance_${data.code}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
