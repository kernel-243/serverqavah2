import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { matchesSearch } from "@/lib/normalizeForSearch"

interface Facture {
  _id: string
  clientId: {
    nom: string
    prenom: string
  }
  contratId: {
    code: string
  }
  somme: number
  devise: string
  methode: string
  bonus?: boolean
  addBy: { email: string } | null | undefined
  date: string
}

interface FactureTableProps {
  factures?: Facture[]
  searchQuery: string
  dateFilter: string
}

export function FactureTable({ factures = [], searchQuery, dateFilter }: FactureTableProps) {
  const filteredFactures =
    factures?.filter((facture) => {
      const matchesSearch_ =
        matchesSearch(facture.clientId.nom, searchQuery) ||
        matchesSearch(facture.clientId.prenom, searchQuery) ||
        (facture.addBy?.email ? matchesSearch(facture.addBy.email, searchQuery) : false)
      const matchesDate = dateFilter ? new Date(facture.date).toISOString().split("T")[0] === dateFilter : true
      return matchesSearch_ && matchesDate
    }) || []

  return (
    <Table>
      <TableCaption>Liste des factures récentes</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Contrat</TableHead>
          <TableHead>Somme</TableHead>
          <TableHead>Devise</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Auteur</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredFactures.map((facture) => (
          <TableRow key={facture._id}>
            <TableCell>{`${facture.clientId.prenom} ${facture.clientId.nom}`}</TableCell>
             <TableCell>{`${facture.contratId.code}`}</TableCell>
            <TableCell>{facture.somme.toLocaleString()}</TableCell>
            <TableCell>{facture.devise}</TableCell>
            <TableCell>{facture.bonus ? <span className="text-amber-700 font-semibold">Bonus</span> : facture.methode}</TableCell>
            <TableCell>{facture.addBy ? facture.addBy.email : "Client (paiement direct)"}</TableCell>
            <TableCell>{facture.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

