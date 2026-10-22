import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ApplicationPaginationProps {
  currentPage: number
  totalPages: number
  totalResults: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function ApplicationPagination({
  currentPage,
  totalPages,
  totalResults,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ApplicationPaginationProps) {
  if (totalResults === 0) return null

  const startRange = (currentPage - 1) * pageSize + 1
  const endRange = Math.min(currentPage * pageSize, totalResults)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-200/80 bg-slate-50/70 text-xs text-slate-500">
      {/* Left: Result range & Page Size selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Showing <span className="font-semibold text-slate-900">{startRange}–{endRange}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalResults}</span> applications
        </span>

        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline">Per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger
              className="h-7 w-[65px] text-xs bg-white border-slate-200 text-slate-800"
              aria-label="Select number of applications per page"
            >
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Page Navigation (Only rendered when more than 1 page exists) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span>
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7 cursor-pointer border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7 cursor-pointer border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
