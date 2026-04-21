"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  ville: z.enum(["Kinshasa", "Kolwezi", "Lubumbashi"]),
  commune: z.string().min(1, "Commune is required"),
  terrain: z.enum(["30/40", "40/30"]),
  total: z.string().min(1, "Total is required"),
  date_contrat: z.string().min(1, "Date de contrat is required"),
  date_debut: z.string().min(1, "Date de début is required"),
  date_fin: z.string().min(1, "Date de fin is required"),
})

type FormData = z.infer<typeof formSchema>

interface ContractFormProps {
  onSubmitContract: (data: FormData) => void
  clientId: string | null
  onOpenChange: (open: boolean) => void
}

export function ContractForm({ onSubmitContract, clientId, onOpenChange }: ContractFormProps) {
  const [selectedVille, setSelectedVille] = useState<"Kinshasa" | "Kolwezi" | "Lubumbashi">("Kinshasa")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ville: "Kinshasa",
      terrain: "30/40",
      date_contrat: new Date().toISOString().split("T")[0],
      date_debut: new Date().toISOString().split("T")[0],
      date_fin: new Date(new Date().setMonth(new Date().getMonth() + 36)).toISOString().split("T")[0],
    },
  })

  const communeOptions = {
    Kinshasa: ["Maluku", "Gombe"],
    Kolwezi: ["Com1", "Com2"],
    Lubumbashi: ["Com3", "Com4"],
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      if (!clientId) throw new Error("Client ID is missing")

      // console.log("Contract data:", data)
      // Here you would typically send the data to your API
      // For now, we'll just log it and close the dialog
      onSubmitContract(data)
      onOpenChange(false)
    } catch (error) {
      // console.error("Error processing contract:", error)
      // Handle error (e.g., show error message to user)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="ville" className="text-right">
            Ville*
          </Label>
          <Controller
            name="ville"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value: "Kinshasa" | "Kolwezi" | "Lubumbashi") => {
                  field.onChange(value)
                  setSelectedVille(value)
                }}
                defaultValue={field.value}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kinshasa">Kinshasa</SelectItem>
                  <SelectItem value="Kolwezi">Kolwezi</SelectItem>
                  <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.ville && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.ville.message}</p>}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="commune" className="text-right">
            Commune*
          </Label>
          <Controller
            name="commune"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select commune" />
                </SelectTrigger>
                <SelectContent>
                  {communeOptions[selectedVille].map((commune) => (
                    <SelectItem key={commune} value={commune}>
                      {commune}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.commune && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.commune.message}</p>}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="terrain" className="text-right">
            Terrain*
          </Label>
          <Controller
            name="terrain"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select terrain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30/40">30/40</SelectItem>
                  <SelectItem value="40/30">40/30</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.terrain && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.terrain.message}</p>}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="total" className="text-right">
            Total*
          </Label>
          <Input id="total" className="col-span-3" {...register("total")} />
          {errors.total && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.total.message}</p>}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="date_contrat" className="text-right">
            Date de contrat*
          </Label>
          <Input id="date_contrat" type="date" className="col-span-3" {...register("date_contrat")} />
          {errors.date_contrat && (
            <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.date_contrat.message}</p>
          )}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="date_debut" className="text-right">
            Date de début*
          </Label>
          <Input id="date_debut" type="date" className="col-span-3" {...register("date_debut")} />
          {errors.date_debut && (
            <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.date_debut.message}</p>
          )}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="date_fin" className="text-right">
            Date de fin*
          </Label>
          <Input id="date_fin" type="date" className="col-span-3" {...register("date_fin")} />
          {errors.date_fin && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.date_fin.message}</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Add Client"}
        </Button>
      </div>
    </form>
  )
}

