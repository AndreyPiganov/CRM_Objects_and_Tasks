import { describe, expect, it } from 'vitest'
import { getAvailableTransitions, taskStatusLabels } from './taskStatus'
import type { Profile, Task, TaskStatus } from '../types/database'

const executor: Profile = {
  id: 'executor-1',
  display_name: 'Исполнитель',
  role: 'executor',
  created_at: '2026-11-05T10:00:00Z',
}

const setter: Profile = {
  id: 'setter-1',
  display_name: 'Постановщик',
  role: 'setter',
  created_at: '2026-11-05T10:00:00Z',
}

function task(status: TaskStatus, assigneeId = executor.id): Task {
  return {
    id: 'task-1',
    title: 'Задача',
    description: '',
    object_id: 'object-1',
    assignee_id: assigneeId,
    status,
    author_id: setter.id,
    created_at: '2026-11-05T10:00:00Z',
    updated_at: '2026-11-05T10:00:00Z',
    deleted_at: null,
    deleted_by: null,
  }
}

describe('taskStatusLabels', () => {
  it('содержит русские подписи всех статусов', () => {
    expect(taskStatusLabels).toEqual({
      new: 'Новая',
      in_progress: 'В работе',
      review: 'На проверке',
      accepted: 'Принята',
      revision: 'На доработке',
    })
  })
})

describe('getAvailableTransitions', () => {
  it.each([
    ['new', 'in_progress'],
    ['revision', 'in_progress'],
    ['in_progress', 'review'],
  ] as const)('разрешает исполнителю переход %s → %s', (from, to) => {
    expect(getAvailableTransitions(task(from), executor).map((action) => action.targetStatus)).toEqual([
      to,
    ])
  })

  it('не даёт исполнителю действий над чужой задачей', () => {
    expect(getAvailableTransitions(task('new', 'another-executor'), executor)).toEqual([])
  })

  it('даёт постановщику принять задачу или вернуть её с комментарием', () => {
    expect(getAvailableTransitions(task('review'), setter)).toEqual([
      expect.objectContaining({ targetStatus: 'accepted', requiresComment: false }),
      expect.objectContaining({ targetStatus: 'revision', requiresComment: true }),
    ])
  })

  it.each(['new', 'in_progress', 'accepted', 'revision'] as const)(
    'не показывает постановщику переходы из статуса %s',
    (status) => {
      expect(getAvailableTransitions(task(status), setter)).toEqual([])
    },
  )
})

