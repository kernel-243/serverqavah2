"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import axios from "axios"
import { Prospect } from "@/types/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Heart, MessageSquare, FileText, Calendar, Clock, Send, Upload, Download, X, AlertTriangle, StickyNote, Plus, Edit, Trash2, History, ChevronDown, ChevronUp, UserCheck, Loader2 } from "lucide-react"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

export default function ProspectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isEditNoteDialogOpen, setIsEditNoteDialogOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [noteText, setNoteText] = useState("")
  const [noteType, setNoteType] = useState<"note" | "commentaire">("note")
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [isNotAssigned, setIsNotAssigned] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [commercials, setCommercials] = useState<any[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedCommercial, setSelectedCommercial] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedCCUsers, setSelectedCCUsers] = useState<string[]>([])
  const [manualCCEmails, setManualCCEmails] = useState<string>("")
  const [messageSubject, setMessageSubject] = useState<string>("")
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProspectDetails = async () => {
      const token = localStorage.getItem("authToken")
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch prospect first — this is the critical request
      let prospectData: Prospect | null = null
      try {
        const prospectResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}`, { headers })
        prospectData = prospectResponse.data
        setProspect(prospectData)
        if (prospectData?.notes) setNotes(prospectData.notes)
      } catch (error) {
        console.error("Error fetching prospect details:", error)
        setErrorMessage("Une erreur s'est produite lors de la récupération des détails du prospect.")
        setIsLoading(false)
        return
      }

      // Fetch current user and commercials independently — non-blocking
      let userId = ""
      let userRole = ""
      try {
        const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, { headers })
        if (userResponse.data?._id) {
          userId = userResponse.data._id
          userRole = userResponse.data.role || ""
          setCurrentUserId(userId)
          setCurrentUserRole(userRole)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }

      // Check if agent is not the assigned commercial
      if (userRole && userRole.toLowerCase() !== "admin" && prospectData) {
        const assignedId = prospectData.commercialAttritre?._id || (prospectData.commercialAttritre as any)
        const notAssigned = !assignedId || String(assignedId) !== String(userId)
        setIsNotAssigned(notAssigned)
      }

      try {
        const commercialsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/new-data`, { headers })
        if (commercialsResponse.data) {
          if (commercialsResponse.data.users && Array.isArray(commercialsResponse.data.users)) {
            setCommercials(commercialsResponse.data.users)
            setUsers(commercialsResponse.data.users)
          } else if (Array.isArray(commercialsResponse.data)) {
            setCommercials(commercialsResponse.data)
            setUsers(commercialsResponse.data)
          }
        }
      } catch (error) {
        console.error("Error fetching commercials:", error)
      }

      setIsLoading(false)
    }

    fetchProspectDetails()
  }, [id])

  const fetchNotes = async () => {
    try {
      setIsLoadingNotes(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.data.notes) {
        setNotes(response.data.notes)
      } else {
        setNotes([])
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les notes",
        variant: "destructive",
      })
    } finally {
      setIsLoadingNotes(false)
    }
  }

  const handleCreateNote = async () => {
    if (!noteText.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une note",
        variant: "destructive",
      })
      return
    }

    setIsCreatingNote(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Extract mentions from note text
      const mentions = extractMentions(noteText)
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}/note`,
        {
          note: noteText,
          type: noteType,
          mentions: mentions, // Send array of user IDs mentioned
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      toast({
        title: "Succès",
        description: "Note créée avec succès",
      })
      setNoteText("")
      setNoteType("note")
      setShowMentionList(false)
      setIsNoteDialogOpen(false)
      fetchNotes()
    } catch (error) {
      console.error("Error creating note:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer la note",
        variant: "destructive",
      })
    } finally {
      setIsCreatingNote(false)
    }
  }

  const handleEditNote = async () => {
    if (!noteText.trim() || !selectedNote) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une note",
        variant: "destructive",
      })
      return
    }

    setIsEditingNote(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Extract mentions from note text
      const mentions = extractMentions(noteText)
      
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}/note/${selectedNote._id}`,
        {
          note: noteText,
          type: noteType,
          mentions: mentions, // Send array of user IDs mentioned
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      toast({
        title: "Succès",
        description: "Note modifiée avec succès",
      })
      setNoteText("")
      setNoteType("note")
      setSelectedNote(null)
      setIsEditNoteDialogOpen(false)
      fetchNotes()
    } catch (error) {
      console.error("Error updating note:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier la note",
        variant: "destructive",
      })
    } finally {
      setIsEditingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}/note/${noteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast({
        title: "Succès",
        description: "Note supprimée avec succès",
      })
      fetchNotes()
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la note",
        variant: "destructive",
      })
    }
  }

  const openEditNoteDialog = (note: any) => {
    setSelectedNote(note)
    setNoteText(note.note)
    setNoteType(note.type || "note")
    setIsEditNoteDialogOpen(true)
  }

  // Extract mentions from text (format: @email) and convert to user IDs
  const extractMentions = (text: string): string[] => {
    // Match @ followed by email pattern
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const matches = text.match(mentionRegex)
    if (!matches) return []
    
    // Convert emails to user IDs
    return matches
      .map(m => m.substring(1)) // Remove @
      .map(email => {
        const user = users.find(u => u.email === email)
        return user?._id
      })
      .filter(id => id !== undefined) as string[]
  }

  // Format note text with highlighted mentions
  const formatNoteWithMentions = (text: string) => {
    // Match @ followed by email pattern
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    const matches = Array.from(text.matchAll(mentionRegex))

    matches.forEach((match, index) => {
      // Add text before mention
      if (match.index !== undefined && match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      // Add highlighted mention
      const email = match[1]
      
      parts.push(
        <span key={`mention-${index}-${match.index}`} className="bg-blue-100 text-blue-700 font-medium px-1 rounded">
          @{email}
        </span>
      )
      
      if (match.index !== undefined) {
        lastIndex = match.index + match[0].length
      }
    })
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }

  // Handle textarea input for mentions
  const handleNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNoteText(value)
    
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's a space or newline after @ (meaning mention is complete)
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setShowMentionList(false)
        return
      }
      
      const query = textAfterAt.toLowerCase()
      setMentionQuery(query)
      
      // Calculate position for mention list
      if (textareaRef.current) {
        const textarea = textareaRef.current
        const textareaRect = textarea.getBoundingClientRect()
        
        // Get text before cursor to calculate line and column
        const textBeforeCursorLines = textBeforeCursor.split('\n')
        const currentLine = textBeforeCursorLines.length - 1
        const currentLineText = textBeforeCursorLines[currentLine]
        
        // Get computed styles
        const computedStyle = window.getComputedStyle(textarea)
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20
        const paddingTop = parseFloat(computedStyle.paddingTop) || 8
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 12
        const fontSize = parseFloat(computedStyle.fontSize) || 14
        
        // Create a temporary span to measure text width more accurately
        const measureSpan = document.createElement('span')
        measureSpan.style.position = 'absolute'
        measureSpan.style.visibility = 'hidden'
        measureSpan.style.whiteSpace = 'pre'
        measureSpan.style.font = computedStyle.font
        measureSpan.style.fontSize = computedStyle.fontSize
        measureSpan.style.fontFamily = computedStyle.fontFamily
        measureSpan.style.fontWeight = computedStyle.fontWeight
        measureSpan.style.letterSpacing = computedStyle.letterSpacing
        measureSpan.textContent = currentLineText
        document.body.appendChild(measureSpan)
        
        const textWidth = measureSpan.offsetWidth
        document.body.removeChild(measureSpan)
        
        // Calculate position relative to viewport (for fixed positioning)
        // Account for scroll position in textarea
        const topOffset = paddingTop + (currentLine * lineHeight) + lineHeight
        const leftOffset = paddingLeft + textWidth
        
        // Use getBoundingClientRect for viewport-relative position
        // Subtract scrollTop to get correct position when textarea is scrolled
        const viewportTop = textareaRect.top + topOffset - textarea.scrollTop
        const viewportLeft = textareaRect.left + leftOffset
        
        // Ensure the mention list doesn't go off screen
        const mentionListHeight = 192 // max-h-48 = 12rem = 192px
        const mentionListWidth = 256 // w-64 = 16rem = 256px
        const windowHeight = window.innerHeight
        const windowWidth = window.innerWidth
        
        let finalTop = viewportTop
        let finalLeft = viewportLeft
        
        // Adjust if going off bottom of screen
        if (finalTop + mentionListHeight > windowHeight) {
          finalTop = viewportTop - mentionListHeight - lineHeight
        }
        
        // Adjust if going off right of screen
        if (finalLeft + mentionListWidth > windowWidth) {
          finalLeft = windowWidth - mentionListWidth - 10
        }
        
        // Ensure it doesn't go off top or left
        if (finalTop < 0) finalTop = 10
        if (finalLeft < 0) finalLeft = 10
        
        setMentionPosition({
          top: finalTop,
          left: finalLeft
        })
      }
      
      setShowMentionList(true)
      setSelectedMentionIndex(0)
    } else {
      setShowMentionList(false)
    }
  }

  // Filter users based on mention query
  const filteredUsers = users.filter(user => {
    if (!mentionQuery) return true
    const fullName = `${user.nom || ''} ${user.prenom || ''}`.toLowerCase()
    const email = (user.email || '').toLowerCase()
    return fullName.includes(mentionQuery) || email.includes(mentionQuery)
  })

  // Insert mention into text (using email instead of ID)
  const insertMention = (user: any) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = noteText.substring(0, cursorPosition)
    const textAfterCursor = noteText.substring(cursorPosition)
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    if (lastAtIndex === -1) return
    
    const textBeforeAt = textBeforeCursor.substring(0, lastAtIndex)
    const userEmail = user.email || ''
    const newText = `${textBeforeAt}@${userEmail} ${textAfterCursor}`
    
    setNoteText(newText)
    setShowMentionList(false)
    setMentionQuery("")
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = lastAtIndex + userEmail.length + 2 // +2 for @ and space
        textareaRef.current.setSelectionRange(newPosition, newPosition)
        textareaRef.current.focus()
      }
    }, 0)
  }

  // Handle keyboard navigation in mention list
  const handleNoteTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[selectedMentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentionList(false)
      }
    }
  }

  const handleFileDownload = async (fileName: any) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}/download-file/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier:", error)
      toast({
        description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
        variant: "destructive",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) {
      toast({
        description: "Veuillez saisir un message ou joindre un fichier",
        variant: "destructive"
      })
      return
    }

    setIsSending(true)
    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      formData.append("message", message)
      formData.append("subject", messageSubject.trim() || "Nouveau message")
      selectedFiles.forEach((file) => formData.append("files", file))
      
      // Add CC users
      if (selectedCCUsers.length > 0) {
        formData.append("ccUsers", JSON.stringify(selectedCCUsers))
      }
      
      // Add manual CC emails
      if (manualCCEmails.trim()) {
        formData.append("ccEmails", manualCCEmails.trim())
      }

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}/send-message`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.status === 200 && prospect) {
        toast({
          title: "Succès",
          description: "Message envoyé avec succès.",
        })
        setSelectedFiles([])
        setMessage("")
        setMessageSubject("")
        setSelectedCCUsers([])
        setManualCCEmails("")
        setProspect({ ...prospect, messages: response.data.messages })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorCode = error instanceof axios.AxiosError && error.response ? error.response.status : "Une erreur est survenue. Veuillez réessayer."
      setIsErrorDialogOpen(true)
      setErrorMessage("Une erreur de code " + errorCode + " est survenue. Veuillez réessayer.")
    } finally {
      setIsSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "prospect":
        return "warning"
      case "client":
        return "success"
      case "annuler":
        return "destructive"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "prospect":
        return <Clock className="h-4 w-4" />
      case "client":
        return <Heart className="h-4 w-4" />
      case "annuler":
        return <X className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const handleAssignProspect = async () => {
    if (!selectedCommercial) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un commercial",
        variant: "destructive"
      })
      return
    }

    try {
      setIsAssigning(true)
      const token = localStorage.getItem("authToken")
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/assign`,
        {
          prospectIds: [id],
          commercialId: selectedCommercial
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast({
        title: "Succès",
        description: "Prospect affecté avec succès",
      })
      
      setIsAssignDialogOpen(false)
      setSelectedCommercial("")
      
      // Refresh prospect data
      const prospectResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setProspect(prospectResponse.data)
    } catch (error) {
      console.error("Error assigning prospect:", error)
      if (axios.isAxiosError(error)) {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Erreur lors de l'affectation",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue",
          variant: "destructive"
        })
      }
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center space-y-4">
          <Icons.spinner className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Chargement des détails du prospect...</p>
        </div>
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[80vh] gap-4">
        <div className="flex flex-col items-center space-y-4">
          <Icons.settings className="h-16 w-16 text-yellow-500" />
          <div className="text-center">
            <h2 className="text-2xl font-bold">Prospect non trouvé</h2>
            <p className="text-muted-foreground mt-2">Le prospect que vous recherchez n'existe pas ou a été supprimé.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/prospect')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/prospect')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Détails du Prospect</h1>
            <p className="text-muted-foreground">Gérez les informations et la communication avec ce prospect</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={getStatusColor(prospect.statutProspect) as any} className="flex items-center gap-1 px-3 py-1">
            {getStatusIcon(prospect.statutProspect)}
            {prospect.statutProspect}
          </Badge>
          {prospect.commercialAttritre && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-foreground">{prospect.commercialAttritre.nom} {prospect.commercialAttritre.prenom}</span>
            </span>
          )}
          {currentUserRole?.toLowerCase() === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCommercial(prospect.commercialAttritre?._id || prospect.commercialAttritre.nom || "")
                setIsAssignDialogOpen(true)
              }}
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {prospect.commercialAttritre || prospect.commercialAttritre ? "Réaffecter" : "Affecter"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/prospect/edit-prospect/${id}`)}
            className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {isNotAssigned && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Prospect non attribué à vous</p>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-0.5">
              Ce prospect est géré par{" "} 
              <span className="font-medium">
                {prospect.commercialAttritre
                  ? `${prospect.commercialAttritre.nom}${prospect.commercialAttritre.prenom ? " " + prospect.commercialAttritre.prenom : ""}`
                  : "un autre agent"}
              </span>
              . Vous pouvez consulter ses informations mais il n&apos;apparaît pas dans votre liste.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Informations Personnelles
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2" onClick={fetchNotes}>
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {prospect.nomComplet?.charAt(0) || prospect.nom?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{prospect.nomComplet}</CardTitle>
                <p className="text-muted-foreground">{prospect.profession || "Profession non spécifiée"}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{prospect.email}</p>
                    {prospect.email2 && <p className="text-sm text-muted-foreground">{prospect.email2}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{prospect.indicatif} {prospect.telephone}</p>
                    {prospect.telephone2 && (
                      <p className="text-sm text-muted-foreground">{prospect.indicatif2} {prospect.telephone2}</p>
                    )}
                  </div>
                </div>

                {/* Bloc parrainage : parrain (client Qavah) ou parrainDetails (non client Qavah) */}
                {prospect.parrain && typeof prospect.parrain === "object" && (prospect.parrain._id || prospect.parrain.nom) ? (
                  <div className="mt-4 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                    <p className="font-semibold text-blue-800">
                      Ce prospect a été parrainé par un client Qavah.
                    </p>
                    <div className="space-y-1 text-blue-900">
                      <p>
                        <span className="font-medium">Parrain :</span>{" "}
                        {[prospect.parrain.prenom, prospect.parrain.nom].filter(Boolean).join(" ") || "Non renseigné"}
                      </p>
                      {prospect.parrain.code && (
                        <p>
                          <span className="font-medium">Code client :</span> {prospect.parrain.code}
                        </p>
                      )}
                      {(prospect.parrain.indicatif || prospect.parrain.telephone) && (
                        <p>
                          <span className="font-medium">Téléphone :</span>{" "}
                          {[prospect.parrain.indicatif, prospect.parrain.telephone].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {prospect.parrain.email && (
                        <p>
                          <span className="font-medium">Email :</span> {prospect.parrain.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : prospect.parrainDetails && typeof prospect.parrainDetails === "object" ? (
                  <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-semibold text-amber-800">
                      Ce prospect a été parrainé (parrain non client Qavah).
                    </p>
                    <div className="space-y-1 text-amber-900">
                      <p>
                        <span className="font-medium">Parrain :</span>{" "}
                        {[
                          prospect.parrainDetails.firstName,
                          prospect.parrainDetails.postName,
                          prospect.parrainDetails.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Non renseigné"}
                      </p>
                      {prospect.parrainDetails.telephoneNumber && (
                        <p>
                          <span className="font-medium">Téléphone :</span>{" "}
                          {prospect.parrainDetails.indicationCode}{" "}
                          {prospect.parrainDetails.telephoneNumber}
                        </p>
                      )}
                      {prospect.parrainDetails.email && (
                        <p>
                          <span className="font-medium">Email :</span>{" "}
                          {prospect.parrainDetails.email}
                        </p>
                      )}
                      {prospect.parrainDetails.clientCode && (
                        <p>
                          <span className="font-medium">Code client :</span>{" "}
                          {prospect.parrainDetails.clientCode}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    {prospect.villesSouhaitees && prospect.villesSouhaitees.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {prospect.villesSouhaitees.map((v) => (
                          <span key={v} className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium">{prospect.villeSouhaitee || "Ville non spécifiée"}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{prospect.adresse}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Âge: {prospect.age || "Non spécifié"}</p>
                    <p className="text-sm text-muted-foreground">{prospect.situationMatrimoniale}</p>
                  </div>
                </div>
                {prospect.commercialAttritre && (
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Commercial attitré</p>
                      <p className="font-medium text-blue-600">
                        {prospect.commercialAttritre?.nom} {prospect.commercialAttritre?.prenom}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informations Détaillées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Préférences</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm shrink-0">Ville(s) souhaitée(s):</span>
                          {prospect.villesSouhaitees && prospect.villesSouhaitees.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {prospect.villesSouhaitees.map((v) => (
                                <span key={v} className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="font-medium">{prospect.villeSouhaitee || "Non spécifiée"}</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Dimension souhaitée:</span>
                          <span className="font-medium">{prospect.dimensionSouhaitee || "Non spécifiée"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informations Personnelles</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Âge:</span>
                          <span className="font-medium">{prospect.age || "Non spécifié"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Situation matrimoniale:</span>
                          <span className="font-medium">{prospect.situationMatrimoniale || "Non spécifiée"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Catégorie:</span>
                          {prospect.categorie === "1000 jeunes" ? (
                            <Badge className="text-xs bg-purple-600 text-white hover:bg-purple-700">{prospect.categorie}</Badge>
                          ) : (
                            <span className="font-medium">{prospect.categorie || "Normal"}</span>
                          )}
                        </div>
                        {prospect.commercialAttritre && (
                          <div className="flex justify-between">
                            <span className="text-sm">Commercial attitré:</span>
                            <span className="font-medium text-blue-600">
                              {prospect.commercialAttritre?.nom} {prospect.commercialAttritre?.prenom}
                            </span>
                          </div>
                        )}
                        {prospect.addBy && (
                          <div className="flex justify-between">
                            <span className="text-sm">Ajouté par:</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {prospect.addBy.nom} {prospect.addBy.prenom}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm">Enregistré le:</span>
                          <span className="font-medium">
                            {prospect.createdAt
                              ? new Date(prospect.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Commentaire</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">
                      {prospect.commentaire || "Aucun commentaire disponible."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages et Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Messages Display */}
              <div className="bg-muted/30 dark:bg-gray-900/50 rounded-lg p-4 h-96 overflow-y-auto space-y-4">
                {prospect.messages && prospect.messages.length > 0 ? (
                  prospect.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md p-4 rounded-lg shadow-sm ${
                          message.from === "me" 
                            ? "bg-blue-600 text-white dark:bg-blue-700 dark:text-white" 
                            : "bg-white border border-border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.from === "me" ? (
                            <>
                              <span className="text-xs opacity-80 dark:opacity-90">Vous</span>
                              <User className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground dark:text-gray-300">{message.addBy.nom}</span>
                              <User className="h-3 w-3 text-muted-foreground dark:text-gray-300" />
                            </>
                          )}
                        </div>
                        
                        <p className={`text-sm leading-relaxed ${
                          message.from === "me"
                            ? "text-white dark:text-white"
                            : "text-gray-900 dark:text-gray-100"
                        }`}>{message.message}</p>
                        
                        {message.files && message.files.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.files.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center space-x-2">
                                <Icons.file className="h-4 w-4" />
                                <button
                                  onClick={() => handleFileDownload(file)}
                                  className={`text-sm underline hover:no-underline ${
                                    message.from === "me"
                                      ? "text-white/90 hover:text-white dark:text-white/90 dark:hover:text-white"
                                      : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  }`}
                                >
                                  {file.name}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className={`text-xs mt-2 ${
                          message.from === "me"
                            ? "text-white/80 dark:text-white/80"
                            : "text-gray-600 dark:text-gray-400 opacity-70"
                        }`}>
                          {new Date(message.date).toLocaleString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-lg font-medium">Aucun message</p>
                      <p className="text-muted-foreground">Commencez la conversation avec ce prospect</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Fichiers à joindre:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Icons.file className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message-subject-prospect">Objet</Label>
                  <Input
                    id="message-subject-prospect"
                    type="text"
                    placeholder="Nouveau message"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange} 
                    className="hidden" 
                    id="file-input"
                    ref={fileInputRef}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Joindre
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-sm font-medium">Message</Label>
                      <AIRewriteButton
                        getValue={() => message}
                        onApply={(text) => setMessage(text)}
                        disabled={isSending}
                      />
                      <VoiceInputButton
                        getValue={() => message}
                        onUpdate={(text) => setMessage(text)}
                        onApply={(text) => setMessage(text)}
                        disabled={isSending}
                      />
                    </div>
                    <Textarea
                      placeholder="Tapez votre message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    
                    {/* CC Section */}
                    <div className="border-t pt-3 space-y-3">
                      <Label className="text-sm font-medium">Mettre en copie (CC)</Label>
                      
                      {/* User selection */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sélectionner des utilisateurs</Label>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && !selectedCCUsers.includes(value)) {
                              setSelectedCCUsers([...selectedCCUsers, value])
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un commercial/utilisateur" />
                          </SelectTrigger>
                          <SelectContent>
                            {commercials
                              .filter((c) => !selectedCCUsers.includes(c._id))
                              .map((commercial) => (
                                <SelectItem key={commercial._id} value={commercial._id}>
                                  {commercial.prenom} {commercial.nom}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedCCUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCCUsers.map((userId) => {
                              const user = commercials.find((c) => c._id === userId)
                              return (
                                <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                                  {user ? `${user.prenom} ${user.nom}` : userId}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCCUsers(selectedCCUsers.filter((id) => id !== userId))}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Manual email input */}
                      <div className="space-y-2">
                        <Label htmlFor="cc-emails-prospect" className="text-xs text-muted-foreground">
                          Ou saisir des adresses email (séparées par des virgules)
                        </Label>
                        <Input
                          id="cc-emails-prospect"
                          type="text"
                          placeholder="email1@example.com, email2@example.com"
                          value={manualCCEmails}
                          onChange={(e) => setManualCCEmails(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isSending}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    {isSending ? (
                      <>
                        <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes
              </CardTitle>
              <Button onClick={() => setIsNoteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle note
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingNotes ? (
                <div className="flex justify-center items-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <StickyNote className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-lg font-medium">Aucune note</p>
                    <p className="text-muted-foreground">Commencez à ajouter des notes pour ce prospect</p>
                  </div>
                  <Button onClick={() => setIsNoteDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle note
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <Card key={note._id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={note.type === "commentaire" ? "secondary" : "default"}>
                                {note.type === "commentaire" ? "Commentaire" : "Note"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {note.addBy?.nom} {note.addBy?.prenom}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                • {new Date(note.date).toLocaleString("fr-FR")}
                              </span>
                              {note.editedAt && (
                                <>
                                  <span className="text-sm text-muted-foreground">•</span>
                                  <span className="text-sm text-muted-foreground">
                                    Modifié le {new Date(note.editedAt).toLocaleString("fr-FR")}
                                    {note.editedBy && ` par ${note.editedBy.nom} ${note.editedBy.prenom}`}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {formatNoteWithMentions(note.note)}
                            </p>
                            {/* Historique des modifications - visible uniquement pour les admins */}
                            {currentUserRole?.toLowerCase() === 'admin' && note.history && note.history.length > 0 && (
                              <div className="mt-4">
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between">
                                      <span className="flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        Historique des modifications ({note.history.length})
                                      </span>
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                                      {note.history.map((historyItem: any, index: number) => (
                                        <div key={index} className="pb-3 border-b last:border-b-0 last:pb-0">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-muted-foreground">
                                              Version {note.history.length - index}
                                            </span>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(historyItem.editedAt).toLocaleString("fr-FR")}
                                            </span>
                                            {historyItem.editedBy && (
                                              <>
                                                <span className="text-xs text-muted-foreground">•</span>
                                                <span className="text-xs text-muted-foreground">
                                                  Modifié par {historyItem.editedBy.nom} {historyItem.editedBy.prenom}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {formatNoteWithMentions(historyItem.note)}
                                          </p>
                                          {historyItem.type && (
                                            <Badge variant="outline" className="mt-2 text-xs">
                                              {historyItem.type === "commentaire" ? "Commentaire" : "Note"}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            )}
                          </div>
                          {note.addBy?._id === currentUserId && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditNoteDialog(note)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteNote(note._id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={noteType} onValueChange={(value: "note" | "commentaire") => setNoteType(value)} disabled={isCreatingNote}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="commentaire">Commentaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-sm font-medium">Note</label>
                <AIRewriteButton
                  getValue={() => noteText}
                  onApply={(text) => setNoteText(text)}
                  disabled={isCreatingNote}
                />
                <VoiceInputButton
                  getValue={() => noteText}
                  onUpdate={(text) => setNoteText(text)}
                  onApply={(text) => setNoteText(text)}
                  disabled={isCreatingNote}
                />
              </div>
              <Textarea
                ref={textareaRef}
                value={noteText}
                onChange={handleNoteTextChange}
                onKeyDown={handleNoteTextKeyDown}
                placeholder="Saisissez votre note... Utilisez @ pour mentionner un utilisateur"
                className="min-h-[150px]"
                disabled={isCreatingNote}
              />
              {showMentionList && filteredUsers.length > 0 && (
                <div
                  ref={mentionListRef}
                  className="fixed z-[100] w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  style={{
                    top: `${mentionPosition.top}px`,
                    left: `${mentionPosition.left}px`
                  }}
                >
                  {filteredUsers.map((user, index) => (
                    <div
                      key={user._id}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                        index === selectedMentionIndex ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => insertMention(user)}
                      onMouseEnter={() => setSelectedMentionIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.nom?.charAt(0) || ''}{user.prenom?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.nom} {user.prenom}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsNoteDialogOpen(false)
                setNoteText("")
                setNoteType("note")
              }}
              disabled={isCreatingNote}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateNote} disabled={isCreatingNote}>
              {isCreatingNote && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditNoteDialogOpen} onOpenChange={setIsEditNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={noteType} onValueChange={(value: "note" | "commentaire") => setNoteType(value)} disabled={isEditingNote}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="commentaire">Commentaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-sm font-medium">Note</label>
                <AIRewriteButton
                  getValue={() => noteText}
                  onApply={(text) => setNoteText(text)}
                  disabled={isEditingNote}
                />
                <VoiceInputButton
                  getValue={() => noteText}
                  onUpdate={(text) => setNoteText(text)}
                  onApply={(text) => setNoteText(text)}
                  disabled={isEditingNote}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Tapez @ pour mentionner un utilisateur</p>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={handleNoteTextChange}
                  onKeyDown={handleNoteTextKeyDown}
                  placeholder="Saisissez votre note... (@ pour mentionner)"
                  className="min-h-[150px]"
                  disabled={isEditingNote}
                />
                {showMentionList && filteredUsers.length > 0 && (
                  <div
                    ref={mentionListRef}
                    className="fixed z-[100] w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    style={{
                      top: `${mentionPosition.top}px`,
                      left: `${mentionPosition.left}px`
                    }}
                  >
                    {filteredUsers.map((user, index) => (
                      <div
                        key={user._id}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                          index === selectedMentionIndex ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => insertMention(user)}
                        onMouseEnter={() => setSelectedMentionIndex(index)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {user.nom?.charAt(0) || ''}{user.prenom?.charAt(0) || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.nom} {user.prenom}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditNoteDialogOpen(false)
                setNoteText("")
                setNoteType("note")
                setSelectedNote(null)
              }}
              disabled={isEditingNote}
            >
              Annuler
            </Button>
            <Button onClick={handleEditNote} disabled={isEditingNote}>
              {isEditingNote && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Erreur
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{errorMessage}</p>
          <DialogFooter>
            <Button onClick={() => setIsErrorDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Prospect Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {prospect?.commercialAttritre || prospect?.commercialAttritre?.nom ? "Réaffecter le prospect" : "Affecter le prospect"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {prospect?.commercialAttritre && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  Ce prospect est actuellement affecté à : <strong>{prospect.commercialAttritre?.nom} {prospect.commercialAttritre?.prenom}</strong>
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Sélectionner un commercial <span className="text-red-500">*</span>
              </label>
              <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un commercial" />
                </SelectTrigger>
                <SelectContent>
                  {commercials.map((commercial) => (
                    <SelectItem key={commercial._id} value={commercial._id}>
                      {commercial.nom} {commercial.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false)
                setSelectedCommercial("")
              }}
              disabled={isAssigning}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssignProspect}
              disabled={!selectedCommercial || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                  Affectation...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  {prospect?.commercialAttritre || prospect?.commercialAttritre?.nom ? "Réaffecter" : "Affecter"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
