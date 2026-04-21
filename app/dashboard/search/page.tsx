"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
const LIMIT = 20

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""

  const [loading, setLoading] = useState(!!q)
  const [clients, setClients] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [contrats, setContrats] = useState<any[]>([])
  const [terrains, setTerrains] = useState<any[]>([])

  const fetchAll = useCallback(async (query: string) => {
    if (!query.trim()) {
      setClients([])
      setProspects([])
      setContrats([])
      setTerrains([])
      setLoading(false)
      return
    }
    setLoading(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    if (!token) {
      router.push("/auth/login")
      return
    }
    const base = process.env.NEXT_PUBLIC_API_URL
    const params = new URLSearchParams({ search: query.trim(), limit: String(LIMIT), page: "1" })

    try {
      const [clientsRes, prospectsRes, contratsRes, terrainsRes] = await Promise.allSettled([
        axios.get(`${base}/clients?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${base}/prospects?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${base}/contrats/fetch/all?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${base}/terrains?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      setClients(
        clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value.data?.clients)
          ? clientsRes.value.data.clients
          : clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value.data)
          ? clientsRes.value.data
          : []
      )
      setProspects(
        prospectsRes.status === "fulfilled" && Array.isArray(prospectsRes.value.data?.prospects)
          ? prospectsRes.value.data.prospects
          : prospectsRes.status === "fulfilled" && Array.isArray(prospectsRes.value.data)
          ? prospectsRes.value.data
          : []
      )
      setContrats(
        contratsRes.status === "fulfilled" && Array.isArray(contratsRes.value.data?.contrats)
          ? contratsRes.value.data.contrats
          : contratsRes.status === "fulfilled" && Array.isArray(contratsRes.value.data)
          ? contratsRes.value.data
          : []
      )
      setTerrains(
        terrainsRes.status === "fulfilled" && Array.isArray(terrainsRes.value.data?.terrains)
          ? terrainsRes.value.data.terrains
          : terrainsRes.status === "fulfilled" && Array.isArray(terrainsRes.value.data)
          ? terrainsRes.value.data
          : []
      )
    } catch {
      setClients([])
      setProspects([])
      setContrats([])
      setTerrains([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchAll(q)
  }, [q, fetchAll])

  const total =
    clients.length + prospects.length + contrats.length + terrains.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recherche globale</h1>
          <p className="text-muted-foreground">
            {q
              ? `Résultats pour « ${q} »`
              : "Saisissez un terme dans la barre de recherche du menu."}
          </p>
        </div>
      </div>

      {!q.trim() && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Utilisez la zone de recherche dans la barre de navigation pour rechercher parmi les clients, prospects, contrats et terrains.
          </CardContent>
        </Card>
      )}

      {q.trim() && loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {q.trim() && !loading && total === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun résultat pour « {q} ». Essayez un autre terme.
          </CardContent>
        </Card>
      )}

      {q.trim() && !loading && total > 0 && (
        <div className="space-y-6">
          {clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.user className="h-5 w-5" />
                  Clients ({clients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell>
                          {[c.prenom, c.nom].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell>{c.code ?? "—"}</TableCell>
                        <TableCell>{c.email ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/clients/detail/${c._id}`)
                            }
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {prospects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.user className="h-5 w-5" />
                  Prospects ({prospects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          {[p.prenom, p.nom].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell>{p.email ?? "—"}</TableCell>
                        <TableCell>
                          {p.indicatif && p.telephone
                            ? `${p.indicatif} ${p.telephone}`
                            : p.telephone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/prospect/${p._id}`)
                            }
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {contrats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.fileText className="h-5 w-5" />
                  Contrats ({contrats.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Terrain</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contrats.map((c) => {
                      const client = c.clientId
                      const terrain = c.terrainId
                      return (
                        <TableRow key={c._id}>
                          <TableCell>{c.code ?? "—"}</TableCell>
                          <TableCell>
                            {client
                              ? [client.prenom, client.nom]
                                  .filter(Boolean)
                                  .join(" ") || client.code
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {terrain?.numero ?? terrain?.code ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/contrat/${c.code || c._id}`
                                )
                              }
                            >
                              Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {terrains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.mapPin className="h-5 w-5" />
                  Terrains ({terrains.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Dimension</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terrains.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>{t.numero ?? "—"}</TableCell>
                        <TableCell>{t.code ?? "—"}</TableCell>
                        <TableCell>{t.dimension ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/terrain/${t._id}`)
                            }
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
