// Liste de 100 villes principales de la République Démocratique du Congo
export const RDC_CITIES = [
  "Aba", "Aru", "Bafwasende", "Bambesa", "Bandundu", "Banalia", "Baraka", "Basankusu", "Basoko", "Beni",
  "Boende", "Bogoro", "Boma", "Bosobolo", "Bumba", "Bukavu", "Bulungu", "Bunia", "Butembo", "Dekese",
  "Dibaya", "Dilolo", "Djugu", "Dungu", "Faradje", "Fizi", "Fungurume", "Gandajika", "Gbadolite", "Gemena",
  "Goma", "Gungu", "Idiofa", "Idjwi", "Inongo", "Irumu", "Isiro", "Kabalo", "Kabinda", "Kabare",
  "Kailo", "Kakontwe", "Kalemie", "Kambove", "Kambare", "Kamituga", "Kamina", "Kananga", "Kapanga", "Karisimbi",
  "Kasangulu", "Kasongo", "Kasumbalesa", "Kenge", "Kibombo", "Kikongo", "Kikwit", "Kimpese", "Kindu", "Kinshasa",
  "Kipushi", "Kiri", "Kisangani", "Kutu", "Kalehe", "Likasi", "Lisala", "Lubao", "Lubudi", "Lubumbashi",
  "Luebo", "Lukula", "Lubero", "Lualaba", "Lemba", "Mahagi", "Mai-Ndombe", "Mambasa", "Manono", "Masina",
  "Masisi", "Masi-Manimba", "Matadi", "Mbandaka", "Mbuji-Mayi", "Mobayi-Mbongo", "Moanda", "Mongbwalu", "Mont-Ngafula", "Mutshatsha",
  "Mwene-Ditu", "Mwenga", "Ndjili", "Ngaliema", "Niangara", "Nyarambe", "Nyiragongo", "Opala", "Oshwe", "Panda",
  "Pangi", "Punia", "Rungu", "Rutshuru", "Sandoa", "Selembao", "Seke-Banza", "Shabunda", "Tshikapa", "Tshuapa",
  "Tshela", "Ubundu", "Uvira", "Walikale", "Wamba", "Watsa", "Yahuma", "Yakoma", "Yaleko", "Zongo"
]

// Fonction pour obtenir les villes triées par ordre alphabétique
export const getSortedCities = () => {
  return [...new Set(RDC_CITIES)].sort()
}
