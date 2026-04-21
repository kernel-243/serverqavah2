"use client"

import { useState } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import axios from "axios"
// import { authRequest } from "@/lib/authRequest"

const enfantSchema = z.object({
  nom: z.string().min(1, "Nom is required"),
  prenom: z.string().min(1, "Prénom is required"),
  sexe: z.enum(["M", "F"]),
  occupation: z.enum(["eleve", "etudiant", "employe", "travailleur independant", "autre"]),
  dateNaissance: z.string().min(1, "Date de naissance is required"),
})

const conjointSchema = z.object({
  nom: z.string().min(1, "Nom is required"),
  prenom: z.string().min(1, "Prénom is required"),
  sexe: z.enum(["M", "F"]),
  dateNaissance: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  indicatif: z.string().min(1, "Indicatif is required"),
  telephone: z.string().min(1, "Téléphone is required"),
})

const formSchema = z
  .object({
    nom: z.string().min(1, "Nom is required"),
    prenom: z.string().min(1, "Prénom is required"),
    sexe: z.enum(["M", "F"]),
    dateNaissance: z.string().optional(),
    adresse: z.string().optional(),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    indicatif: z.string().min(1, "Indicatif is required"),
    telephone: z.string().min(1, "Téléphone is required"),
    profession: z.enum(["Salarié", "Commercant", "Entrepreneur", "Travailleur Independant", "Etudiant", "Autre"]),
    salarieDetails: z
      .object({
        typeContrat: z.enum(["CDI", "CDD", "Journalier", "Autre"]),
        entreprise: z.string().min(1, "Entreprise is required"),
        reference: z.string().min(1, "Reference is required"),
      })
      .optional(),
    revenuMensuel: z.string().optional(),
    situationMatrimoniale: z.enum(["celibataire", "marié", "divorcé", "veuf", "autre"]),
    nombreEnfants: z.number().min(0),
    conjoint: z
      .object({
        nom: z.string().min(1, "Nom is required"),
        prenom: z.string().min(1, "Prénom is required"),
        sexe: z.enum(["M", "F"]),
        dateNaissance: z.string().min(1, "Date de naissance is required"),
        adresse: z.string(),
        email: z.string(),
        indicatif: z.string(),
        telephone: z.string(),
      })
      .optional(),
    enfants: z.array(enfantSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.profession === "Salarié" && !data.salarieDetails) {
        return false
      }
      if (data.situationMatrimoniale === "marié" && !data.conjoint) {
        return false
      }
      if (data.nombreEnfants > 0 && (!data.enfants || data.enfants.length !== data.nombreEnfants)) {
        return false
      }
      return true
    },
    {
      message: "Salarié details are required for salarié profession",
      path: ["salarieDetails"],
    },
  )

type FormData = z.infer<typeof formSchema>

interface NewClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded?: (client: any) => void
}

export function NewClientDialog({ open, onOpenChange, onClientAdded }: NewClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profession: "Autre",
      indicatif: "+243",
      sexe: "M",
      situationMatrimoniale: "celibataire",
      nombreEnfants: 0
    },
  })

  const {
    fields: enfantsFields,
    append: appendEnfant,
    remove: removeEnfant,
  } = useFieldArray({
    control,
    name: "enfants",
  })

  const situationMatrimoniale = watch("situationMatrimoniale")
  const nombreEnfants = watch("nombreEnfants")
  const profession = watch("profession")

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    // console.log("Client data to be submitted:", data)
    try {
      if (data.situationMatrimoniale === "marié" && !data.conjoint) {
        throw new Error("Conjoint information is required when married")
      }
      if (data.nombreEnfants > 0 && (!data.enfants || data.enfants.length !== data.nombreEnfants)) {
        throw new Error(`Information for ${data.nombreEnfants} children is required`)
      }

      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/clients`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // console.log("Client saved successfully:", response.data)
      toast({
        title: "Success",
        description: "Client has been successfully saved.",
      })
      onOpenChange(false)
      if (onClientAdded) {
        onClientAdded(response.data)
      }
    } catch (error) {
      console.error("Error saving client:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nom" className="text-right">
                  Nom*
                </Label>
                <Input id="nom" className="col-span-3" {...register("nom")} />
                {errors.nom && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.nom.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prenom" className="text-right">
                  Prénom*
                </Label>
                <Input id="prenom" className="col-span-3" {...register("prenom")} />
                {errors.prenom && (
                  <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.prenom.message}</p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Sexe*</Label>
                <Controller
                  name="sexe"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex col-span-3 space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="M" id="sexe-m" />
                        <Label htmlFor="sexe-m">M</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="F" id="sexe-f" />
                        <Label htmlFor="sexe-f">F</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.sexe && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.sexe.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateNaissance" className="text-right">
                  Date de naissance
                </Label>
                <Input id="dateNaissance" type="date" className="col-span-3" {...register("dateNaissance")} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adresse" className="text-right">
                  Adresse
                </Label>
                <Input id="adresse" className="col-span-3" {...register("adresse")} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email*
                </Label>
                <Input id="email" type="email" className="col-span-3" {...register("email")} />
                {errors.email && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telephone" className="text-right">
                  Téléphone*
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Controller
                    name="indicatif"
                    control={control}
                    defaultValue="+243"
                    render={({ field }) => (
                      <CountryIndicativeSelect value={field.value} onValueChange={field.onChange} defaultValue="+243" />
                    )}
                  />
                  <Input id="telephone" className="flex-1" {...register("telephone")} />
                </div>
                {(errors.indicatif || errors.telephone) && (
                  <p className="col-span-3 col-start-2 text-sm text-red-500">
                    {errors.indicatif?.message || errors.telephone?.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="profession" className="text-right">
                  Profession
                </Label>
                <Controller
                  name="profession"
                  control={control}
                  defaultValue="Autre"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner la profession" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salarié">Salarié</SelectItem>
                        <SelectItem value="Commercant">Commerçant</SelectItem>
                        <SelectItem value="Entrepreneur">Entrepreneur</SelectItem>
                        <SelectItem value="Travailleur Independant">Travailleur Indépendant</SelectItem>
                        <SelectItem value="Etudiant">Etudiant</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {profession === "Salarié" && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salarieDetails.typeContrat" className="text-right">
                      Type de Contrat
                    </Label>
                    <Controller
                      name="salarieDetails.typeContrat"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Sélectionner le type de contrat" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CDI">CDI</SelectItem>
                            <SelectItem value="CDD">CDD</SelectItem>
                            <SelectItem value="Journalier">Journalier</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salarieDetails.entreprise" className="text-right">
                      Entreprise
                    </Label>
                    <Input
                      id="salarieDetails.entreprise"
                      className="col-span-3"
                      {...register("salarieDetails.entreprise")}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salarieDetails.reference" className="text-right">
                      Référence
                    </Label>
                    <Input
                      id="salarieDetails.reference"
                      className="col-span-3"
                      {...register("salarieDetails.reference")}
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="revenuMensuel" className="text-right">
                  Revenu mensuel
                </Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input id="revenuMensuel" type="number" className="pl-7 col-span-3" {...register("revenuMensuel")} />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="situationMatrimoniale" className="text-right">
                  Situation Matrimoniale
                </Label>
                <Controller
                  name="situationMatrimoniale"
                  control={control}
                  defaultValue="celibataire"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner la situation matrimoniale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celibataire">Célibataire</SelectItem>
                        <SelectItem value="marié">Marié(e)</SelectItem>
                        <SelectItem value="divorcé">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombreEnfants" className="text-right">
                  Nombre d'enfants
                </Label>
                <Input
                  id="nombreEnfants"
                  type="number"
                  className="col-span-3"
                  {...register("nombreEnfants", { valueAsNumber: true })}
                />
              </div>
              
              {situationMatrimoniale === "marié" && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-2">Informations du conjoint</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.nom" className="text-right">
                      Nom*
                    </Label>
                    <Input id="conjoint.nom" className="col-span-3" {...register("conjoint.nom")} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.prenom" className="text-right">
                      Prénom*
                    </Label>
                    <Input id="conjoint.prenom" className="col-span-3" {...register("conjoint.prenom")} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Sexe*</Label>
                    <Controller
                      name="conjoint.sexe"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex col-span-3 space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="M" id="conjoint-sexe-m" />
                            <Label htmlFor="conjoint-sexe-m">M</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="F" id="conjoint-sexe-f" />
                            <Label htmlFor="conjoint-sexe-f">F</Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.dateNaissance" className="text-right">
                      Date de naissance
                    </Label>
                    <Input
                      id="conjoint.dateNaissance"
                      type="date"
                      className="col-span-3"
                      {...register("conjoint.dateNaissance")}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.adresse" className="text-right">
                      Adresse
                    </Label>
                    <Input id="conjoint.adresse" className="col-span-3" {...register("conjoint.adresse")} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.email" className="text-right">
                      Email*
                    </Label>
                    <Input id="conjoint.email" type="email" className="col-span-3" {...register("conjoint.email")} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="conjoint.telephone" className="text-right">
                      Téléphone*
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Controller
                        name="conjoint.indicatif"
                        control={control}
                        defaultValue="+243"
                        render={({ field }) => (
                          <CountryIndicativeSelect value={field.value} onValueChange={field.onChange} defaultValue="+243" />
                        )}
                      />
                      <Input id="conjoint.telephone" className="flex-1" {...register("conjoint.telephone")} />
                    </div>
                  </div>
                  {errors.conjoint && <p className="col-span-4 text-sm text-red-500">{errors.conjoint.message}</p>}
                </div>
              )}
              {nombreEnfants > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-2">Informations des enfants</h3>
                  {enfantsFields.map((field, index) => (
                    <div key={field.id} className="border p-4 mb-4 rounded-md">
                      <h4 className="text-md font-semibold mb-2">Enfant {index + 1}</h4>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`enfants.${index}.nom`} className="text-right">
                          Nom*
                        </Label>
                        <Input
                          id={`enfants.${index}.nom`}
                          className="col-span-3"
                          {...register(`enfants.${index}.nom`)}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`enfants.${index}.prenom`} className="text-right">
                          Prénom*
                        </Label>
                        <Input
                          id={`enfants.${index}.prenom`}
                          className="col-span-3"
                          {...register(`enfants.${index}.prenom`)}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Sexe*</Label>
                        <Controller
                          name={`enfants.${index}.sexe`}
                          control={control}
                          render={({ field }) => (
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex col-span-3 space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="M" id={`enfants-${index}-sexe-m`} />
                                <Label htmlFor={`enfants-${index}-sexe-m`}>M</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="F" id={`enfants-${index}-sexe-f`} />
                                <Label htmlFor={`enfants-${index}-sexe-f`}>F</Label>
                              </div>
                            </RadioGroup>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`enfants.${index}.occupation`} className="text-right">
                          Occupation*
                        </Label>
                        <Controller
                          name={`enfants.${index}.occupation`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Sélectionner l'occupation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eleve">Élève</SelectItem>
                                <SelectItem value="etudiant">Étudiant</SelectItem>
                                <SelectItem value="employe">Employé</SelectItem>
                                <SelectItem value="travailleur independant">Travailleur indépendant</SelectItem>
                                <SelectItem value="autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`enfants.${index}.dateNaissance`} className="text-right">
                          Date de naissance*
                        </Label>
                        <Input
                          id={`enfants.${index}.dateNaissance`}
                          type="date"
                          className="col-span-3"
                          {...register(`enfants.${index}.dateNaissance`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => removeEnfant(index)}
                      >
                        Supprimer cet enfant
                      </Button>
                    </div>
                  ))}
                  {errors.enfants && <p className="col-span-4 text-sm text-red-500">{errors.enfants.message}</p>}
                  {enfantsFields.length < nombreEnfants && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendEnfant({ nom: "", prenom: "", sexe: "M", occupation: "eleve", dateNaissance: "" })
                      }
                    >
                      Ajouter un enfant
                    </Button>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

