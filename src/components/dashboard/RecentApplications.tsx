import { useState, useMemo } from 'react'
import type {
  JobApplication,
  ApplicationStatus,
  StatusFilter,
  EmploymentTypeFilter,
  DateRangeFilter,
  SortOption,
} from '@/types/dashboard'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Check,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { ApplicationFilters } from './ApplicationFilters'
import { ApplicationPagination } from './ApplicationPagination'

interface RecentApplicationsProps {
  applications: JobApplication[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onClearSearch: () => void
  onAddNew?: () => void
  onEditApplication: (application: JobApplication) => void
  onDeleteApplication: (application: JobApplication) => void
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
]

function getStatusBadgeClass(status: ApplicationStatus): string {
  switch (status) {
    case 'Offer':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Interview':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Screening':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'Applied':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
    case 'Saved':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function matchesDateRange(dateString: string, range: DateRangeFilter): boolean {
  if (range === 'ALL') return true

  const targetDate = new Date(dateString)
  if (isNaN(targetDate.getTime())) return false

  const today = new Date()
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  )

  if (range === '7_DAYS') {
    const sevenDaysAgo = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7,
      0,
      0,
      0,
      0
    )
    return targetDate >= sevenDaysAgo && targetDate <= endOfToday
  }

  if (range === '30_DAYS') {
    const thirtyDaysAgo = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 30,
      0,
      0,
      0,
      0
    )
    return targetDate >= thirtyDaysAgo && targetDate <= endOfToday
  }

  if (range === 'THIS_MONTH') {
    return (
      targetDate.getFullYear() === today.getFullYear() &&
      targetDate.getMonth() === today.getMonth()
    )
  }

  return true
}

export function RecentApplications({
  applications,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onAddNew,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
}: RecentApplicationsProps) {
  // Local Filter, Sort, and Pagination State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [employmentFilter, setEmploymentFilter] = useState<EmploymentTypeFilter>('ALL')
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ALL')
  const [sortOption, setSortOption] = useState<SortOption>('date-desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // 1. Filter applications by search, status, employment type, and date range
  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return applications.filter((app) => {
      // Keyword search matches company or role
      if (query) {
        const matchesCompany = app.company.toLowerCase().includes(query)
        const matchesRole = app.role.toLowerCase().includes(query)
        if (!matchesCompany && !matchesRole) return false
      }

      // Status filter
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false
      }

      // Employment type filter
      if (employmentFilter !== 'ALL' && app.employmentType !== employmentFilter) {
        return false
      }

      // Date range filter
      if (dateFilter !== 'ALL' && !matchesDateRange(app.appliedDate, dateFilter)) {
        return false
      }

      return true
    })
  }, [applications, searchQuery, statusFilter, employmentFilter, dateFilter])

  // 2. Sort filtered applications (immutable copy before sort)
  const sortedApplications = useMemo(() => {
    const list = [...filteredApplications]

    return list.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
        case 'date-asc':
          return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime()
        case 'company-asc':
          return a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
        case 'company-desc':
          return b.company.localeCompare(a.company, undefined, { sensitivity: 'base' })
        case 'role-asc':
          return a.role.localeCompare(b.role, undefined, { sensitivity: 'base' })
        default:
          return 0
      }
    })
  }, [filteredApplications, sortOption])

  // 3. Pagination calculations
  const totalResults = sortedApplications.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  // Sliced page data
  const paginatedApplications = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return sortedApplications.slice(startIndex, startIndex + pageSize)
  }, [sortedApplications, safeCurrentPage, pageSize])

  // Filter change handlers (all reset current page to 1)
  const handleSearchChange = (query: string) => {
    onSearchChange(query)
    setCurrentPage(1)
  }

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleEmploymentChange = (type: EmploymentTypeFilter) => {
    setEmploymentFilter(type)
    setCurrentPage(1)
  }

  const handleDateChange = (range: DateRangeFilter) => {
    setDateFilter(range)
    setCurrentPage(1)
  }

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Active filters detection
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    employmentFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    sortOption !== 'date-desc'

  const activeFilterCount =
    (searchQuery.trim().length > 0 ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (employmentFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (sortOption !== 'date-desc' ? 1 : 0)

  // Clear all filters action
  const handleClearAllFilters = () => {
    onClearSearch()
    setStatusFilter('ALL')
    setEmploymentFilter('ALL')
    setDateFilter('ALL')
    setSortOption('date-desc')
    setCurrentPage(1)
  }

  return (
    <Card
      id="applications-directory"
      className="border border-border/80 bg-card shadow-2xs w-full min-w-0 overflow-hidden scroll-mt-20"
    >
      {/* Card Header with count badge */}
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Applications Directory
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Track, filter, and manage your {applications.length} pipeline opportunities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="outline" className="text-xs font-normal">
              {filteredApplications.length === applications.length
                ? `${applications.length} total`
                : `${filteredApplications.length} of ${applications.length} matched`}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Filter and Sorting Toolbar */}
      <ApplicationFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        employmentFilter={employmentFilter}
        onEmploymentChange={handleEmploymentChange}
        dateFilter={dateFilter}
        onDateChange={handleDateChange}
        sortOption={sortOption}
        onSortChange={handleSortChange}
        onClearFilters={handleClearAllFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
      />

      <CardContent className="p-0">
        {/* Empty State A: No applications in dataset at all */}
        {applications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No applications tracked yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get started by adding your first job opportunity to track your resume submissions, interview rounds, and offers.
              </p>
            </div>
            {onAddNew && (
              <Button
                size="sm"
                onClick={onAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add your first application</span>
              </Button>
            )}
          </div>
        ) : filteredApplications.length === 0 ? (
          /* Empty State B: Applications exist, but filters matched nothing */
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No matching applications found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No applications match your active search and filter combination. Try adjusting your search term or resetting your filters.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset all filters</span>
            </Button>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (displayed strictly on mobile & small tablet screens: < 768px) */}
            <div className="block md:hidden divide-y divide-border/60">
              {paginatedApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 space-y-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Top row: Monogram + Company & Role (wrapped) + Actions Menu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Company Monogram Badge */}
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300 mt-0.5 shadow-2xs">
                        {app.company.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Company Name and Role - Wraps cleanly without truncation */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-foreground break-words [overflow-wrap:anywhere] leading-snug">
                          {app.company}
                        </h4>
                        <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] leading-normal mt-0.5 font-medium">
                          {app.role}
                        </p>
                      </div>
                    </div>

                    {/* Top-right Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 -mr-1 -mt-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          aria-label={`Actions for ${app.company}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => onEditApplication(app)}
                          className="cursor-pointer"
                        >
                          <Pencil className="size-3.5 mr-2" />
                          <span>Edit Application</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <ArrowRightLeft className="size-3.5 mr-2" />
                            <span>Change Status</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-36">
                            {ALL_STATUSES.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => onUpdateStatus(app.id, status)}
                                className="cursor-pointer flex items-center justify-between"
                              >
                                <span>{status}</span>
                                {app.status === status && (
                                  <Check className="size-3 text-blue-600" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteApplication(app)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          <span>Delete Application</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Middle row: Interactive Status Selector & Target Compensation */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Status:
                      </span>
                      <Select
                        value={app.status}
                        onValueChange={(val) =>
                          onUpdateStatus(app.id, val as ApplicationStatus)
                        }
                      >
                        <SelectTrigger
                          aria-label={`Change status for ${app.company}`}
                          className={`h-6.5 rounded-full px-2.5 py-0 text-xs font-medium border shadow-none cursor-pointer ${getStatusBadgeClass(
                            app.status
                          )}`}
                        >
                          <SelectValue>{app.status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {ALL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Compensation */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      <DollarSign className="size-3 text-muted-foreground/70" />
                      <span>{app.salary || 'Undisclosed'}</span>
                    </div>
                  </div>

                  {/* Bottom row: Structured metadata pill (Location on top, Arrangement & Employment below, Date on right) */}
                  <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Location */}
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span
                          className={cn(
                            'break-words font-medium text-foreground/80',
                            !app.location && 'text-muted-foreground/70 font-normal'
                          )}
                        >
                          {app.location || 'Not specified'}
                        </span>
                      </div>

                      {/* Work Arrangement and Employment Type positioned at the bottom of Location */}
                      {(app.workplaceType || app.employmentType) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {app.workplaceType && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-background border border-border/60">
                              {app.workplaceType}
                            </span>
                          )}
                          {app.employmentType && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-background border border-border/60">
                              {app.employmentType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Applied Date */}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 mt-0.5">
                      <Calendar className="size-3 text-muted-foreground/70" />
                      <span>
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Tablet & Desktop Table View (displayed on >= 768px with zero scrolling) */}
            <div className="hidden md:block w-full overflow-hidden">
              <Table className="w-full table-fixed" containerClassName="overflow-x-hidden">
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/20">
                    <TableHead className="w-[28%] text-xs font-semibold text-muted-foreground pl-5 whitespace-normal leading-tight">
                      Company & Role
                    </TableHead>
                    <TableHead className="w-[23%] text-xs font-semibold text-muted-foreground whitespace-normal leading-tight">
                      Location & Arrangement
                    </TableHead>
                    <TableHead className="w-[14%] text-xs font-semibold text-muted-foreground whitespace-normal leading-tight">
                      Applied Date
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold text-muted-foreground whitespace-normal leading-tight">
                      Status
                    </TableHead>
                    <TableHead className="w-[12%] text-xs font-semibold text-muted-foreground text-right whitespace-normal leading-tight">
                      Compensation
                    </TableHead>
                    <TableHead className="w-[8%] min-w-[50px] pr-4 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.map((app) => (
                    <TableRow
                      key={app.id}
                      className="border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      {/* Company & Role */}
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300 mt-0.5">
                            {app.company.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-semibold text-sm text-foreground break-words [overflow-wrap:anywhere] whitespace-normal leading-snug">
                              {app.company}
                            </div>
                            <div className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] whitespace-normal leading-snug">
                              {app.role}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Location & Arrangement (Workplace and Employment Type at the bottom of Location) */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground min-w-0">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
                            <span
                              className={cn(
                                'break-words [overflow-wrap:anywhere] whitespace-normal leading-snug',
                                !app.location && 'text-muted-foreground/70'
                              )}
                            >
                              {app.location || 'Not specified'}
                            </span>
                          </div>

                          {(app.workplaceType || app.employmentType) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {app.workplaceType && (
                                <span className="text-[10px] text-muted-foreground/70 font-medium px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 shrink-0">
                                  {app.workplaceType}
                                </span>
                              )}
                              {app.employmentType && (
                                <span className="text-[10px] text-muted-foreground/70 font-medium px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 shrink-0">
                                  {app.employmentType}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Applied Date */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Status Selector */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <Select
                          value={app.status}
                          onValueChange={(val) =>
                            onUpdateStatus(app.id, val as ApplicationStatus)
                          }
                        >
                          <SelectTrigger
                            aria-label={`Change status for ${app.company}`}
                            className={`h-6.5 rounded-full px-2.5 py-0 text-xs font-medium border shadow-none cursor-pointer ${getStatusBadgeClass(
                              app.status
                            )}`}
                          >
                            <SelectValue>{app.status}</SelectValue>
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {ALL_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Compensation */}
                      <TableCell className="py-3.5 text-right text-xs font-medium text-foreground whitespace-nowrap">
                        {app.salary || (
                          <span className="text-muted-foreground font-normal">Undisclosed</span>
                        )}
                      </TableCell>

                      {/* Actions Menu (Guaranteed width to avoid overlapping) */}
                      <TableCell className="w-[8%] min-w-[50px] pr-4 py-3.5 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center justify-center"
                              aria-label={`Actions for ${app.company}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => onEditApplication(app)}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-3.5 mr-2" />
                              <span>Edit Application</span>
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="cursor-pointer">
                                <ArrowRightLeft className="size-3.5 mr-2" />
                                <span>Change Status</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-36">
                                {ALL_STATUSES.map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => onUpdateStatus(app.id, status)}
                                    className="cursor-pointer flex items-center justify-between"
                                  >
                                    <span>{status}</span>
                                    {app.status === status && (
                                      <Check className="size-3 text-blue-600" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteApplication(app)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              <span>Delete Application</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls Footer */}
            <ApplicationPagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalResults={totalResults}
              pageSize={pageSize}
              onPageChange={(page) =>
                setCurrentPage(Math.min(Math.max(1, page), totalPages))
              }
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
