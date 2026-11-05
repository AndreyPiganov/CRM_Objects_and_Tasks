import { Add, DeleteOutlined, EditOutlined, LocationOnOutlined } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  archiveObject,
  createObject,
  getObjects,
  updateObject,
  type ObjectInput,
} from '../api/objects'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ObjectFormDialog } from '../components/ObjectFormDialog'
import { getErrorMessage } from '../lib/errors'
import type { ConstructionObject } from '../types/database'

export function ObjectsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingObject, setEditingObject] = useState<ConstructionObject | null>(null)
  const [deletingObject, setDeletingObject] = useState<ConstructionObject | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const objectsQuery = useQuery({ queryKey: ['objects'], queryFn: getObjects })
  const saveMutation = useMutation({
    mutationFn: async (input: ObjectInput) =>
      editingObject ? updateObject(editingObject.id, input) : createObject(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['objects'] })
      setFormOpen(false)
      setEditingObject(null)
    },
  })
  const archiveMutation = useMutation({
    mutationFn: archiveObject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['objects'] })
      setDeletingObject(null)
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Не удалось удалить объект.')),
  })

  const openCreate = () => {
    setEditingObject(null)
    setFormOpen(true)
  }

  const openEdit = (object: ConstructionObject) => {
    setEditingObject(object)
    setFormOpen(true)
  }

  if (objectsQuery.isLoading) {
    return <CircularProgress aria-label="Загрузка объектов" />
  }

  if (objectsQuery.isError) {
    return (
      <Alert severity="error">
        {getErrorMessage(objectsQuery.error, 'Не удалось загрузить объекты.')}
      </Alert>
    )
  }

  const objects = objectsQuery.data ?? []

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Объекты
          </Typography>
          <Typography color="text.secondary">
            {profile?.role === 'setter'
              ? 'Все активные строительные объекты'
              : 'Объекты, где вам назначены задачи'}
          </Typography>
        </Box>
        {profile?.role === 'setter' && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Добавить
          </Button>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {objects.length === 0 ? (
        <Alert severity="info">
          {profile?.role === 'setter'
            ? 'Объектов пока нет. Создайте первый объект.'
            : 'Нет объектов с назначенными вам задачами.'}
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: 2,
          }}
        >
          {objects.map((object) => (
            <Card key={object.id} sx={{ display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {object.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, color: 'text.secondary' }}>
                  <LocationOnOutlined fontSize="small" />
                  <Typography variant="body2">{object.address}</Typography>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button onClick={() => navigate(`/objects/${object.id}`)}>Открыть</Button>
                {profile?.role === 'setter' && (
                  <Box>
                    <Tooltip title="Редактировать">
                      <IconButton aria-label={`Редактировать ${object.name}`} onClick={() => openEdit(object)}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        aria-label={`Удалить ${object.name}`}
                        color="error"
                        onClick={() => setDeletingObject(object)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <ObjectFormDialog
        open={formOpen}
        initialValue={
          editingObject ? { name: editingObject.name, address: editingObject.address } : null
        }
        onClose={() => {
          setFormOpen(false)
          setEditingObject(null)
        }}
        onSubmit={(input) => saveMutation.mutateAsync(input).then(() => undefined)}
      />
      <ConfirmDialog
        open={Boolean(deletingObject)}
        title="Удалить объект?"
        description="Объект и все его активные задачи будут скрыты. История задач сохранится в базе."
        loading={archiveMutation.isPending}
        onCancel={() => setDeletingObject(null)}
        onConfirm={() => {
          if (deletingObject) archiveMutation.mutate(deletingObject.id)
        }}
      />
    </>
  )
}

