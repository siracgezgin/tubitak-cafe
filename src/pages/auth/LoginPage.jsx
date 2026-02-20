import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, TextField, Button, Typography, Alert,
    CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, LocalCafe } from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [kullanici, setKullanici] = useState('');
    const [sifre, setSifre] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userData = await login(kullanici, sifre);
            // Garson → Masalar, Admin/SubAdmin → Dashboard
            const rol = userData?.rol || userData?.Rol || '';
            navigate(rol === 'Garson' ? '/garson' : '/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 2
            }}
        >
            <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3, boxShadow: 10 }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                        <LocalCafe sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight={700}>
                            Cafe<span style={{ color: '#1976d2' }}>ML</span>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            Restoran Yönetim Sistemi
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Kullanıcı Adı"
                            value={kullanici}
                            onChange={(e) => setKullanici(e.target.value)}
                            sx={{ mb: 2 }}
                            autoFocus
                            required
                        />
                        <TextField
                            fullWidth
                            label="Şifre"
                            type={showPassword ? 'text' : 'password'}
                            value={sifre}
                            onChange={(e) => setSifre(e.target.value)}
                            sx={{ mb: 3 }}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ py: 1.5, borderRadius: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Giriş Yap'}
                        </Button>
                    </form>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={1}>
                            Demo Hesaplar
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Admin: admin / admin123
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            SubAdmin: ortak1 / ortak123
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Garson: garson1 / garson123
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
