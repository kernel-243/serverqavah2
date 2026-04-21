"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
export interface InvalidPhoneEntry {
  id: string
  phone: string
  indicatif?: string
  field: string
  prenom?: string
  nom?: string
  postnom?: string
  postNom?: string
  code?: string
}

interface InvalidPhonesWarningProps {
  count: number
  phones: InvalidPhoneEntry[]
  entityLabel: "clients" | "prospects"
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvalidPhonesWarning({
  count,
  phones,
  entityLabel,
  open,
  onOpenChange,
}: InvalidPhonesWarningProps) {
  const router = useRouter()
  if (count <= 0) return null

  const label = entityLabel === "clients" ? "client" : "prospect"
  const plural = count > 1 ? "s" : ""

  const getDetailHref = (id: string) =>
    entityLabel === "clients" ? `/dashboard/clients/detail/${id}` : `/dashboard/prospect/${id}`

  const handleRowClick = (id: string) => {
    onOpenChange(false)
    router.push(getDetailHref(id))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-2 w-full text-left rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-red-800 dark:text-red-200 font-medium">
          {count} numéro{plural} de téléphone incorrect{plural} (commence par 0)
        </span>
        <span className="text-red-600 dark:text-red-400 text-sm ml-auto">
          Cliquez pour afficher la liste
        </span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden bg-white dark:bg-gray-800">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-gray-100">
              Numéros de téléphone incorrects ({entityLabel})
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-gray-400">
              Les {count} {label}{plural} suivant{plural} ont un numéro de téléphone qui commence par 0. Corrigez-les pour permettre l&apos;envoi de SMS/WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 dark:border-gray-700 max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold">Téléphone (invalide)</TableHead>
                  <TableHead className="font-semibold">Indicatif</TableHead>
                  <TableHead className="font-semibold">Champ</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  {entityLabel === "clients" && (
                    <TableHead className="font-semibold">Code</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {phones.map((row, idx) => (
                  <TableRow
                    key={`${row.id}-${row.field}-${idx}`}
                    className="dark:border-gray-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleRowClick(row.id)}
                  >
                    <TableCell className="font-mono text-sm text-red-700 dark:text-red-400">
                      {row.phone}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-400">
                      {row.indicatif || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-400">
                      <span className="text-xs bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {row.field}
                      </span>
                    </TableCell>
                    <TableCell>
                      {[row.prenom, row.nom, row.postnom ?? row.postNom]
                        .filter(Boolean)
                        .join(" ")}
                    </TableCell>
                    {entityLabel === "clients" && (
                      <TableCell className="text-slate-600 dark:text-gray-400">
                        {row.code ?? "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end pt-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
