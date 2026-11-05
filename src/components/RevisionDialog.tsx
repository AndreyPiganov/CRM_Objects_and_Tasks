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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getErrorMessage } from '../lib/errors'

const revisionSchema = z.object({
  comment: z.string().trim().min(1, 'Комментарий обязателен').max(2000, 'Не более 2000 символов'),
})

interface RevisionDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (comment: string) => Promise<void>
}

export function RevisionDialog({ open, onClose, onSubmit }: RevisionDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ comment: string }>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { comment: '' },
  })

  const submit = async ({ comment }: { comment: string }) => {
    setSubmitError(null)
    try {
      await onSubmit(comment.trim())
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не удалось вернуть задачу на доработку.'))
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={(event) => void handleSubmit(submit)(event)} noValidate>
        <DialogTitle>Вернуть на доработку</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
            <TextField
              label="Что нужно исправить"
              multiline
              minRows={4}
              fullWidth
              autoFocus
              error={Boolean(errors.comment)}
              helperText={errors.comment?.message}
              {...register('comment')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" color="warning" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Отправка…' : 'Вернуть'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

