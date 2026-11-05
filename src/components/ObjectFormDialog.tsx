import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ObjectInput } from '../api/objects'
import { getErrorMessage } from '../lib/errors'

const objectSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(200, 'Не более 200 символов'),
  address: z.string().trim().min(1, 'Укажите адрес').max(500, 'Не более 500 символов'),
})

interface ObjectFormDialogProps {
  open: boolean
  initialValue?: ObjectInput | null
  onClose: () => void
  onSubmit: (input: ObjectInput) => Promise<void>
}

export function ObjectFormDialog({
  open,
  initialValue,
  onClose,
  onSubmit,
}: ObjectFormDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObjectInput>({
    resolver: zodResolver(objectSchema),
    defaultValues: { name: '', address: '' },
  })

  useEffect(() => {
    if (open) {
      reset(initialValue ?? { name: '', address: '' })
    }
  }, [initialValue, open, reset])

  const close = () => {
    setSubmitError(null)
    onClose()
  }

  const submit = async (values: ObjectInput) => {
    setSubmitError(null)
    try {
      await onSubmit(values)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не удалось сохранить объект.'))
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : close} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={(event) => void handleSubmit(submit)(event)} noValidate>
        <DialogTitle>{initialValue ? 'Редактирование объекта' : 'Новый объект'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Название"
              autoFocus
              fullWidth
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Адрес"
              fullWidth
              multiline
              minRows={2}
              error={Boolean(errors.address)}
              helperText={errors.address?.message}
              {...register('address')}
            />
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

