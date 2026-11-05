import type { ChipProps } from '@mui/material'
import type { Profile, Task, TaskStatus } from '../types/database'

export const taskStatusLabels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  revision: 'На доработке',
}

export const taskStatusColors: Record<TaskStatus, ChipProps['color']> = {
  new: 'default',
  in_progress: 'primary',
  review: 'info',
  accepted: 'success',
  revision: 'warning',
}

export interface AvailableTransition {
  targetStatus: TaskStatus
  label: string
  color: 'primary' | 'success' | 'warning'
  requiresComment: boolean
}

export function getAvailableTransitions(task: Task, profile: Profile): AvailableTransition[] {
  if (profile.role === 'executor' && task.assignee_id !== profile.id) return []

  if (profile.role === 'executor') {
    if (task.status === 'new' || task.status === 'revision') {
      return [
        {
          targetStatus: 'in_progress',
          label: 'Взять в работу',
          color: 'primary',
          requiresComment: false,
        },
      ]
    }
    if (task.status === 'in_progress') {
      return [
        {
          targetStatus: 'review',
          label: 'Отправить на проверку',
          color: 'primary',
          requiresComment: false,
        },
      ]
    }
  }

  if (profile.role === 'setter' && task.status === 'review') {
    return [
      {
        targetStatus: 'accepted',
        label: 'Принять',
        color: 'success',
        requiresComment: false,
      },
      {
        targetStatus: 'revision',
        label: 'Вернуть на доработку',
        color: 'warning',
        requiresComment: true,
      },
    ]
  }

  return []
}

