import { Alert, Box, CircularProgress, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getObjects } from '../api/objects'
import { getMyTasks } from '../api/tasks'
import { useAuth } from '../auth/useAuth'
import { TaskSummaryCard } from '../components/TaskSummaryCard'
import { getErrorMessage } from '../lib/errors'

export function MyTasksPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const tasksQuery = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: () => getMyTasks(profile!.id),
    enabled: Boolean(profile),
  })
  const objectsQuery = useQuery({ queryKey: ['objects'], queryFn: getObjects })

  if (tasksQuery.isLoading || objectsQuery.isLoading) {
    return <CircularProgress aria-label="Загрузка моих задач" />
  }

  if (tasksQuery.isError || objectsQuery.isError) {
    return (
      <Alert severity="error">
        {getErrorMessage(tasksQuery.error ?? objectsQuery.error, 'Не удалось загрузить задачи.')}
      </Alert>
    )
  }

  const tasks = tasksQuery.data ?? []
  const objectById = new Map((objectsQuery.data ?? []).map((object) => [object.id, object]))

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Мои задачи
        </Typography>
        <Typography color="text.secondary">Все активные задачи, назначенные вам</Typography>
      </Box>
      {tasks.length === 0 ? (
        <Alert severity="info">У вас пока нет активных задач.</Alert>
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
              objectName={objectById.get(task.object_id)?.name ?? 'Объект'}
              onOpen={() => navigate(`/tasks/${task.id}`)}
            />
          ))}
        </Box>
      )}
    </>
  )
}

