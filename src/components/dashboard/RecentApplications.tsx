import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
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
} from 'lucide-react'

interface RecentApplicationsProps {
  applications: JobApplication[]
  searchQuery: string
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

export function RecentApplications({
  applications,
  searchQuery,
  onClearSearch,
  onAddNew,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
}: RecentApplicationsProps) {
  return (
    <Card className="border border-border/80 bg-card shadow-2xs w-full min-w-0 overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Recent Applications
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Track, update status, and manage your {applications.length} pipeline opportunities
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal self-start sm:self-auto">
            {applications.length} displayed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {applications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery ? 'No matching applications found' : 'No applications tracked yet'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? `No applications matched "${searchQuery}". Try searching with different keywords or clear your search filter.`
                  : 'Get started by adding your first job opportunity to track your resume submissions, interview rounds, and offers.'}
              </p>
            </div>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSearch}
                className="text-xs cursor-pointer"
              >
                Clear search filter
              </Button>
            ) : (
              onAddNew && (
                <Button
                  size="sm"
                  onClick={onAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add your first application</span>
                </Button>
              )
            )}
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (displayed strictly on small screens: < 640px) */}
            <div className="block sm:hidden divide-y divide-border/60">
              {applications.map((app) => (
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
                      Location
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
                  {applications.map((app) => (
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
