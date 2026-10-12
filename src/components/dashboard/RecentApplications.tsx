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
    <Card className="border border-border/80 bg-card shadow-2xs w-full min-w-0 overflow-hidden">
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
            {/* 1. Mobile Cards View (displayed strictly on small screens: < 640px) */}
            <div className="block sm:hidden divide-y divide-border/60">
              {paginatedApplications.map((app) => (
                <div key={app.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                  {/* Top row: Company, Role, Status Selector, and Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300">
                        {app.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {app.company}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {app.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Status Selector */}
                      <Select
                        value={app.status}
                        onValueChange={(val) => onUpdateStatus(app.id, val as ApplicationStatus)}
                      >
                        <SelectTrigger
                          aria-label={`Change status for ${app.company}`}
                          className={`h-6 rounded-full px-2.5 py-0.5 text-[11px] font-medium border shadow-none cursor-pointer ${getStatusBadgeClass(
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

                      {/* Row Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
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
                  </div>

                  {/* Middle row: Location + Workplace + Employment Type */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span
                        className={cn(
                          'truncate',
                          !app.location && 'text-muted-foreground/70'
                        )}
                      >
                        {app.location || 'Not specified'}
                      </span>
                    </div>
                    {app.workplaceType && (
                      <span className="text-[10px] text-muted-foreground/80 font-medium px-1.5 py-0.5 rounded bg-muted">
                        {app.workplaceType}
                      </span>
                    )}
                    {app.employmentType && (
                      <span className="text-[10px] text-muted-foreground/80 font-medium px-1.5 py-0.5 rounded bg-muted">
                        {app.employmentType}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Applied Date & Compensation */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground/70" />
                      <span>
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="size-3 text-muted-foreground/70" />
                      <span>{app.salary || 'Undisclosed'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Tablet & Desktop Table View (displayed on >= 640px) */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <Table className="min-w-[660px]">
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/20">
                    <TableHead className="w-[230px] text-xs font-semibold text-muted-foreground pl-5">
                      Company & Role
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Location & Arrangement
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Applied Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                      Compensation
                    </TableHead>
                    <TableHead className="w-[70px] text-xs font-semibold text-muted-foreground pr-5 text-right">
                      Actions
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
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300">
                            {app.company.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {app.company}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {app.role}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Location & Workplace */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span
                            className={cn(
                              'truncate',
                              !app.location && 'text-muted-foreground/70'
                            )}
                          >
                            {app.location || 'Not specified'}
                          </span>
                          {app.workplaceType && (
                            <span className="text-[10px] text-muted-foreground/60 font-medium px-1.5 py-0.5 rounded bg-muted/60">
                              {app.workplaceType}
                            </span>
                          )}
                          {app.employmentType && (
                            <span className="text-[10px] text-muted-foreground/60 font-medium px-1.5 py-0.5 rounded bg-muted/60">
                              {app.employmentType}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Applied Date */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground">
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Status Selector */}
                      <TableCell className="py-3.5">
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
                      <TableCell className="py-3.5 text-right text-xs font-medium text-foreground">
                        {app.salary || (
                          <span className="text-muted-foreground font-normal">Undisclosed</span>
                        )}
                      </TableCell>

                      {/* Actions Menu */}
                      <TableCell className="pr-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
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
