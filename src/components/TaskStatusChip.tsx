import { Chip } from '@mui/material'
import { taskStatusColors, taskStatusLabels } from '../domain/taskStatus'
import type { TaskStatus } from '../types/database'

export function TaskStatusChip({ status }: { status: TaskStatus }) {
  return <Chip label={taskStatusLabels[status]} color={taskStatusColors[status]} size="small" />
}

