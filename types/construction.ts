// Construction Client
export interface ConstructionClient {
  _id: string
  code: string
  nom: string
  postnom?: string
  prenom: string
  sexe?: "M" | "F" | "Monsieur/Madame"
  dateNaissance?: Date
  pays?: string
  ville?: string
  commune?: string
  quartier?: string
  adresse?: string
  email?: string
  indicatif: string
  telephone: string
  indicatif2?: string
  telephone2?: string
  email2?: string
  profession?: string
  entreprise?: string
  typeClient: "particulier" | "entreprise" | "gouvernement"
  budgetEstime?: number
  projets?: string[]
  messages?: Message[]
  addBy?: User
  statut: "active" | "supprimer"
  createdAt: string
  updatedAt: string
}

// Construction Prospect
export interface ConstructionProspect {
  _id: string
  nom: string
  postnom?: string
  prenom: string
  sexe?: "M" | "F" | "Monsieur/Madame"
  age?: number
  profession?: string
  entreprise?: string
  typeProjet?: "residentiel" | "commercial" | "infrastructure" | "renovation" | "autre"
  budgetEstime?: number
  delaiSouhaite?: string
  localisation?: string
  email?: string
  indicatif: string
  telephone: string
  indicatif2?: string
  telephone2?: string
  email2?: string
  adresse?: string
  commentaire?: string
  statutProspect: "nouveau" | "contacte" | "devis_envoye" | "negocie" | "converti" | "perdu"
  commercialAttritre?: User
  messages?: Message[]
  files?: string[]
  addBy?: User
  statut: "active" | "supprimer"
  createdAt: string
  updatedAt: string
}

// Construction Project
export interface ConstructionProject {
  _id: string
  code: string
  nom: string
  description?: string
  type: "residentiel" | "commercial" | "infrastructure" | "renovation" | "autre"
  clientId: ConstructionClient | string
  localisation?: {
    pays?: string
    ville?: string
    commune?: string
    quartier?: string
    adresse?: string
  }
  budget: number
  coutActuel: number
  dateDebut: Date | string
  dateFin: Date | string
  dateFinReelle?: Date | string
  statut: "planification" | "en_cours" | "en_pause" | "termine" | "annule"
  pourcentageAvancement: number
  phases?: ProjectPhase[]
  materiaux?: Material[]
  equipe?: TeamMember[]
  documents?: ProjectDocument[]
  notes?: string
  addBy?: User
  statut_record: "active" | "supprimer"
  varianceBudget?: number
  isOverBudget?: boolean
  createdAt: string
  updatedAt: string
}

// Project Phase
export interface ProjectPhase {
  _id?: string
  nom: string
  description?: string
  dateDebut?: Date | string
  dateFin?: Date | string
  statut: "en_attente" | "en_cours" | "termine"
  pourcentageAvancement: number
}

// Material
export interface Material {
  _id?: string
  nom: string
  quantite: number
  unite?: string
  prixUnitaire?: number
  fournisseur?: string
  dateAchat?: Date | string
}

// Team Member
export interface TeamMember {
  _id?: string
  nom: string
  role?: string
  contact?: string
  tarifJournalier?: number
}

// Project Document
export interface ProjectDocument {
  _id?: string
  nom?: string
  type?: string
  url?: string
  dateUpload?: Date | string
}

// Construction Contract
export interface ConstructionContract {
  _id: string
  code: string
  clientId: ConstructionClient | string
  clientSource?: "construction" | "qavahland" // Source of the client
  projectId: ConstructionProject | string
  typeContrat: "forfaitaire" | "regie" | "mixte"
  montantTotal: number
  acompte: number
  echelons: number
  dateContrat: Date | string
  dateDebut: Date | string
  dateFin: Date | string
  description?: string
  termes?: string
  garantie?: {
    duree?: number
    description?: string
  }
  penalites?: {
    retard?: number
    description?: string
  }
  contrat?: {
    path?: string
    dateUpload?: Date
    uploadedBy?: string
  }
  planEchelon?: {
    path?: string
    dateUpload?: Date
    uploadedBy?: string
  }
  statut: "en_attente" | "en_cours" | "termine" | "resilie"
  addBy?: User
  statut_record: "active" | "supprimer"
  paymentInfo?: {
    remainingTotal: number
    totalPaid: number
    contractTotal: number
  }
  createdAt: string
  updatedAt: string
}

// Construction Payment
export interface ConstructionPayment {
  _id: string
  code: string
  contratId: ConstructionContract | string
  projectId: ConstructionProject | string
  clientId: ConstructionClient | string
  montant: number
  montantRestant?: number
  typePaiement: "acompte" | "echelon" | "solde" | "materiel" | "main_doeuvre" | "autre"
  methodePaiement: "espece" | "virement" | "cheque" | "mobile_money" | "carte"
  date: Date | string
  dateEcheance?: Date | string
  numeroEchelon?: number
  reference?: string
  description?: string
  statut: "en_attente" | "paye" | "en_retard" | "annule"
  recu?: {
    path?: string
    dateUpload?: Date
  }
  addBy?: User
  statut_record: "active" | "supprimer"
  createdAt: string
  updatedAt: string
}

// Construction Reminder
export interface ConstructionReminder {
  _id: string
  titre: string
  description?: string
  type: "paiement" | "reunion" | "livraison" | "inspection" | "autre"
  dateRappel: Date | string
  heureRappel?: string
  projectId?: ConstructionProject | string
  contratId?: ConstructionContract | string
  clientId?: ConstructionClient | string
  assigneA?: User
  statut: "en_attente" | "envoye" | "complete" | "annule"
  envoyerEmail: boolean
  envoyerSMS: boolean
  envoyerWhatsapp: boolean
  addBy?: User
  createdAt: string
  updatedAt: string
}

// Dashboard Statistics
export interface ConstructionDashboardStats {
  totalCounts: {
    projects: number
    clients: number
    prospects: number
    contracts: number
  }
  projectsByStatus: Array<{ _id: string; count: number }>
  contractsByStatus: Array<{ _id: string; count: number }>
  projectsByType: Array<{ _id: string; count: number }>
  financial: {
    totalContractValue: number
    totalAdvance: number
    totalPaid: number
    totalBudget: number
    totalActualCost: number
  }
  recentProjects: ConstructionProject[]
  recentContracts: ConstructionContract[]
}

// Comptabilite Record
export interface ComptabiliteRecord {
  _id: string
  code: string
  client: string
  clientCode: string
  project: string
  projectCode: string
  montantTotal: number
  totalPaye: number
  totalRestant: number
  acompte: number
  echelons: number
  statut: string
  dateContrat: Date | string
}

// Financial Summary
export interface FinancialSummary {
  contracts: {
    totalValue: number
    totalAdvance: number
    count: number
  }
  payments: {
    totalPaid: number
    count: number
    byMethod: Array<{
      _id: string
      total: number
      count: number
    }>
  }
  pending: {
    totalPending: number
    count: number
  }
  projects: {
    totalBudget: number
    totalActualCost: number
    variance: number
  }
}

// Message
export interface Message {
  _id?: string
  message: string
  date: Date | string
  from: "client" | "prospect" | "me"
  files?: string[]
  addBy?: User
}

// User (simplified)
export interface User {
  _id: string
  nom: string
  prenom: string
  email: string
  role?: string
  indicatif?: string
  telephone?: string
}

// QavahLand Client (for use in Construction)
export interface QavahLandClient {
  _id: string
  code: string
  nom: string
  postnom?: string
  prenom: string
  sexe?: "M" | "F" | "Monsieur/Madame"
  indicatif: string
  telephone: string
  email?: string
  adresse?: string
  ville?: string
  commune?: string
  quartier?: string
  source: "qavahland" // Identifier
}

// Form Data Types
export interface NewConstructionClientData {
  nom: string
  postnom?: string
  prenom: string
  sexe?: "M" | "F" | "Monsieur/Madame"
  indicatif: string
  telephone: string
  email?: string
  adresse?: string
  typeClient: "particulier" | "entreprise" | "gouvernement"
  budgetEstime?: number
  profession?: string
  entreprise?: string
}

export interface NewConstructionProspectData {
  nom: string
  postnom?: string
  prenom: string
  sexe?: "M" | "F" | "Monsieur/Madame"
  indicatif: string
  telephone: string
  email?: string
  typeProjet?: string
  budgetEstime?: number
  commentaire?: string
}

export interface NewConstructionContractData {
  clientType: "nouveau" | "existant" | "qavahland" // Added qavahland option
  clientData?: NewConstructionClientData
  clientId?: string
  projectData: {
    nom: string
    description?: string
    type: string
    budget: number
    dateDebut: Date | string
    dateFin: Date | string
    localisation?: {
      ville?: string
      commune?: string
      quartier?: string
    }
  }
  montantTotal: number
  acompte: number
  echelons: number
  dateContrat: Date | string
  dateDebut: Date | string
  dateFin: Date | string
  typeContrat: "forfaitaire" | "regie" | "mixte"
  description?: string
}

export interface NewConstructionPaymentData {
  contratId: string
  projectId: string
  clientId: string
  montant: number
  typePaiement: string
  methodePaiement: string
  date: Date | string
  dateEcheance?: Date | string
  numeroEchelon?: number
  reference?: string
  description?: string
  statut: string
}
