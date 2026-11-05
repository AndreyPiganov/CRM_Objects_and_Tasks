import { describe, expect, it } from 'vitest'
import { revisionCommentSchema } from './taskValidation'

describe('revisionCommentSchema', () => {
  it.each(['', '   ', '\n\t'])('отклоняет пустой комментарий %#', (comment) => {
    expect(revisionCommentSchema.safeParse(comment).success).toBe(false)
  })

  it('обрезает пробелы и принимает содержательный комментарий', () => {
    expect(revisionCommentSchema.parse('  Исправьте размеры  ')).toBe('Исправьте размеры')
  })

  it('ограничивает комментарий двумя тысячами символов', () => {
    expect(revisionCommentSchema.safeParse('а'.repeat(2001)).success).toBe(false)
  })
})

