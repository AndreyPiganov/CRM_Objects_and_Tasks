import { ArrowBack, DeleteOutlined, EditOutlined, LocationOnOutlined } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { archiveObject, getObject, updateObject, type ObjectInput } from '../api/objects'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ObjectFormDialog } from '../components/ObjectFormDialog'
import { getErrorMessage } from '../lib/errors'

export function ObjectPage() {
  const { objectId = '' } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const objectQuery = useQuery({
    queryKey: ['object', objectId],
    queryFn: () => getObject(objectId),
    enabled: Boolean(objectId),
  })
  const updateMutation = useMutation({
    mutationFn: (input: ObjectInput) => updateObject(objectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['object', objectId] }),
        queryClient.invalidateQueries({ queryKey: ['objects'] }),
      ])
      setFormOpen(false)
    },
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveObject(objectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['objects'] })
      navigate('/objects', { replace: true })
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Не удалось удалить объект.')),
  })

  if (objectQuery.isLoading) return <CircularProgress aria-label="Загрузка объекта" />

  if (objectQuery.isError || !objectQuery.data) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Объект не найден или у вас нет доступа.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/objects')}>
          К списку объектов
        </Button>
      </Box>
    )
  }

  const object = objectQuery.data

  return (
    <>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/objects')} sx={{ mb: 2 }}>
        К списку объектов
      </Button>
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {object.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, color: 'text.secondary' }}>
              <LocationOnOutlined />
              <Typography>{object.address}</Typography>
            </Box>
          </Box>
          {profile?.role === 'setter' && (
            <Box sx={{ display: 'flex' }}>
              <Tooltip title="Редактировать">
                <IconButton aria-label="Редактировать объект" onClick={() => setFormOpen(true)}>
                  <EditOutlined />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton aria-label="Удалить объект" color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Paper>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Задачи
      </Typography>
      <Alert severity="info">Для этого объекта пока нет доступных задач.</Alert>

      <ObjectFormDialog
        open={formOpen}
        initialValue={{ name: object.name, address: object.address }}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Удалить объект?"
        description="Объект и все его активные задачи будут скрыты. История задач сохранится в базе."
        loading={archiveMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => archiveMutation.mutate()}
      />
    </>
  )
}

