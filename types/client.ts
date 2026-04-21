export interface Client {
  _id: string
  code: string
  nom: string
  postnom?: string
  prenom: string
  sexe?: string
  indicatif: string
  telephone: string
  email: string
  adresse: string | null
  statut: string
}

/** Note / commentaire sur un prospect (aligné avec le schéma Mongoose) */
export interface ProspectNote {
  _id: string
  date: string
  note: string
  type?: "note" | "commentaire"
  addBy?: {
    _id: string
    nom?: string
    prenom?: string
    email?: string
  }
  editedBy?: {
    _id: string
    nom?: string
    prenom?: string
  } | null
  editedAt?: string
  history?: Array<{
    note: string
    type?: "note" | "commentaire"
    editedBy?: { _id: string; nom?: string; prenom?: string }
    editedAt?: string
  }>
}

export interface Prospect {
  _id: string
  nom: string
  postnom?: string
  nomComplet?: string
  prenom: string
  age?: number
  profession?: string
  situationMatrimoniale?: string
  villeSouhaitee?: string
  villesSouhaitees?: string[]
  dimensionSouhaitee?: string
  commentaire?: string
  sexe?: string
  indicatif: string
  telephone: string
  email?: string
  email2?: string
  indicatif2?: string
  telephone2?: string
  created_at: string
  updated_at: string
  adresse?: string
  /** Parrain = client Qavah (référence peuplée) */
  parrain?: {
    _id: string
    nom?: string
    prenom?: string
    email?: string
    indicatif?: string
    telephone?: string
    code?: string
  } | null
  /** Parrain non client Qavah (saisie manuelle) */
  parrainDetails?: {
    lastName?: string
    postName?: string
    firstName?: string
    indicationCode?: string
    telephoneNumber?: string
    email?: string
    clientCode?: string
  } | null
  categorie?: "Normal" | "1000 jeunes" | "Autre"
  dateNaissance?: string | null
  statutProspect: string
  commercialAttritre: {
    _id: string
    nom: string
    prenom: string
    email: string
  }
  status: string
  createdAt: string
  updatedAt: string
  addBy?: {
    _id: string
    nom: string
    prenom: string
  }
  dateRappel?: string
  files: File[]
  messages: [
    {
      _id: string
      message: string
      date: string
      from: string
      files: File[]
      addBy: {
        _id: string
        nom: string
        prenom: string
        email: string
        indicatif: string
      }
    }
  ]
  /** Notes / commentaires (retournés par l’API détail prospect) */
  notes?: ProspectNote[]
}

export interface NewProspectData {
  nom: string
  postnom?: string
  prenom: string
  sexe?: string
  indicatif: string
  telephone: string
  email?: string
  commentaire?: string
  /** ID du commercial attitré */
  commercialAttritre?: string
}

export interface ComptabiliteRow {
  _id: string
  client: string
  terrain: string
  contrat: string
  totalPaye: number
  totalRestant: number
  totalTerrain: number
  nbMois: number
  echelons: number
  statut: "En cours" | "Terminé" | "En retard"
}

