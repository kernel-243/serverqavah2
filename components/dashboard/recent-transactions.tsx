import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Transaction {
  _id: string
  code: string
  clientId: {
    nom: string
    prenom: string
    code: string
  }
  somme: number
  devise: string
  methode: string
  date: string
  status: string
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

const statusTranslations = {
  paid: "Payé",
  pending: "En attente",
  cancelled: "Annulé",
}

const methodTranslations = {
  cash: "Espèces",
  bank: "Banque",
  mobile: "Mobile Money",
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Méthode</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction._id}>
            <TableCell className="font-medium">{transaction.code}</TableCell>
            <TableCell>{`${transaction.clientId.prenom} ${transaction.clientId.nom}`}</TableCell>
            <TableCell>{`${transaction.somme.toLocaleString()} ${transaction.devise}`}</TableCell>
            <TableCell>
              {methodTranslations[transaction.methode as keyof typeof methodTranslations] || transaction.methode}
            </TableCell>
            <TableCell>{new Date(transaction.date).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                ${
                  transaction.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : transaction.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {statusTranslations[transaction.status as keyof typeof statusTranslations] || transaction.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

