import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
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
import { Building2, MapPin, Calendar, DollarSign } from 'lucide-react'

interface RecentApplicationsProps {
  applications: JobApplication[]
  searchQuery: string
  onClearSearch: () => void
}

function getStatusBadgeClass(status: ApplicationStatus): string {
  switch (status) {
    case 'Offer':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Interview':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Reviewing':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'Applied':
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
              Track status across your {applications.length} latest opportunities
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal self-start sm:self-auto">
            {applications.length} displayed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {applications.length === 0 ? (
          <div className="p-6 sm:p-8 text-center space-y-2">
            <Building2 className="mx-auto size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No applications found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No applications match &quot;{searchQuery}&quot;. Try adjusting your keywords or clearing your search.
            </p>
            <button
              type="button"
              onClick={onClearSearch}
              className="text-xs font-medium text-blue-600 hover:underline pt-1 cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (displayed strictly on small screens: < 640px) */}
            <div className="block sm:hidden divide-y divide-border/60">
              {applications.map((app) => (
                <div key={app.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                  {/* Top row: Company, Role, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
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

                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Middle row: Location + Workplace */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{app.location}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 font-medium px-1.5 py-0.2 rounded bg-muted">
                      {app.workplaceType}
                    </span>
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
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/20">
                    <TableHead className="w-[240px] text-xs font-semibold text-muted-foreground pl-5">
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
                    <TableHead className="text-xs font-semibold text-muted-foreground pr-5 text-right">
                      Compensation
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
                          <span className="truncate">{app.location}</span>
                          <span className="text-[10px] text-muted-foreground/60 font-medium px-1.5 py-0.2 rounded bg-muted/60">
                            {app.workplaceType}
                          </span>
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

                      {/* Status Badge */}
                      <TableCell className="py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${getStatusBadgeClass(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </TableCell>

                      {/* Compensation */}
                      <TableCell className="pr-5 py-3.5 text-right text-xs font-medium text-foreground">
                        {app.salary || (
                          <span className="text-muted-foreground font-normal">Undisclosed</span>
                        )}
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
