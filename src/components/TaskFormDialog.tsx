import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { TaskInput } from '../api/tasks'
import { getErrorMessage } from '../lib/errors'
import type { ConstructionObject, Profile } from '../types/database'

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(200, 'Не более 200 символов'),
  description: z.string().max(5000, 'Не более 5000 символов'),
  object_id: z.string().min(1, 'Выберите объект'),
  assignee_id: z.string().min(1, 'Выберите исполнителя'),
})

interface TaskFormDialogProps {
  open: boolean
  initialValue?: TaskInput | null
  defaultObjectId?: string
  objects: ConstructionObject[]
  executors: Profile[]
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<void>
}

const emptyValue: TaskInput = { title: '', description: '', object_id: '', assignee_id: '' }

export function TaskFormDialog({
  open,
  initialValue,
  defaultObjectId = '',
  objects,
  executors,
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyValue,
  })

  useEffect(() => {
    if (open) reset(initialValue ?? { ...emptyValue, object_id: defaultObjectId })
  }, [defaultObjectId, initialValue, open, reset])

  const close = () => {
    setSubmitError(null)
    onClose()
  }

  const submit = async (values: TaskInput) => {
    setSubmitError(null)
    try {
      await onSubmit(values)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не удалось сохранить задачу.'))
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : close} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={(event) => void handleSubmit(submit)(event)} noValidate>
        <DialogTitle>{initialValue ? 'Редактирование задачи' : 'Новая задача'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Название"
              autoFocus
              fullWidth
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
              {...register('title')}
            />
            <TextField
              label="Описание"
              multiline
              minRows={3}
              fullWidth
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <TextField
              select
              label="Объект"
              fullWidth
              defaultValue=""
              error={Boolean(errors.object_id)}
              helperText={errors.object_id?.message}
              {...register('object_id')}
            >
              {objects.map((object) => (
                <MenuItem key={object.id} value={object.id}>
                  {object.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Исполнитель"
              fullWidth
              defaultValue=""
              error={Boolean(errors.assignee_id)}
              helperText={errors.assignee_id?.message}
              {...register('assignee_id')}
            >
              {executors.map((executor) => (
                <MenuItem key={executor.id} value={executor.id}>
                  {executor.display_name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

