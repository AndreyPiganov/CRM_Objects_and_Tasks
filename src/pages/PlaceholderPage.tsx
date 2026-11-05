import { Paper, Typography } from '@mui/material'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">Раздел готовится.</Typography>
    </Paper>
  )
}

