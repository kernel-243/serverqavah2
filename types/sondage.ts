export interface Sondage {
  _id: string
  code: string
  title: string
  message: string
  createdBy: {
    _id: string
    nom: string
    prenom: string
    email: string
  }
  dateCreated: string
  status: 'active' | 'inactive' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface Feedback {
  _id: string
  sondageId: {
    _id: string
    code: string
    title: string
  }
  clientId?: {
    _id: string
    code: string
    nom: string
    prenom: string
    email: string
  }
  prospectId?: {
    _id: string
    code: string
    nom: string
    prenom: string
    email: string
  }
  responses: any // Mixed type for flexible survey responses
  commentaire?: string
  date: string
  createdBy: {
    _id: string
    nom: string
    prenom: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface SondageDetail {
  sondage: Sondage
  feedbacks: Feedback[]
}

export interface SondageResponse {
  success: boolean
  data: SondageDetail
}
