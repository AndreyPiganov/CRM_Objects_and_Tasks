import {
  ArrowBack,
  BusinessOutlined,
  CalendarTodayOutlined,
  DeleteOutlined,
  EditOutlined,
  PersonOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getObjects } from '../api/objects'
import {
  archiveTask,
  getExecutors,
  getTaskDetails,
  transitionTask,
  updateTask,
  type TaskInput,
} from '../api/tasks'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RevisionDialog } from '../components/RevisionDialog'
import { TaskFormDialog } from '../components/TaskFormDialog'
import { TaskStatusChip } from '../components/TaskStatusChip'
import { getAvailableTransitions, taskStatusLabels } from '../domain/taskStatus'
import { getErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import type { TaskStatus } from '../types/database'

interface TransitionVariables {
  targetStatus: TaskStatus
  comment?: string
}

export function TaskPage() {
  const { taskId = '' } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const isSetter = profile?.role === 'setter'

  const detailsQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskDetails(taskId),
    enabled: Boolean(taskId),
  })
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

  const invalidateTaskData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['objects'] }),
      queryClient.invalidateQueries({ queryKey: ['profiles', 'visible'] }),
    ])
  }

  const updateMutation = useMutation({
    mutationFn: (input: TaskInput) => updateTask(taskId, input),
    onSuccess: async () => {
      await invalidateTaskData()
      setFormOpen(false)
    },
  })
  const transitionMutation = useMutation({
    mutationFn: ({ targetStatus, comment }: TransitionVariables) =>
      transitionTask(taskId, targetStatus, comment),
    onSuccess: invalidateTaskData,
    onError: (error) => setActionError(getErrorMessage(error, 'Не удалось изменить статус задачи.')),
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveTask(taskId),
    onSuccess: async () => {
      const objectId = detailsQuery.data?.object.id
      await invalidateTaskData()
      navigate(objectId ? `/objects/${objectId}` : '/objects', { replace: true })
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Не удалось удалить задачу.')),
  })

  if (detailsQuery.isLoading) return <CircularProgress aria-label="Загрузка задачи" />

  if (detailsQuery.isError || !detailsQuery.data || !profile) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Задача не найдена или у вас нет доступа.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/objects')}>
          К объектам
        </Button>
      </Box>
    )
  }

  const { task, object, assignee, author, history } = detailsQuery.data
  const transitions = getAvailableTransitions(task, profile)

  const runTransition = (targetStatus: TaskStatus) => {
    setActionError(null)
    transitionMutation.mutate({ targetStatus })
  }

  return (
    <>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(`/objects/${object.id}`)} sx={{ mb: 2 }}>
        К объекту
      </Button>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              {task.title}
            </Typography>
            <TaskStatusChip status={task.status} />
          </Box>
          {isSetter && (
            <Box sx={{ display: 'flex' }}>
              <Tooltip title="Редактировать">
                <IconButton aria-label="Редактировать задачу" onClick={() => setFormOpen(true)}>
                  <EditOutlined />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton aria-label="Удалить задачу" color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <BusinessOutlined color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">Объект</Typography>
              <Typography>{object.name}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PersonOutlined color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">Исполнитель</Typography>
              <Typography>{assignee?.display_name ?? 'Неизвестный пользователь'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PersonOutlined color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">Автор</Typography>
              <Typography>{author?.display_name ?? 'Неизвестный пользователь'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CalendarTodayOutlined color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">Создана</Typography>
              <Typography>{formatDateTime(task.created_at)}</Typography>
            </Box>
          </Box>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Описание
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{task.description || 'Описание не указано.'}</Typography>

        {transitions.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {transitions.map((transition) => (
                <Button
                  key={transition.targetStatus}
                  variant="contained"
                  color={transition.color}
                  disabled={transitionMutation.isPending}
                  onClick={() => {
                    if (transition.requiresComment) setRevisionOpen(true)
                    else runTransition(transition.targetStatus)
                  }}
                >
                  {transition.label}
                </Button>
              ))}
            </Box>
          </>
        )}
      </Paper>

      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        История статусов
      </Typography>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {history.length === 0 ? (
          <Typography color="text.secondary">История пока пуста.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map((item, index) => (
              <Box
                key={item.id}
                sx={{
                  pl: 2,
                  borderLeft: 3,
                  borderColor: 'primary.light',
                  pb: index === history.length - 1 ? 0 : 1,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {item.from_status
                    ? `${taskStatusLabels[item.from_status]} → ${taskStatusLabels[item.to_status]}`
                    : `Создание → ${taskStatusLabels[item.to_status]}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.actor?.display_name ?? 'Неизвестный пользователь'} · {formatDateTime(item.changed_at)}
                </Typography>
                {item.comment && (
                  <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{item.comment}</Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {isSetter && (
        <TaskFormDialog
          open={formOpen}
          initialValue={{
            title: task.title,
            description: task.description,
            object_id: task.object_id,
            assignee_id: task.assignee_id,
          }}
          objects={objectsQuery.data ?? []}
          executors={executorsQuery.data ?? []}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        title="Удалить задачу?"
        description="Задача будет скрыта, но история её статусов сохранится в базе."
        loading={archiveMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => archiveMutation.mutate()}
      />
      {revisionOpen && (
        <RevisionDialog
          open
          onClose={() => setRevisionOpen(false)}
          onSubmit={async (comment) => {
            await transitionMutation.mutateAsync({ targetStatus: 'revision', comment })
            setRevisionOpen(false)
          }}
        />
      )}
    </>
  )
}

