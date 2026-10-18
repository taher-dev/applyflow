import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  StatusFilter,
  EmploymentTypeFilter,
  DateRangeFilter,
  SortOption,
} from '@/types/dashboard'

export interface ApplicationFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  employmentFilter: EmploymentTypeFilter
  onEmploymentChange: (type: EmploymentTypeFilter) => void
  dateFilter: DateRangeFilter
  onDateChange: (range: DateRangeFilter) => void
  sortOption: SortOption
  onSortChange: (sort: SortOption) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

export function ApplicationFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  employmentFilter,
  onEmploymentChange,
  dateFilter,
  onDateChange,
  sortOption,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
}: ApplicationFiltersProps) {
  return (
    <div className="space-y-3 p-3.5 sm:p-4 bg-muted/20 border-b border-border/60">
      {/* 1. Full-size Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id="directory-search-input"
          type="text"
          placeholder="Search by company or job title..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 h-9.5 text-xs sm:text-sm bg-background border-border/80 focus-visible:ring-1 shadow-2xs"
          aria-label="Search applications by company name or job title"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1 rounded-sm"
            aria-label="Clear search input"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* 2. Unified Filters & Sorting Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <div className="w-[135px] sm:w-[140px]">
          <Select
            value={statusFilter}
            onValueChange={(val) => onStatusChange(val as StatusFilter)}
          >
            <SelectTrigger
              className="w-full h-8.5 text-xs bg-background border-border/80 px-2.5"
              aria-label="Filter by application status"
            >
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Saved">Saved</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Screening">Screening</SelectItem>
              <SelectItem value="Interview">Interview</SelectItem>
              <SelectItem value="Offer">Offer</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employment Type Filter */}
        <div className="w-[128px] sm:w-[132px]">
          <Select
            value={employmentFilter}
            onValueChange={(val) => onEmploymentChange(val as EmploymentTypeFilter)}
          >
            <SelectTrigger
              className="w-full h-8.5 text-xs bg-background border-border/80 px-2.5"
              aria-label="Filter by employment type"
            >
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="w-[130px] sm:w-[135px]">
          <Select
            value={dateFilter}
            onValueChange={(val) => onDateChange(val as DateRangeFilter)}
          >
            <SelectTrigger
              className="w-full h-8.5 text-xs bg-background border-border/80 px-2.5"
              aria-label="Filter by application date range"
            >
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">All time</SelectItem>
              <SelectItem value="7_DAYS">Last 7 days</SelectItem>
              <SelectItem value="30_DAYS">Last 30 days</SelectItem>
              <SelectItem value="THIS_MONTH">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Action Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 shrink-0"
            aria-label="Clear all active filters and search"
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
            <Badge
              variant="secondary"
              className="size-4 p-0 text-[10px] font-semibold flex items-center justify-center rounded-full"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}

        {/* Right: Sort By Selection (pushed to right on sm+ with sm:ml-auto) */}
        <div className="flex items-center gap-1.5 sm:ml-auto shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline font-medium">Sort:</span>
          <div className="w-[155px] sm:w-[165px]">
            <Select
              value={sortOption}
              onValueChange={(val) => onSortChange(val as SortOption)}
            >
              <SelectTrigger
                className="w-full h-8.5 text-xs bg-background border-border/80 px-2.5"
                aria-label="Sort applications"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="date-desc">Newest applied</SelectItem>
                <SelectItem value="date-asc">Oldest applied</SelectItem>
                <SelectItem value="company-asc">Company (A–Z)</SelectItem>
                <SelectItem value="company-desc">Company (Z–A)</SelectItem>
                <SelectItem value="role-asc">Job title (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Active Filters summary pill indicator */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
          <SlidersHorizontal className="size-3 text-blue-600 shrink-0" />
          <span>Active:</span>
          {searchQuery && (
            <span className="bg-background px-1.5 py-0.5 rounded border border-border/80 font-medium text-foreground">
              &quot;{searchQuery.trim()}&quot;
            </span>
          )}
          {statusFilter !== 'ALL' && (
            <span className="bg-background px-1.5 py-0.5 rounded border border-border/80 font-medium text-foreground">
              Status: {statusFilter}
            </span>
          )}
          {employmentFilter !== 'ALL' && (
            <span className="bg-background px-1.5 py-0.5 rounded border border-border/80 font-medium text-foreground">
              Type: {employmentFilter}
            </span>
          )}
          {dateFilter !== 'ALL' && (
            <span className="bg-background px-1.5 py-0.5 rounded border border-border/80 font-medium text-foreground">
              Date: {dateFilter === '7_DAYS' ? 'Last 7 days' : dateFilter === '30_DAYS' ? 'Last 30 days' : 'This month'}
            </span>
          )}
          {sortOption !== 'date-desc' && (
            <span className="bg-background px-1.5 py-0.5 rounded border border-border/80 font-medium text-foreground">
              Sorted: {sortOption === 'date-asc' ? 'Oldest first' : sortOption === 'company-asc' ? 'Company A-Z' : sortOption === 'company-desc' ? 'Company Z-A' : 'Role A-Z'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
