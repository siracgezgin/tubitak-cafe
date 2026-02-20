import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import ButtonBase from '@mui/material/ButtonBase';
import CardContent from '@mui/material/CardContent';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';

// project imports
import Avatar from 'components/@extended/Avatar';
import MainCard from 'components/MainCard';
import Transitions from 'components/@extended/Transitions';
import { useAuth } from 'contexts/AuthContext';

// assets
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';

const ROL_COLORS = {
  'Admin': { color: '#d32f2f', bg: '#ffebee' },
  'SubAdmin': { color: '#1565c0', bg: '#e3f2fd' },
  'Garson': { color: '#2e7d32', bg: '#e8f5e9' },
  'Yonetici': { color: '#d32f2f', bg: '#ffebee' },
  'Kasa': { color: '#ed6c02', bg: '#fff3e0' }
};

// ==============================|| HEADER CONTENT - PROFILE ||============================== //

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleToggle = () => setOpen(prev => !prev);
  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) return;
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user ? `${user.ad || user.Ad || ''} ${user.soyad || user.Soyad || ''}`.trim() : 'Kullanıcı';
  const userRol = user?.rol || user?.Rol || 'Garson';
  const userInitials = userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  const rolStyle = ROL_COLORS[userRol] || ROL_COLORS['Garson'];

  return (
    <Box sx={{ flexShrink: 0, ml: 'auto' }}>
      <Tooltip title="Profil" disableInteractive>
        <ButtonBase
          sx={{
            p: 0.25,
            borderRadius: 1,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.dark', outlineOffset: 2 }
          }}
          ref={anchorRef}
          aria-controls={open ? 'profile-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
        >
          <Avatar
            sx={{
              width: 36, height: 36,
              bgcolor: rolStyle.bg,
              color: rolStyle.color,
              fontWeight: 700,
              fontSize: '0.85rem',
              border: '2px solid',
              borderColor: rolStyle.color,
              '&:hover': { opacity: 0.85 }
            }}
          >
            {userInitials || <UserOutlined />}
          </Avatar>
        </ButtonBase>
      </Tooltip>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [0, 9] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
            <Paper sx={{ boxShadow: 3, width: 280, borderRadius: 2 }}>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard elevation={0} border={false} content={false}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 44, height: 44,
                          bgcolor: rolStyle.bg,
                          color: rolStyle.color,
                          fontWeight: 700,
                          fontSize: '1rem'
                        }}
                      >
                        {userInitials}
                      </Avatar>
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {userName}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Chip
                            label={userRol}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: rolStyle.bg,
                              color: rolStyle.color
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            @{user?.kullanici || user?.Kullanici || ''}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                  <Divider />
                  <Box sx={{ p: 1.5 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<LogoutOutlined />}
                      onClick={handleLogout}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1
                      }}
                    >
                      Çıkış Yap
                    </Button>
                  </Box>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
