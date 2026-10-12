import type { UpcomingInterview } from '@/types/dashboard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Video, User } from 'lucide-react'

interface UpcomingInterviewsProps {
  interviews: UpcomingInterview[]
}

export function UpcomingInterviews({ interviews }: UpcomingInterviewsProps) {
  return (
    <Card className="border border-border/80 bg-card shadow-2xs flex flex-col">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Upcoming Interviews
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Scheduled conversations & rounds
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {interviews.length} upcoming
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 space-y-3">
        {interviews.map((interview) => (
          <div
            key={interview.id}
            className="rounded-lg border border-border/70 p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2.5"
          >
            {/* Header: Company & Stage */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground leading-tight">
                  {interview.company}
                </h4>
                <p className="text-xs text-muted-foreground">{interview.role}</p>
              </div>
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                {interview.stage}
              </span>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-600 shrink-0" />
                <span className="font-medium text-foreground">{interview.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                <span>{interview.time}</span>
              </div>
            </div>

            {/* Interviewer & Platform */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <User className="size-3 text-muted-foreground shrink-0" />
                <span className="truncate">{interview.interviewer}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium shrink-0">
                <Video className="size-3" />
                <span>{interview.platform}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
