"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Icons } from "@/components/icons"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

const LIMIT = 5
const DEBOUNCE_MS = 300

interface SearchHit {
  type: "client" | "prospect" | "contrat" | "terrain"
  id: string
  code?: string
  label: string
  sublabel?: string
  href: string
}

interface SearchState {
  clients: SearchHit[]
  prospects: SearchHit[]
  contrats: SearchHit[]
  terrains: SearchHit[]
}

async function fetchSearch(
  token: string | null,
  q: string
): Promise<SearchState> {
  if (!token || !q.trim()) {
    return { clients: [], prospects: [], contrats: [], terrains: [] }
  }
  const base = process.env.NEXT_PUBLIC_API_URL
  const params = new URLSearchParams({ search: q.trim(), limit: String(LIMIT), page: "1" })

  const [clientsRes, prospectsRes, contratsRes, terrainsRes] = await Promise.allSettled([
    axios.get(`${base}/clients?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${base}/prospects?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${base}/contrats/fetch/all?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${base}/terrains?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
  ])

  const toClient = (c: { _id: string; code?: string; nom?: string; prenom?: string; email?: string }) => ({
    type: "client" as const,
    id: c._id,
    code: c.code,
    label: [c.prenom, c.nom].filter(Boolean).join(" ") || c.code || c._id,
    sublabel: c.email,
    href: `/dashboard/clients/detail/${c._id}`,
  })
  const toProspect = (p: { _id: string; nom?: string; prenom?: string; email?: string }) => ({
    type: "prospect" as const,
    id: p._id,
    label: [p.prenom, p.nom].filter(Boolean).join(" ") || p._id,
    sublabel: p.email,
    href: `/dashboard/prospect/${p._id}`,
  })
  const toContrat = (c: { _id: string; code?: string; clientId?: { nom?: string; prenom?: string }; terrainId?: { numero?: string } }) => ({
    type: "contrat" as const,
    id: c._id,
    code: c.code,
    label: c.code || c._id,
    sublabel: [c.clientId?.prenom, c.clientId?.nom].filter(Boolean).join(" ") || c.terrainId?.numero,
    href: `/dashboard/contrat/${c.code || c._id}`,
  })
  const toTerrain = (t: { _id: string; code?: string; numero?: string; dimension?: string }) => ({
    type: "terrain" as const,
    id: t._id,
    code: t.code,
    label: t.numero || t.code || t._id,
    sublabel: t.dimension,
    href: `/dashboard/terrain/${t._id}`,
  })

  const clients: SearchHit[] =
    clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value.data?.clients)
      ? clientsRes.value.data.clients.map(toClient)
      : clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value.data)
      ? (clientsRes.value.data as any[]).map(toClient)
      : []
  const prospects: SearchHit[] =
    prospectsRes.status === "fulfilled" && Array.isArray(prospectsRes.value.data?.prospects)
      ? prospectsRes.value.data.prospects.map(toProspect)
      : prospectsRes.status === "fulfilled" && Array.isArray(prospectsRes.value.data)
      ? (prospectsRes.value.data as any[]).map(toProspect)
      : []
  const contrats: SearchHit[] =
    contratsRes.status === "fulfilled" && Array.isArray(contratsRes.value.data?.contrats)
      ? contratsRes.value.data.contrats.map(toContrat)
      : contratsRes.status === "fulfilled" && Array.isArray(contratsRes.value.data)
      ? (contratsRes.value.data as any[]).map(toContrat)
      : []
  const terrains: SearchHit[] =
    terrainsRes.status === "fulfilled" && Array.isArray(terrainsRes.value.data?.terrains)
      ? terrainsRes.value.data.terrains.map(toTerrain)
      : terrainsRes.status === "fulfilled" && Array.isArray(terrainsRes.value.data)
      ? (terrainsRes.value.data as any[]).map(toTerrain)
      : []

  return { clients, prospects, contrats, terrains }
}

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<SearchState>({
    clients: [],
    prospects: [],
    contrats: [],
    terrains: [],
  })

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setState({ clients: [], prospects: [], contrats: [], terrains: [] })
      return
    }
    let cancelled = false
    setLoading(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    fetchSearch(token, debouncedQuery).then((result) => {
      if (!cancelled) {
        setState(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [debouncedQuery])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const hasResults =
    state.clients.length > 0 ||
    state.prospects.length > 0 ||
    state.contrats.length > 0 ||
    state.terrains.length > 0

  const handleSelect = useCallback(
    (hit: SearchHit) => {
      setOpen(false)
      setQuery("")
      router.push(hit.href)
    },
    [router]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
        setOpen(false)
        router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
      }
    },
    [query, router]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-[300px]">
          <div className="relative">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Rechercher (clients, prospects, contrats, terrains)..."
              className={cn("pl-9 md:w-[100px] lg:w-[280px]", className)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              aria-autocomplete="list"
              aria-expanded={open}
            />
          </div>
        </form>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-lg border-0 shadow-none">
          {query.trim() && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Icons.spinner className="h-5 w-5 animate-spin mr-2" />
                  Recherche...
                </div>
              ) : !hasResults ? (
                <CommandEmpty>Aucun résultat pour &quot;{query}&quot;</CommandEmpty>
              ) : (
                <CommandList>
                  {state.clients.length > 0 && (
                    <CommandGroup heading="Clients">
                      {state.clients.map((hit) => (
                        <CommandItem
                          key={`client-${hit.id}`}
                          value={`client-${hit.id}`}
                          onSelect={() => handleSelect(hit)}
                          className="cursor-pointer"
                        >
                          <Icons.user className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">{hit.label}</span>
                            {hit.sublabel && (
                              <span className="text-xs text-muted-foreground truncate">{hit.sublabel}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {state.prospects.length > 0 && (
                    <CommandGroup heading="Prospects">
                      {state.prospects.map((hit) => (
                        <CommandItem
                          key={`prospect-${hit.id}`}
                          value={`prospect-${hit.id}`}
                          onSelect={() => handleSelect(hit)}
                          className="cursor-pointer"
                        >
                          <Icons.user className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">{hit.label}</span>
                            {hit.sublabel && (
                              <span className="text-xs text-muted-foreground truncate">{hit.sublabel}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {state.contrats.length > 0 && (
                    <CommandGroup heading="Contrats">
                      {state.contrats.map((hit) => (
                        <CommandItem
                          key={`contrat-${hit.id}`}
                          value={`contrat-${hit.id}`}
                          onSelect={() => handleSelect(hit)}
                          className="cursor-pointer"
                        >
                          <Icons.fileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">{hit.label}</span>
                            {hit.sublabel && (
                              <span className="text-xs text-muted-foreground truncate">{hit.sublabel}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {state.terrains.length > 0 && (
                    <CommandGroup heading="Terrains">
                      {state.terrains.map((hit) => (
                        <CommandItem
                          key={`terrain-${hit.id}`}
                          value={`terrain-${hit.id}`}
                          onSelect={() => handleSelect(hit)}
                          className="cursor-pointer"
                        >
                          <Icons.mapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">{hit.label}</span>
                            {hit.sublabel && (
                              <span className="text-xs text-muted-foreground truncate">{hit.sublabel}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandItem
                    value="voir-tous"
                    onSelect={() => {
                      setOpen(false)
                      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
                    }}
                    className="cursor-pointer border-t bg-muted/50"
                  >
                    <Icons.search className="mr-2 h-4 w-4" />
                    Voir tous les résultats
                  </CommandItem>
                </CommandList>
              )}
            </>
          )}
          {!query.trim() && open && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Saisissez un terme pour rechercher dans les clients, prospects, contrats et terrains.
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
