// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';

// project import
import MainCard from 'components/MainCard';

// ==============================|| DRAWER CONTENT - CAFEML INFO CARD ||============================== //

export default function NavCard() {
  return (
    <MainCard sx={{ bgcolor: 'primary.lighter', m: 3 }}>
      <Stack alignItems="center" spacing={1.5}>
        <LocalCafeIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Stack alignItems="center">
          <Typography variant="h5" color="primary.main">CafeML</Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Akıllı Kafe-Restoran Yönetimi
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.disabled">v1.0.0</Typography>
      </Stack>
    </MainCard>
  );
}


