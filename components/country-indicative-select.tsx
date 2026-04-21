"use client"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"

interface CountryIndicativeSelectProps {
  value: string
  onValueChange: (value: string) => void
  defaultValue?: string
  className?: string
}

// Organisation des pays par régions pour une meilleure UX
const countryRegions = {
  "Afrique": [
    { value: "+20", label: "Égypte", flag: "🇪🇬" },
    { value: "+27", label: "Afrique du Sud", flag: "🇿🇦" },
    { value: "+211", label: "Soudan du Sud", flag: "🇸🇸" },
    { value: "+212", label: "Maroc", flag: "🇲🇦" },
    { value: "+213", label: "Algérie", flag: "🇩🇿" },
    { value: "+216", label: "Tunisie", flag: "🇹🇳" },
    { value: "+218", label: "Libye", flag: "🇱🇾" },
    { value: "+220", label: "Gambie", flag: "🇬🇲" },
    { value: "+221", label: "Sénégal", flag: "🇸🇳" },
    { value: "+222", label: "Mauritanie", flag: "🇲🇷" },
    { value: "+223", label: "Mali", flag: "🇲🇱" },
    { value: "+224", label: "Guinée", flag: "🇬🇳" },
    { value: "+225", label: "Côte d'Ivoire", flag: "🇨🇮" },
    { value: "+226", label: "Burkina Faso", flag: "🇧🇫" },
    { value: "+227", label: "Niger", flag: "🇳🇪" },
    { value: "+228", label: "Togo", flag: "🇹🇬" },
    { value: "+229", label: "Bénin", flag: "🇧🇯" },
    { value: "+230", label: "Île Maurice", flag: "🇲🇺" },
    { value: "+231", label: "Libéria", flag: "🇱🇷" },
    { value: "+232", label: "Sierra Leone", flag: "🇸🇱" },
    { value: "+233", label: "Ghana", flag: "🇬🇭" },
    { value: "+234", label: "Nigéria", flag: "🇳🇬" },
    { value: "+235", label: "Tchad", flag: "🇹🇩" },
    { value: "+236", label: "République centrafricaine", flag: "🇨🇫" },
    { value: "+237", label: "Cameroun", flag: "🇨🇲" },
    { value: "+238", label: "Cap-Vert", flag: "🇨🇻" },
    { value: "+239", label: "Sao Tomé-et-Principe", flag: "🇸🇹" },
    { value: "+240", label: "Guinée équatoriale", flag: "🇬🇶" },
    { value: "+241", label: "Gabon", flag: "🇬🇦" },
    { value: "+242", label: "République du Congo", flag: "🇨🇬" },
    { value: "+243", label: "RD Congo", flag: "🇨🇩" },
    { value: "+244", label: "Angola", flag: "🇦🇴" },
    { value: "+245", label: "Guinée-Bissau", flag: "🇬🇼" },
    { value: "+248", label: "Seychelles", flag: "🇸🇨" },
    { value: "+249", label: "Soudan", flag: "🇸🇩" },
    { value: "+250", label: "Rwanda", flag: "🇷🇼" },
    { value: "+251", label: "Éthiopie", flag: "🇪🇹" },
    { value: "+252", label: "Somalie", flag: "🇸🇴" },
    { value: "+253", label: "Djibouti", flag: "🇩🇯" },
    { value: "+254", label: "Kenya", flag: "🇰🇪" },
    { value: "+255", label: "Tanzanie", flag: "🇹🇿" },
    { value: "+256", label: "Ouganda", flag: "🇺🇬" },
    { value: "+257", label: "Burundi", flag: "🇧🇮" },
    { value: "+258", label: "Mozambique", flag: "🇲🇿" },
    { value: "+260", label: "Zambie", flag: "🇿🇲" },
    { value: "+261", label: "Madagascar", flag: "🇲🇬" },
    { value: "+262", label: "La Réunion", flag: "🇷🇪" },
    { value: "+263", label: "Zimbabwe", flag: "🇿🇼" },
    { value: "+264", label: "Namibie", flag: "🇳🇦" },
    { value: "+265", label: "Malawi", flag: "🇲🇼" },
    { value: "+266", label: "Lesotho", flag: "🇱🇸" },
    { value: "+267", label: "Botswana", flag: "🇧🇼" },
    { value: "+268", label: "Eswatini", flag: "🇸🇿" },
    { value: "+269", label: "Comores", flag: "🇰🇲" },
    { value: "+290", label: "Sainte-Hélène", flag: "🇸🇭" },
    { value: "+291", label: "Érythrée", flag: "🇪🇷" },
  ],
  "Europe": [
    { value: "+30", label: "Grèce", flag: "🇬🇷" },
    { value: "+31", label: "Pays-Bas", flag: "🇳🇱" },
    { value: "+32", label: "Belgique", flag: "🇧🇪" },
    { value: "+33", label: "France", flag: "🇫🇷" },
    { value: "+34", label: "Espagne", flag: "🇪🇸" },
    { value: "+36", label: "Hongrie", flag: "🇭🇺" },
    { value: "+39", label: "Italie", flag: "🇮🇹" },
    { value: "+40", label: "Roumanie", flag: "🇷🇴" },
    { value: "+41", label: "Suisse", flag: "🇨🇭" },
    { value: "+43", label: "Autriche", flag: "🇦🇹" },
    { value: "+44", label: "Royaume-Uni", flag: "🇬🇧" },
    { value: "+45", label: "Danemark", flag: "🇩🇰" },
    { value: "+46", label: "Suède", flag: "🇸🇪" },
    { value: "+47", label: "Norvège", flag: "🇳🇴" },
    { value: "+48", label: "Pologne", flag: "🇵🇱" },
    { value: "+49", label: "Allemagne", flag: "🇩🇪" },
    { value: "+350", label: "Gibraltar", flag: "🇬🇮" },
    { value: "+351", label: "Portugal", flag: "🇵🇹" },
    { value: "+352", label: "Luxembourg", flag: "🇱🇺" },
    { value: "+353", label: "Irlande", flag: "🇮🇪" },
    { value: "+354", label: "Islande", flag: "🇮🇸" },
    { value: "+355", label: "Albanie", flag: "🇦🇱" },
    { value: "+356", label: "Malte", flag: "🇲🇹" },
    { value: "+357", label: "Chypre", flag: "🇨🇾" },
    { value: "+358", label: "Finlande", flag: "🇫🇮" },
    { value: "+359", label: "Bulgarie", flag: "🇧🇬" },
    { value: "+370", label: "Lituanie", flag: "🇱🇹" },
    { value: "+371", label: "Lettonie", flag: "🇱🇻" },
    { value: "+372", label: "Estonie", flag: "🇪🇪" },
    { value: "+373", label: "Moldavie", flag: "🇲🇩" },
    { value: "+374", label: "Arménie", flag: "🇦🇲" },
    { value: "+375", label: "Biélorussie", flag: "🇧🇾" },
    { value: "+376", label: "Andorre", flag: "🇦🇩" },
    { value: "+377", label: "Monaco", flag: "🇲🇨" },
    { value: "+378", label: "Saint-Marin", flag: "🇸🇲" },
    { value: "+380", label: "Ukraine", flag: "🇺🇦" },
    { value: "+381", label: "Serbie", flag: "🇷🇸" },
    { value: "+382", label: "Monténégro", flag: "🇲🇪" },
    { value: "+383", label: "Kosovo", flag: "🇽🇰" },
    { value: "+385", label: "Croatie", flag: "🇭🇷" },
    { value: "+386", label: "Slovénie", flag: "🇸🇮" },
    { value: "+387", label: "Bosnie-Herzégovine", flag: "🇧🇦" },
    { value: "+389", label: "Macédoine du Nord", flag: "🇲🇰" },
    { value: "+420", label: "République tchèque", flag: "🇨🇿" },
    { value: "+421", label: "Slovaquie", flag: "🇸🇰" },
    { value: "+423", label: "Liechtenstein", flag: "🇱🇮" },
    { value: "+297", label: "Aruba", flag: "🇦🇼" },
    { value: "+298", label: "Îles Féroé", flag: "🇫🇴" },
    { value: "+299", label: "Groenland", flag: "🇬🇱" },
  ],
  "Amérique": [
    { value: "+1", label: "États-Unis/Canada", flag: "🇺🇸" },
    { value: "+7", label: "Russie", flag: "🇷🇺" },
    { value: "+51", label: "Pérou", flag: "🇵🇪" },
    { value: "+52", label: "Mexique", flag: "🇲🇽" },
    { value: "+53", label: "Cuba", flag: "🇨🇺" },
    { value: "+54", label: "Argentine", flag: "🇦🇷" },
    { value: "+55", label: "Brésil", flag: "🇧🇷" },
    { value: "+56", label: "Chili", flag: "🇨🇱" },
    { value: "+57", label: "Colombie", flag: "🇨🇴" },
    { value: "+58", label: "Venezuela", flag: "🇻🇪" },
    { value: "+500", label: "Îles Malouines", flag: "🇫🇰" },
    { value: "+501", label: "Belize", flag: "🇧🇿" },
    { value: "+502", label: "Guatemala", flag: "🇬🇹" },
    { value: "+503", label: "Salvador", flag: "🇸🇻" },
    { value: "+504", label: "Honduras", flag: "🇭🇳" },
    { value: "+505", label: "Nicaragua", flag: "🇳🇮" },
    { value: "+506", label: "Costa Rica", flag: "🇨🇷" },
    { value: "+507", label: "Panama", flag: "🇵🇦" },
    { value: "+509", label: "Haïti", flag: "🇭🇹" },
    { value: "+590", label: "Guadeloupe", flag: "🇬🇵" },
    { value: "+591", label: "Bolivie", flag: "🇧🇴" },
    { value: "+592", label: "Guyana", flag: "🇬🇾" },
    { value: "+593", label: "Équateur", flag: "🇪🇨" },
    { value: "+594", label: "Guyane française", flag: "🇬🇫" },
    { value: "+595", label: "Paraguay", flag: "🇵🇾" },
    { value: "+597", label: "Suriname", flag: "🇸🇷" },
    { value: "+598", label: "Uruguay", flag: "🇺🇾" },
    { value: "+599", label: "Curaçao", flag: "🇨🇼" },
  ],
  "Asie": [
    { value: "+60", label: "Malaisie", flag: "🇲🇾" },
    { value: "+62", label: "Indonésie", flag: "🇮🇩" },
    { value: "+63", label: "Philippines", flag: "🇵🇭" },
    { value: "+65", label: "Singapour", flag: "🇸🇬" },
    { value: "+66", label: "Thaïlande", flag: "🇹🇭" },
    { value: "+81", label: "Japon", flag: "🇯🇵" },
    { value: "+82", label: "Corée du Sud", flag: "🇰🇷" },
    { value: "+84", label: "Viêt Nam", flag: "🇻🇳" },
    { value: "+86", label: "Chine", flag: "🇨🇳" },
    { value: "+90", label: "Turquie", flag: "🇹🇷" },
    { value: "+91", label: "Inde", flag: "🇮🇳" },
    { value: "+92", label: "Pakistan", flag: "🇵🇰" },
    { value: "+93", label: "Afghanistan", flag: "🇦🇫" },
    { value: "+94", label: "Sri Lanka", flag: "🇱🇰" },
    { value: "+95", label: "Myanmar", flag: "🇲🇲" },
    { value: "+98", label: "Iran", flag: "🇮🇷" },
    { value: "+850", label: "Corée du Nord", flag: "🇰🇵" },
    { value: "+852", label: "Hong Kong", flag: "🇭🇰" },
    { value: "+853", label: "Macao", flag: "🇲🇴" },
    { value: "+855", label: "Cambodge", flag: "🇰🇭" },
    { value: "+856", label: "Laos", flag: "🇱🇦" },
    { value: "+880", label: "Bangladesh", flag: "🇧🇩" },
    { value: "+886", label: "Taïwan", flag: "🇹🇼" },
    { value: "+960", label: "Maldives", flag: "🇲🇻" },
    { value: "+961", label: "Liban", flag: "🇱🇧" },
    { value: "+962", label: "Jordanie", flag: "🇯🇴" },
    { value: "+963", label: "Syrie", flag: "🇸🇾" },
    { value: "+964", label: "Irak", flag: "🇮🇶" },
    { value: "+965", label: "Koweït", flag: "🇰🇼" },
    { value: "+966", label: "Arabie saoudite", flag: "🇸🇦" },
    { value: "+967", label: "Yémen", flag: "🇾🇪" },
    { value: "+968", label: "Oman", flag: "🇴🇲" },
    { value: "+970", label: "Palestine", flag: "🇵🇸" },
    { value: "+971", label: "Émirats arabes unis", flag: "🇦🇪" },
    { value: "+972", label: "Israël", flag: "🇮🇱" },
    { value: "+973", label: "Bahreïn", flag: "🇧🇭" },
    { value: "+974", label: "Qatar", flag: "🇶🇦" },
    { value: "+975", label: "Bhoutan", flag: "🇧🇹" },
    { value: "+976", label: "Mongolie", flag: "🇲🇳" },
    { value: "+977", label: "Népal", flag: "🇳🇵" },
    { value: "+992", label: "Tadjikistan", flag: "🇹🇯" },
    { value: "+993", label: "Turkménistan", flag: "🇹🇲" },
    { value: "+994", label: "Azerbaïdjan", flag: "🇦🇿" },
    { value: "+995", label: "Géorgie", flag: "🇬🇪" },
    { value: "+996", label: "Kirghizistan", flag: "🇰🇬" },
    { value: "+998", label: "Ouzbékistan", flag: "🇺🇿" },
  ],
  "Océanie": [
    { value: "+61", label: "Australie", flag: "🇦🇺" },
    { value: "+64", label: "Nouvelle-Zélande", flag: "🇳🇿" },
    { value: "+670", label: "Timor oriental", flag: "🇹🇱" },
    { value: "+672", label: "Île Norfolk", flag: "🇳🇫" },
    { value: "+673", label: "Brunei", flag: "🇧🇳" },
    { value: "+674", label: "Nauru", flag: "🇳🇷" },
    { value: "+675", label: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬" },
    { value: "+676", label: "Tonga", flag: "🇹🇴" },
    { value: "+677", label: "Îles Salomon", flag: "🇸🇧" },
    { value: "+678", label: "Vanuatu", flag: "🇻🇺" },
    { value: "+679", label: "Fidji", flag: "🇫🇯" },
    { value: "+680", label: "Palaos", flag: "🇵🇼" },
    { value: "+681", label: "Wallis-et-Futuna", flag: "🇼🇫" },
    { value: "+682", label: "Îles Cook", flag: "🇨🇰" },
    { value: "+683", label: "Niue", flag: "🇳🇺" },
    { value: "+685", label: "Samoa", flag: "🇼🇸" },
    { value: "+686", label: "Kiribati", flag: "🇰🇮" },
    { value: "+687", label: "Nouvelle-Calédonie", flag: "🇳🇨" },
    { value: "+688", label: "Tuvalu", flag: "🇹🇻" },
    { value: "+689", label: "Polynésie française", flag: "🇵🇫" },
    { value: "+690", label: "Tokelau", flag: "🇹🇰" },
    { value: "+691", label: "Micronésie", flag: "🇫🇲" },
    { value: "+692", label: "Îles Marshall", flag: "🇲🇭" },
  ]
}

/** Flat list of all country codes for use in filters (e.g. clients/prospects indicatif filter). */
export const COUNTRY_CODES_FOR_FILTER = Object.values(countryRegions).flat()

export function CountryIndicativeSelect({ value, onValueChange, defaultValue = "+243", className }: CountryIndicativeSelectProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Filtrer les pays par recherche
  const filteredRegions = useMemo(() => {
    if (!search.trim()) {
      return countryRegions
    }

    const searchLower = search.toLowerCase()
    const filtered: Record<string, typeof countryRegions[keyof typeof countryRegions]> = {}

    Object.entries(countryRegions).forEach(([region, countries]) => {
      const filteredCountries = countries.filter(country =>
        country.label.toLowerCase().includes(searchLower) ||
        country.value.includes(search) ||
        country.flag.includes(search)
      )
      
      if (filteredCountries.length > 0) {
        filtered[region] = filteredCountries
      }
    })

    return filtered
  }, [search])

  // Trouver le pays sélectionné pour l'affichage
  const selectedCountry = useMemo(() => {
    for (const region of Object.values(countryRegions)) {
      const country = region.find(c => c.value === value)
      if (country) return country
    }
    return null
  }, [value])

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      defaultValue={defaultValue}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={`w-[200px] ${className}`}>
        <SelectValue>
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.value}</span>
            </div>
          ) : (
            "Sélectionner un pays"
          )}
        </SelectValue>
      </SelectTrigger>
      
      <SelectContent className="w-[350px] max-h-[400px]">
        {/* Barre de recherche */}
        <div className="p-3 border-b">
          <div className="relative">
            <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="🔍 Rechercher un pays ou un indicatif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icons.x className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Liste des pays par région */}
        <div className="max-h-[320px] overflow-y-auto">
          {Object.keys(filteredRegions).length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Icons.frown className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Aucun pays trouvé</p>
              <p className="text-xs text-gray-400">Essayez avec d'autres mots-clés</p>
            </div>
          ) : (
            Object.entries(filteredRegions).map(([region, countries]) => (
              <SelectGroup key={region}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-slate-800 border-b">
                  {region} ({countries.length})
                </div>
                {countries.map((country) => (
                  <SelectItem
                    key={country.value}
                    value={country.value}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{country.label}</div>
                        <div className="text-xs text-gray-500">{country.value}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          )}
        </div>

        {/* Statistiques de recherche */}
        {search && (
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t bg-gray-50 dark:bg-slate-800">
            {Object.values(filteredRegions).flat().length} pays trouvés
          </div>
        )}
      </SelectContent>
    </Select>
  )
}


