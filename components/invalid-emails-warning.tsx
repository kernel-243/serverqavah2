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
import { ScrollArea } from "@/components/ui/scroll-area"

export interface InvalidEmailEntry {
  id: string
  email: string
  prenom?: string
  nom?: string
  postnom?: string
  postNom?: string
  code?: string
  email2?: string
}

interface InvalidEmailsWarningProps {
  count: number
  emails: InvalidEmailEntry[]
  entityLabel: "clients" | "prospects"
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvalidEmailsWarning({
  count,
  emails,
  entityLabel,
  open,
  onOpenChange,
}: InvalidEmailsWarningProps) {
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
        className="flex items-center gap-2 w-full text-left rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-800 dark:text-amber-200 font-medium">
          {count} adresse{plural} email incorrecte{plural} (format invalide)
        </span>
        <span className="text-amber-600 dark:text-amber-400 text-sm ml-auto">
          Cliquez pour afficher la liste
        </span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-gray-100">
              Adresses email incorrectes ({entityLabel})
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-gray-400">
              Les {count} {label}{plural} suivant{plural} ont une adresse email mal saisie (ex. sans @). Corrigez-les pour permettre l&apos;envoi d&apos;emails.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh] rounded-md border border-slate-200 dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold">Email (invalide)</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  {entityLabel === "clients" && (
                    <TableHead className="font-semibold">Code</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((row) => (
                  <TableRow
                    key={row.id}
                    className="dark:border-gray-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleRowClick(row.id)}
                  >
                    <TableCell className="font-mono text-sm text-amber-700 dark:text-amber-400">
                      {row.email}
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
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
