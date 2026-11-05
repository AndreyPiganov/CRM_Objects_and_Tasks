import { Construction } from '@mui/icons-material'
import { Box, Container, Paper, Typography } from '@mui/material'

export function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
        <Paper sx={{ p: 5, width: '100%', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Construction color="primary" sx={{ fontSize: 56 }} />
            <Typography variant="h4">Объекты и задачи</Typography>
            <Typography color="text.secondary">
              Мини-CRM для строительной компании
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

