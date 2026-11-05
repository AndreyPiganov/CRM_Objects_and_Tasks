import { CalendarTodayOutlined, PersonOutlined } from '@mui/icons-material'
import { Box, Button, Card, CardActions, CardContent, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { formatDateTime } from '../lib/format'
import type { Task } from '../types/database'
import { TaskStatusChip } from './TaskStatusChip'

interface TaskSummaryCardProps {
  task: Task
  objectName?: string
  assigneeName?: string
  actions?: ReactNode
  onOpen: () => void
}

export function TaskSummaryCard({
  task,
  objectName,
  assigneeName,
  actions,
  onOpen,
}: TaskSummaryCardProps) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Typography variant="h6" component="h3">
            {task.title}
          </Typography>
          <TaskStatusChip status={task.status} />
        </Box>
        {objectName && (
          <Typography color="primary" variant="body2" sx={{ mb: 1 }}>
            {objectName}
          </Typography>
        )}
        {assigneeName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', mb: 0.5 }}>
            <PersonOutlined fontSize="small" />
            <Typography variant="body2">{assigneeName}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          <CalendarTodayOutlined fontSize="small" />
          <Typography variant="body2">{formatDateTime(task.created_at)}</Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button onClick={onOpen}>Открыть</Button>
        {actions}
      </CardActions>
    </Card>
  )
}

