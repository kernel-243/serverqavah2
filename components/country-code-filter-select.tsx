"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { COUNTRY_CODES_FOR_FILTER } from "@/components/country-list"
import { Icons } from "@/components/icons"

interface CountryCodeFilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  triggerClassName?: string
  contentClassName?: string
}

export function CountryCodeFilterSelect({
  value,
  onValueChange,
  placeholder = "Code pays",
  triggerClassName,
  contentClassName = "",
}: CountryCodeFilterSelectProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRY_CODES_FOR_FILTER
    const s = search.toLowerCase().trim()
    return COUNTRY_CODES_FOR_FILTER.filter(
      (c) => c.value.includes(search.trim()) || c.label.toLowerCase().includes(s)
    )
  }, [search])

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <div className="p-2 border-b">
          <div className="relative">
            <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un code ou un pays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              onKeyDown={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <Icons.x className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <SelectItem value="all">Tous les codes</SelectItem>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Aucun pays trouvé pour &quot;{search}&quot;
          </div>
        ) : (
          filtered.map((country) => (
            <SelectItem key={country.value} value={country.value}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.value}</span>
                <span className="text-muted-foreground">({country.label})</span>
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
