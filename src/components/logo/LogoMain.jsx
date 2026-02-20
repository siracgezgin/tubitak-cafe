// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';

// ==============================|| CAFEML LOGO ||============================== //

export default function LogoMain() {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LocalCafeIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: theme.palette.text.primary,
          letterSpacing: '-0.5px'
        }}
      >
        Cafe<span style={{ color: theme.palette.primary.main }}>ML</span>
      </Typography>
    </Box>
  );
}

