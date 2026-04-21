import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface AuthResultDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
}

export function AuthResultDialog({ isOpen, onClose, title, message }: AuthResultDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end">
          <Button onClick={onClose}>OK</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

