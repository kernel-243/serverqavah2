"use client"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"

interface Country {
  value: string
  label: string
  flag: string
  capital?: string
  population?: string
}

interface CountryListProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  className?: string
  placeholder?: string
}

// Organisation des pays par régions avec informations supplémentaires
const countryRegions: Record<string, Country[]> = {
  "Afrique": [
    { value: "Égypte", label: "Égypte", flag: "🇪🇬", capital: "Le Caire", population: "102M" },
    { value: "Afrique du Sud", label: "Afrique du Sud", flag: "🇿🇦", capital: "Le Cap", population: "60M" },
    { value: "Soudan du Sud", label: "Soudan du Sud", flag: "🇸🇸", capital: "Djouba", population: "11M" },
    { value: "Maroc", label: "Maroc", flag: "🇲🇦", capital: "Rabat", population: "37M" },
    { value: "Algérie", label: "Algérie", flag: "🇩🇿", capital: "Alger", population: "44M" },
    { value: "Tunisie", label: "Tunisie", flag: "🇹🇳", capital: "Tunis", population: "12M" },
    { value: "Libye", label: "Libye", flag: "🇱🇾", capital: "Tripoli", population: "7M" },
    { value: "Gambie", label: "Gambie", flag: "🇬🇲", capital: "Banjul", population: "2.4M" },
    { value: "Sénégal", label: "Sénégal", flag: "🇸🇳", capital: "Dakar", population: "17M" },
    { value: "Mauritanie", label: "Mauritanie", flag: "🇲🇷", capital: "Nouakchott", population: "4.6M" },
    { value: "Mali", label: "Mali", flag: "🇲🇱", capital: "Bamako", population: "21M" },
    { value: "Guinée", label: "Guinée", flag: "🇬🇳", capital: "Conakry", population: "13M" },
    { value: "Côte d'Ivoire", label: "Côte d'Ivoire", flag: "🇨🇮", capital: "Yamoussoukro", population: "27M" },
         { value: "Burkina Faso", label: "Burkina Faso", flag: "🇧🇫", capital: "Ouagadougou", population: "22M" },
     { value: "Niger", label: "Niger", flag: "🇳🇪", capital: "Niamey", population: "25M" },
     { value: "Togo", label: "Togo", flag: "🇹🇬", capital: "Lomé", population: "8M" },
     { value: "Bénin", label: "Bénin", flag: "🇧🇯", capital: "Porto-Novo", population: "12M" },
     { value: "Île Maurice", label: "Île Maurice", flag: "🇲🇺", capital: "Port-Louis", population: "1.3M" },
     { value: "Libéria", label: "Libéria", flag: "🇱🇷", capital: "Monrovia", population: "5M" },
     { value: "Sierra Leone", label: "Sierra Leone", flag: "🇸🇱", capital: "Freetown", population: "8M" },
     { value: "Ghana", label: "Ghana", flag: "🇬🇭", capital: "Accra", population: "32M" },
     { value: "Nigéria", label: "Nigéria", flag: "🇳🇬", capital: "Abuja", population: "218M" },
     { value: "Tchad", label: "Tchad", flag: "🇹🇩", capital: "N'Djamena", population: "17M" },
     { value: "République centrafricaine", label: "République centrafricaine", flag: "🇨🇫", capital: "Bangui", population: "5M" },
     { value: "Cameroun", label: "Cameroun", flag: "🇨🇲", capital: "Yaoundé", population: "27M" },
     { value: "Cap-Vert", label: "Cap-Vert", flag: "🇨🇻", capital: "Praia", population: "561K" },
     { value: "Sao Tomé-et-Principe", label: "Sao Tomé-et-Principe", flag: "🇸🇹", capital: "São Tomé", population: "219K" },
     { value: "Guinée équatoriale", label: "Guinée équatoriale", flag: "🇬🇶", capital: "Malabo", population: "1.4M" },
     { value: "Gabon", label: "Gabon", flag: "🇬🇦", capital: "Libreville", population: "2.2M" },
     { value: "République du Congo", label: "République du Congo", flag: "🇨🇬", capital: "Brazzaville", population: "5.5M" },
     { value: "RD Congo", label: "RD Congo", flag: "🇨🇩", capital: "Kinshasa", population: "95M" },
     { value: "Angola", label: "Angola", flag: "🇦🇴", capital: "Luanda", population: "33M" },
     { value: "Guinée-Bissau", label: "Guinée-Bissau", flag: "🇬🇼", capital: "Bissau", population: "2M" },
     { value: "Seychelles", label: "Seychelles", flag: "🇸🇨", capital: "Victoria", population: "99K" },
     { value: "Soudan", label: "Soudan", flag: "🇸🇩", capital: "Khartoum", population: "45M" },
     { value: "Rwanda", label: "Rwanda", flag: "🇷🇼", capital: "Kigali", population: "13M" },
     { value: "Éthiopie", label: "Éthiopie", flag: "🇪🇹", capital: "Addis-Abeba", population: "118M" },
     { value: "Somalie", label: "Somalie", flag: "🇸🇴", capital: "Mogadiscio", population: "16M" },
     { value: "Djibouti", label: "Djibouti", flag: "🇩🇯", capital: "Djibouti", population: "995K" },
     { value: "Kenya", label: "Kenya", flag: "🇰🇪", capital: "Nairobi", population: "54M" },
     { value: "Tanzanie", label: "Tanzanie", flag: "🇹🇿", capital: "Dodoma", population: "61M" },
     { value: "Ouganda", label: "Ouganda", flag: "🇺🇬", capital: "Kampala", population: "47M" },
     { value: "Burundi", label: "Burundi", flag: "🇧🇮", capital: "Gitega", population: "12M" },
     { value: "Mozambique", label: "Mozambique", flag: "🇲🇿", capital: "Maputo", population: "32M" },
     { value: "Zambie", label: "Zambie", flag: "🇿🇲", capital: "Lusaka", population: "19M" },
     { value: "Madagascar", label: "Madagascar", flag: "🇲🇬", capital: "Antananarivo", population: "28M" },
     { value: "La Réunion", label: "La Réunion", flag: "🇷🇪", capital: "Saint-Denis", population: "896K" },
     { value: "Zimbabwe", label: "Zimbabwe", flag: "🇿🇼", capital: "Harare", population: "15M" },
     { value: "Namibie", label: "Namibie", flag: "🇳🇦", capital: "Windhoek", population: "2.5M" },
     { value: "Malawi", label: "Malawi", flag: "🇲🇼", capital: "Lilongwe", population: "20M" },
     { value: "Lesotho", label: "Lesotho", flag: "🇱🇸", capital: "Maseru", population: "2.1M" },
     { value: "Botswana", label: "Botswana", flag: "🇧🇼", capital: "Gaborone", population: "2.4M" },
     { value: "Eswatini", label: "Eswatini", flag: "🇸🇿", capital: "Mbabane", population: "1.2M" },
     { value: "Comores", label: "Comores", flag: "🇰🇲", capital: "Moroni", population: "870K" },
     { value: "Sainte-Hélène", label: "Sainte-Hélène", flag: "🇸🇭", capital: "Jamestown", population: "6K" },
     { value: "Érythrée", label: "Érythrée", flag: "🇪🇷", capital: "Asmara", population: "3.5M" },
  ],
  "Europe": [
    { value: "Grèce", label: "Grèce", flag: "🇬🇷", capital: "Athènes", population: "10.7M" },
    { value: "Pays-Bas", label: "Pays-Bas", flag: "🇳🇱", capital: "Amsterdam", population: "17.4M" },
    { value: "Belgique", label: "Belgique", flag: "🇧🇪", capital: "Bruxelles", population: "11.5M" },
    { value: "France", label: "France", flag: "🇫🇷", capital: "Paris", population: "67M" },
    { value: "Espagne", label: "Espagne", flag: "🇪🇸", capital: "Madrid", population: "47M" },
    { value: "Hongrie", label: "Hongrie", flag: "🇭🇺", capital: "Budapest", population: "9.7M" },
    { value: "Italie", label: "Italie", flag: "🇮🇹", capital: "Rome", population: "60M" },
    { value: "Roumanie", label: "Roumanie", flag: "🇷🇴", capital: "Bucarest", population: "19M" },
    { value: "Suisse", label: "Suisse", flag: "🇨🇭", capital: "Berne", population: "8.7M" },
    { value: "Autriche", label: "Autriche", flag: "🇦🇹", capital: "Vienne", population: "9M" },
    { value: "Royaume-Uni", label: "Royaume-Uni", flag: "🇬🇧", capital: "Londres", population: "67M" },
    { value: "Danemark", label: "Danemark", flag: "🇩🇰", capital: "Copenhague", population: "5.8M" },
    { value: "Suède", label: "Suède", flag: "🇸🇪", capital: "Stockholm", population: "10.4M" },
    { value: "Norvège", label: "Norvège", flag: "🇳🇴", capital: "Oslo", population: "5.4M" },
    { value: "Pologne", label: "Pologne", flag: "🇵🇱", capital: "Varsovie", population: "38M" },
    { value: "Allemagne", label: "Allemagne", flag: "🇩🇪", capital: "Berlin", population: "83M" },
    { value: "Gibraltar", label: "Gibraltar", flag: "🇬🇮", capital: "Gibraltar", population: "34K" },
    { value: "Portugal", label: "Portugal", flag: "🇵🇹", capital: "Lisbonne", population: "10.3M" },
    { value: "Luxembourg", label: "Luxembourg", flag: "🇱🇺", capital: "Luxembourg", population: "634K" },
    { value: "Irlande", label: "Irlande", flag: "🇮🇪", capital: "Dublin", population: "5M" },
    { value: "Islande", label: "Islande", flag: "🇮🇸", capital: "Reykjavik", population: "372K" },
    { value: "Albanie", label: "Albanie", flag: "🇦🇱", capital: "Tirana", population: "2.8M" },
    { value: "Malte", label: "Malte", flag: "🇲🇹", capital: "La Valette", population: "516K" },
    { value: "Chypre", label: "Chypre", flag: "🇨🇾", capital: "Nicosie", population: "1.2M" },
    { value: "Finlande", label: "Finlande", flag: "🇫🇮", capital: "Helsinki", population: "5.5M" },
    { value: "Bulgarie", label: "Bulgarie", flag: "🇧🇬", capital: "Sofia", population: "6.9M" },
    { value: "Lituanie", label: "Lituanie", flag: "🇱🇹", capital: "Vilnius", population: "2.8M" },
    { value: "Lettonie", label: "Lettonie", flag: "🇱🇻", capital: "Riga", population: "1.9M" },
    { value: "Estonie", label: "Estonie", flag: "🇪🇪", capital: "Tallinn", population: "1.3M" },
    { value: "Moldavie", label: "Moldavie", flag: "🇲🇩", capital: "Chișinău", population: "2.6M" },
    { value: "Arménie", label: "Arménie", flag: "🇦🇲", capital: "Erevan", population: "3M" },
    { value: "Biélorussie", label: "Biélorussie", flag: "🇧🇾", capital: "Minsk", population: "9.4M" },
    { value: "Andorre", label: "Andorre", flag: "🇦🇩", capital: "Andorre-la-Vieille", population: "79K" },
    { value: "Monaco", label: "Monaco", flag: "🇲🇨", capital: "Monaco", population: "39K" },
    { value: "Saint-Marin", label: "Saint-Marin", flag: "🇸🇲", capital: "Saint-Marin", population: "34K" },
    { value: "Ukraine", label: "Ukraine", flag: "🇺🇦", capital: "Kiev", population: "44M" },
    { value: "Serbie", label: "Serbie", flag: "🇷🇸", capital: "Belgrade", population: "7M" },
    { value: "Monténégro", label: "Monténégro", flag: "🇲🇪", capital: "Podgorica", population: "628K" },
    { value: "Kosovo", label: "Kosovo", flag: "🇽🇰", capital: "Pristina", population: "1.9M" },
    { value: "Croatie", label: "Croatie", flag: "🇭🇷", capital: "Zagreb", population: "3.9M" },
    { value: "Slovénie", label: "Slovénie", flag: "🇸🇮", capital: "Ljubljana", population: "2.1M" },
    { value: "Bosnie-Herzégovine", label: "Bosnie-Herzégovine", flag: "🇧🇦", capital: "Sarajevo", population: "3.3M" },
    { value: "Macédoine du Nord", label: "Macédoine du Nord", flag: "🇲🇰", capital: "Skopje", population: "2.1M" },
    { value: "République tchèque", label: "République tchèque", flag: "🇨🇿", capital: "Prague", population: "10.7M" },
    { value: "Slovaquie", label: "Slovaquie", flag: "🇸🇰", capital: "Bratislava", population: "5.5M" },
    { value: "Liechtenstein", label: "Liechtenstein", flag: "🇱🇮", capital: "Vaduz", population: "39K" },
    { value: "Aruba", label: "Aruba", flag: "🇦🇼", capital: "Oranjestad", population: "107K" },
    { value: "Îles Féroé", label: "Îles Féroé", flag: "🇫🇴", capital: "Tórshavn", population: "53K" },
    { value: "Groenland", label: "Groenland", flag: "🇬🇱", capital: "Nuuk", population: "56K" },
  ],
  "Amérique": [
    { value: "États-Unis", label: "États-Unis", flag: "🇺🇸", capital: "Washington D.C.", population: "331M" },
    { value: "Canada", label: "Canada", flag: "🇨🇦", capital: "Ottawa", population: "38M" },
    { value: "Russie", label: "Russie", flag: "🇷🇺", capital: "Moscou", population: "146M" },
    { value: "Pérou", label: "Pérou", flag: "🇵🇪", capital: "Lima", population: "33M" },
    { value: "Mexique", label: "Mexique", flag: "🇲🇽", capital: "Mexico", population: "128M" },
    { value: "Cuba", label: "Cuba", flag: "🇨🇺", capital: "La Havane", population: "11M" },
    { value: "Argentine", label: "Argentine", flag: "🇦🇷", capital: "Buenos Aires", population: "45M" },
    { value: "Brésil", label: "Brésil", flag: "🇧🇷", capital: "Brasília", population: "215M" },
    { value: "Chili", label: "Chili", flag: "🇨🇱", capital: "Santiago", population: "19M" },
    { value: "Colombie", label: "Colombie", flag: "🇨🇴", capital: "Bogotá", population: "51M" },
    { value: "Venezuela", label: "Venezuela", flag: "🇻🇪", capital: "Caracas", population: "28M" },
    { value: "Îles Malouines", label: "Îles Malouines", flag: "🇫🇰", capital: "Stanley", population: "3.5K" },
    { value: "Belize", label: "Belize", flag: "🇧🇿", capital: "Belmopan", population: "398K" },
    { value: "Guatemala", label: "Guatemala", flag: "🇬🇹", capital: "Guatemala", population: "17M" },
    { value: "Salvador", label: "Salvador", flag: "🇸🇻", capital: "San Salvador", population: "6.5M" },
    { value: "Honduras", label: "Honduras", flag: "🇭🇳", capital: "Tegucigalpa", population: "10M" },
    { value: "Nicaragua", label: "Nicaragua", flag: "🇳🇮", capital: "Managua", population: "6.6M" },
    { value: "Costa Rica", label: "Costa Rica", flag: "🇨🇷", capital: "San José", population: "5.1M" },
    { value: "Panama", label: "Panama", flag: "🇵🇦", capital: "Panama", population: "4.3M" },
    { value: "Haïti", label: "Haïti", flag: "🇭🇹", capital: "Port-au-Prince", population: "11M" },
    { value: "Guadeloupe", label: "Guadeloupe", flag: "🇬🇵", capital: "Basse-Terre", population: "400K" },
    { value: "Bolivie", label: "Bolivie", flag: "🇧🇴", capital: "Sucre", population: "12M" },
    { value: "Guyana", label: "Guyana", flag: "🇬🇾", capital: "Georgetown", population: "787K" },
    { value: "Équateur", label: "Équateur", flag: "🇪🇨", capital: "Quito", population: "18M" },
    { value: "Guyane française", label: "Guyane française", flag: "🇬🇫", capital: "Cayenne", population: "295K" },
    { value: "Paraguay", label: "Paraguay", flag: "🇵🇾", capital: "Asunción", population: "7.1M" },
    { value: "Suriname", label: "Suriname", flag: "🇸🇷", capital: "Paramaribo", population: "587K" },
    { value: "Uruguay", label: "Uruguay", flag: "🇺🇾", capital: "Montevideo", population: "3.5M" },
    { value: "Curaçao", label: "Curaçao", flag: "🇨🇼", capital: "Willemstad", population: "164K" },
  ],
  "Asie": [
    { value: "Malaisie", label: "Malaisie", flag: "🇲🇾", capital: "Kuala Lumpur", population: "33M" },
    { value: "Indonésie", label: "Indonésie", flag: "🇮🇩", capital: "Jakarta", population: "274M" },
    { value: "Philippines", label: "Philippines", flag: "🇵🇭", capital: "Manille", population: "110M" },
    { value: "Singapour", label: "Singapour", flag: "🇸🇬", capital: "Singapour", population: "5.9M" },
    { value: "Thaïlande", label: "Thaïlande", flag: "🇹🇭", capital: "Bangkok", population: "70M" },
    { value: "Japon", label: "Japon", flag: "🇯🇵", capital: "Tokyo", population: "125M" },
    { value: "Corée du Sud", label: "Corée du Sud", flag: "🇰🇷", capital: "Séoul", population: "52M" },
    { value: "Viêt Nam", label: "Viêt Nam", flag: "🇻🇳", capital: "Hanoï", population: "98M" },
    { value: "Chine", label: "Chine", flag: "🇨🇳", capital: "Pékin", population: "1.4B" },
    { value: "Turquie", label: "Turquie", flag: "🇹🇷", capital: "Ankara", population: "84M" },
    { value: "Inde", label: "Inde", flag: "🇮🇳", capital: "New Delhi", population: "1.4B" },
    { value: "Pakistan", label: "Pakistan", flag: "🇵🇰", capital: "Islamabad", population: "225M" },
    { value: "Afghanistan", label: "Afghanistan", flag: "🇦🇫", capital: "Kaboul", population: "39M" },
    { value: "Sri Lanka", label: "Sri Lanka", flag: "🇱🇰", capital: "Colombo", population: "22M" },
    { value: "Myanmar", label: "Myanmar", flag: "🇲🇲", capital: "Naypyidaw", population: "54M" },
    { value: "Iran", label: "Iran", flag: "🇮🇷", capital: "Téhéran", population: "85M" },
    { value: "Corée du Nord", label: "Corée du Nord", flag: "🇰🇵", capital: "Pyongyang", population: "26M" },
    { value: "Hong Kong", label: "Hong Kong", flag: "🇭🇰", capital: "Hong Kong", population: "7.5M" },
    { value: "Macao", label: "Macao", flag: "🇲🇴", capital: "Macao", population: "683K" },
    { value: "Cambodge", label: "Cambodge", flag: "🇰🇭", capital: "Phnom Penh", population: "17M" },
    { value: "Laos", label: "Laos", flag: "🇱🇦", capital: "Vientiane", population: "7.3M" },
    { value: "Bangladesh", label: "Bangladesh", flag: "🇧🇩", capital: "Dhaka", population: "166M" },
    { value: "Taïwan", label: "Taïwan", flag: "🇹🇼", capital: "Taipei", population: "23M" },
    { value: "Maldives", label: "Maldives", flag: "🇲🇻", capital: "Malé", population: "541K" },
    { value: "Liban", label: "Liban", flag: "🇱🇧", capital: "Beyrouth", population: "6.8M" },
    { value: "Jordanie", label: "Jordanie", flag: "🇯🇴", capital: "Amman", population: "10M" },
    { value: "Syrie", label: "Syrie", flag: "🇸🇾", capital: "Damas", population: "18M" },
    { value: "Irak", label: "Irak", flag: "🇮🇶", capital: "Bagdad", population: "41M" },
    { value: "Koweït", label: "Koweït", flag: "🇰🇼", capital: "Koweït", population: "4.3M" },
    { value: "Arabie saoudite", label: "Arabie saoudite", flag: "🇸🇦", capital: "Riyad", population: "35M" },
    { value: "Yémen", label: "Yémen", flag: "🇾🇪", capital: "Sanaa", population: "30M" },
    { value: "Oman", label: "Oman", flag: "🇴🇲", capital: "Mascate", population: "5.1M" },
    { value: "Palestine", label: "Palestine", flag: "🇵🇸", capital: "Ramallah", population: "5.1M" },
    { value: "Émirats arabes unis", label: "Émirats arabes unis", flag: "🇦🇪", capital: "Abou Dabi", population: "10M" },
    { value: "Israël", label: "Israël", flag: "🇮🇱", capital: "Jérusalem", population: "9.4M" },
    { value: "Bahreïn", label: "Bahreïn", flag: "🇧🇭", capital: "Manama", population: "1.7M" },
    { value: "Qatar", label: "Qatar", flag: "🇶🇦", capital: "Doha", population: "2.9M" },
    { value: "Bhoutan", label: "Bhoutan", flag: "🇧🇹", capital: "Thimphou", population: "772K" },
    { value: "Mongolie", label: "Mongolie", flag: "🇲🇳", capital: "Oulan-Bator", population: "3.3M" },
    { value: "Népal", label: "Népal", flag: "🇳🇵", capital: "Katmandou", population: "30M" },
    { value: "Tadjikistan", label: "Tadjikistan", flag: "🇹🇯", capital: "Douchanbé", population: "9.5M" },
    { value: "Turkménistan", label: "Turkménistan", flag: "🇹🇲", capital: "Achgabat", population: "6M" },
    { value: "Azerbaïdjan", label: "Azerbaïdjan", flag: "🇦🇿", capital: "Bakou", population: "10M" },
    { value: "Géorgie", label: "Géorgie", flag: "🇬🇪", capital: "Tbilissi", population: "3.7M" },
    { value: "Kirghizistan", label: "Kirghizistan", flag: "🇰🇬", capital: "Bichkek", population: "6.6M" },
    { value: "Ouzbékistan", label: "Ouzbékistan", flag: "🇺🇿", capital: "Tachkent", population: "34M" },
  ],
  "Océanie": [
    { value: "Australie", label: "Australie", flag: "🇦🇺", capital: "Canberra", population: "26M" },
    { value: "Nouvelle-Zélande", label: "Nouvelle-Zélande", flag: "🇳🇿", capital: "Wellington", population: "5.1M" },
    { value: "Timor oriental", label: "Timor oriental", flag: "🇹🇱", capital: "Dili", population: "1.3M" },
    { value: "Île Norfolk", label: "Île Norfolk", flag: "🇳🇫", capital: "Kingston", population: "2.2K" },
    { value: "Brunei", label: "Brunei", flag: "🇧🇳", capital: "Bandar Seri Begawan", population: "441K" },
    { value: "Nauru", label: "Nauru", flag: "🇳🇷", capital: "Yaren", population: "11K" },
    { value: "Papouasie-Nouvelle-Guinée", label: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬", capital: "Port Moresby", population: "9M" },
    { value: "Tonga", label: "Tonga", flag: "🇹🇴", capital: "Nuku'alofa", population: "106K" },
    { value: "Îles Salomon", label: "Îles Salomon", flag: "🇸🇧", capital: "Honiara", population: "687K" },
    { value: "Vanuatu", label: "Vanuatu", flag: "🇻🇺", capital: "Port-Vila", population: "320K" },
    { value: "Fidji", label: "Fidji", flag: "🇫🇯", capital: "Suva", population: "896K" },
    { value: "Palaos", label: "Palaos", flag: "🇵🇼", capital: "Ngerulmud", population: "18K" },
    { value: "Wallis-et-Futuna", label: "Wallis-et-Futuna", flag: "🇼🇫", capital: "Mata-Utu", population: "11K" },
    { value: "Îles Cook", label: "Îles Cook", flag: "🇨🇰", capital: "Avarua", population: "17K" },
    { value: "Niue", label: "Niue", flag: "🇳🇺", capital: "Alofi", population: "1.6K" },
    { value: "Samoa", label: "Samoa", flag: "🇼🇸", capital: "Apia", population: "199K" },
    { value: "Kiribati", label: "Kiribati", flag: "🇰🇮", capital: "Tarawa", population: "120K" },
    { value: "Nouvelle-Calédonie", label: "Nouvelle-Calédonie", flag: "🇳🇨", capital: "Nouméa", population: "285K" },
    { value: "Tuvalu", label: "Tuvalu", flag: "🇹🇻", capital: "Funafuti", population: "12K" },
    { value: "Polynésie française", label: "Polynésie française", flag: "🇵🇫", capital: "Papeete", population: "281K" },
    { value: "Tokelau", label: "Tokelau", flag: "🇹🇰", capital: "Nukunonu", population: "1.4K" },
    { value: "Micronésie", label: "Micronésie", flag: "🇫🇲", capital: "Palikir", population: "115K" },
    { value: "Îles Marshall", label: "Îles Marshall", flag: "🇲🇭", capital: "Majuro", population: "59K" },
  ]
}

/** Re-export: complete list of country codes (indicatif + label + flag) for code selector in clients/prospects filters. */
export { COUNTRY_CODES_FOR_FILTER } from "./country-indicative-select"

export function CountryList({ value, onValueChange, defaultValue = "RD Congo", className = "", placeholder = "Sélectionner un pays" }: CountryListProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Filtrer les pays par recherche
  const filteredRegions = useMemo(() => {
    if (!search.trim()) {
      return countryRegions
    }

    const searchLower = search.toLowerCase()
    const filtered: Record<string, Country[]> = {}

    Object.entries(countryRegions).forEach(([region, countries]) => {
      const filteredCountries = countries.filter(country =>
        country.label.toLowerCase().includes(searchLower) ||
        country.value.toLowerCase().includes(searchLower) ||
        country.flag.includes(search) ||
        (country.capital && country.capital.toLowerCase().includes(searchLower))
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
      <SelectTrigger className={`w-[300px] ${className}`}>
        <SelectValue>
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.label}</span>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      
      <SelectContent className="w-[400px] max-h-[500px]">
        {/* Barre de recherche */}
        <div className="p-3 border-b">
          <div className="relative">
            <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="🔍 Rechercher un pays, une capitale ou une région..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icons.x className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Liste des pays par région */}
        <div className="max-h-[400px] overflow-y-auto">
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
                  🌍 {region} ({countries.length})
                </div>
                {countries.map((country) => (
                  <SelectItem
                    key={country.value}
                    value={country.value}
                    className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{country.label}</div>
                        <div className="flex items-center gap-4 mt-1">
                          {country.capital && (
                            <span className="text-xs text-gray-500">
                              🏛️ {country.capital}
                            </span>
                          )}
                          {country.population && (
                            <span className="text-xs text-gray-500">
                              👥 {country.population}
                            </span>
                          )}
                        </div>
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
          <div className="p-2 text-xs text-gray-500 border-t bg-gray-50">
            📊 {Object.values(filteredRegions).flat().length} pays trouvés pour "{search}"
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
