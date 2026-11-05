import { Add, DeleteOutlined, EditOutlined } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getObjects } from '../api/objects'
import {
  archiveTask,
  createTask,
  getExecutors,
  getTasksForObject,
  getVisibleProfiles,
  updateTask,
  type TaskInput,
} from '../api/tasks'
import { useAuth } from '../auth/useAuth'
import { getErrorMessage } from '../lib/errors'
import type { Task } from '../types/database'
import { ConfirmDialog } from './ConfirmDialog'
import { TaskFormDialog } from './TaskFormDialog'
import { TaskSummaryCard } from './TaskSummaryCard'

export function ObjectTaskList({ objectId }: { objectId: string }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const isSetter = profile?.role === 'setter'

  const tasksQuery = useQuery({
    queryKey: ['tasks', 'object', objectId],
    queryFn: () => getTasksForObject(objectId),
  })
  const profilesQuery = useQuery({ queryKey: ['profiles', 'visible'], queryFn: getVisibleProfiles })
  const objectsQuery = useQuery({
    queryKey: ['objects'],
    queryFn: getObjects,
    enabled: isSetter,
  })
  const executorsQuery = useQuery({
    queryKey: ['profiles', 'executors'],
    queryFn: getExecutors,
    enabled: isSetter,
  })

  const saveMutation = useMutation({
    mutationFn: (input: TaskInput) =>
      editingTask ? updateTask(editingTask.id, input) : createTask(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['objects'] }),
      ])
      setFormOpen(false)
      setEditingTask(null)
    },
  })
  const archiveMutation = useMutation({
    mutationFn: archiveTask,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['objects'] }),
      ])
      setDeletingTask(null)
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Не удалось удалить задачу.')),
  })

  if (tasksQuery.isLoading || profilesQuery.isLoading) {
    return <CircularProgress aria-label="Загрузка задач" />
  }

  if (tasksQuery.isError || profilesQuery.isError) {
    return <Alert severity="error">Не удалось загрузить задачи объекта.</Alert>
  }

  const tasks = tasksQuery.data ?? []
  const profileById = new Map((profilesQuery.data ?? []).map((item) => [item.id, item]))

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" component="h2">
          Задачи
        </Typography>
        {isSetter && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingTask(null)
              setFormOpen(true)
            }}
          >
            Добавить задачу
          </Button>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {tasks.length === 0 ? (
        <Alert severity="info">
          {isSetter ? 'Для этого объекта пока нет задач.' : 'У вас нет задач на этом объекте.'}
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 2,
          }}
        >
          {tasks.map((task) => (
            <TaskSummaryCard
              key={task.id}
              task={task}
              assigneeName={profileById.get(task.assignee_id)?.display_name ?? 'Исполнитель'}
              onOpen={() => navigate(`/tasks/${task.id}`)}
              actions={
                isSetter ? (
                  <Box>
                    <Tooltip title="Редактировать">
                      <IconButton
                        aria-label={`Редактировать ${task.title}`}
                        onClick={() => {
                          setEditingTask(task)
                          setFormOpen(true)
                        }}
                      >
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        aria-label={`Удалить ${task.title}`}
                        color="error"
                        onClick={() => setDeletingTask(task)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : undefined
              }
            />
          ))}
        </Box>
      )}

      {isSetter && (
        <TaskFormDialog
          open={formOpen}
          initialValue={
            editingTask
              ? {
                  title: editingTask.title,
                  description: editingTask.description,
                  object_id: editingTask.object_id,
                  assignee_id: editingTask.assignee_id,
                }
              : null
          }
          defaultObjectId={objectId}
          objects={objectsQuery.data ?? []}
          executors={executorsQuery.data ?? []}
          onClose={() => {
            setFormOpen(false)
            setEditingTask(null)
          }}
          onSubmit={(input) => saveMutation.mutateAsync(input).then(() => undefined)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deletingTask)}
        title="Удалить задачу?"
        description="Задача будет скрыта, но история её статусов сохранится в базе."
        loading={archiveMutation.isPending}
        onCancel={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) archiveMutation.mutate(deletingTask.id)
        }}
      />
    </>
  )
}

