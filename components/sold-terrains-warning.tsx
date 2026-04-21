import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Icons } from "@/components/icons"

export interface SoldTerrainEntry {
  _id: string
  numero: string
  cite?: {
    nom?: string
    ville?: string
    commune?: string
  }
  prix?: number
  statut?: string
}

interface SoldTerrainsWarningProps {
  count: number
  terrains: SoldTerrainEntry[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onMakeAvailable: (terrainId: string) => void
  onMakeAllAvailable: () => void
  updatingIds: string[]
  isBulkUpdating: boolean
}

export function SoldTerrainsWarning({
  count,
  terrains,
  open,
  onOpenChange,
  onMakeAvailable,
  onMakeAllAvailable,
  updatingIds,
  isBulkUpdating,
}: SoldTerrainsWarningProps) {
  const router = useRouter()

  if (count <= 0) return null

  const plural = count > 1 ? "s" : ""

  const handleRowClick = (id: string) => {
    onOpenChange(false)
    router.push(`/dashboard/terrain/${id}`)
  }

  const isUpdating = (id: string) => updatingIds.includes(id)

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-2 w-full text-left rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-900 dark:text-amber-100 font-medium">
          {count} terrain{plural} ont le statut "Vendu" mais aucun contrat associé
        </span>
        <span className="text-amber-700 dark:text-amber-300 text-sm ml-auto">
          Cliquez pour afficher la liste
        </span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden bg-white dark:bg-gray-800">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-gray-100">
              Terrains vendus sans contrat
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-gray-400">
              Les {count} terrain{plural} ci-dessous sont marqués comme &quot;Vendu&quot; mais n&apos;ont aucun contrat associé.
              Vous pouvez les remettre en &quot;Disponible&quot; individuellement ou tous en une seule fois.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <p className="text-sm text-slate-600 dark:text-gray-300">
              Cliquez sur une ligne pour ouvrir le détail du terrain.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMakeAllAvailable}
              disabled={isBulkUpdating || terrains.length === 0}
            >
              {isBulkUpdating ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Tout mettre disponible"
              )}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 dark:border-gray-700 max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold">Numéro</TableHead>
                  <TableHead className="font-semibold">Ville</TableHead>
                  <TableHead className="font-semibold">Commune</TableHead>
                  <TableHead className="font-semibold">Cité</TableHead>
                  <TableHead className="font-semibold">Prix</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terrains.map((terrain) => (
                  <TableRow
                    key={terrain._id}
                    className="dark:border-gray-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleRowClick(terrain._id)}
                  >
                    <TableCell className="font-medium text-slate-900 dark:text-gray-100">
                      {terrain.numero}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">
                      {terrain.cite?.ville || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">
                      {terrain.cite?.commune || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">
                      {terrain.cite?.nom || "—"}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-gray-200">
                      {terrain.prix ? `$${terrain.prix.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMakeAvailable(terrain._id)
                        }}
                        disabled={isUpdating(terrain._id) || isBulkUpdating}
                        className="inline-flex items-center gap-1"
                      >
                        {isUpdating(terrain._id) ? (
                          <>
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                            Mise à jour...
                          </>
                        ) : (
                          <>
                            <span>Mettre disponible</span>
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex justify-end pt-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

