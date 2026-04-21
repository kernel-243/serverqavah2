import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Page info */}
      <div className="text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
        <div className="font-medium">Page {currentPage} sur {totalPages}</div>
        {totalItems && itemsPerPage && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Affichage de {((currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} éléments
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2 order-1 sm:order-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </Button>
        
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={`w-8 h-8 p-0 ${
                    currentPage === page 
                      ? "bg-blue-600 hover:bg-blue-700 border-blue-600" 
                      : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800"
                  }`}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

