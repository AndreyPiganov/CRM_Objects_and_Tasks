import { z } from 'zod'

export const revisionCommentSchema = z
  .string()
  .trim()
  .min(1, 'Комментарий обязателен')
  .max(2000, 'Не более 2000 символов')

