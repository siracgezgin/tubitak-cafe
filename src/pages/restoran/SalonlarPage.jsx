import { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, Box, Chip, CircularProgress } from '@mui/material';
import { TableRestaurant, People, CheckCircle } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

// Salon Card Component
function SalonCard({ salon, masalar, onMasaClick }) {
    const bosKoltuk = masalar.filter(m => m.durum === 'Boş').reduce((acc, m) => acc + m.koltukSayisi, 0);
    const doluKoltuk = masalar.filter(m => m.durum === 'Dolu').reduce((acc, m) => acc + m.koltukSayisi, 0);

    return (
        <MainCard title={salon.ad} secondary={<Chip label={`${masalar.length} Masa`} size="small" color="primary" />}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {masalar.map(masa => (
                    <Card
                        key={masa.id}
                        sx={{
                            width: 80,
                            height: 80,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            bgcolor: masa.durum === 'Boş' ? 'success.lighter' : 'warning.lighter',
                            border: 2,
                            borderColor: masa.durum === 'Boş' ? 'success.main' : 'warning.main',
                            '&:hover': { boxShadow: 4 }
                        }}
                        onClick={() => onMasaClick && onMasaClick(masa)}
                    >
                        <TableRestaurant sx={{ fontSize: 24, color: masa.durum === 'Boş' ? 'success.main' : 'warning.main' }} />
                        <Typography variant="body2" fontWeight="bold">M{masa.masaNo}</Typography>
                        <Typography variant="caption">{masa.koltukSayisi} kişi</Typography>
                    </Card>
                ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Chip icon={<CheckCircle />} label={`Boş: ${bosKoltuk} koltuk`} color="success" size="small" />
                <Chip icon={<People />} label={`Dolu: ${doluKoltuk} koltuk`} color="warning" size="small" />
            </Box>
        </MainCard>
    );
}

export default function SalonlarPage() {
    const [salonlar, setSalonlar] = useState([]);
    const [masalar, setMasalar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [salonRes, masaRes] = await Promise.all([
                fetch(`${API_BASE}/salonlar`).then(r => r.json()),
                fetch(`${API_BASE}/masalar`).then(r => r.json())
            ]);
            setSalonlar(salonRes);
            setMasalar(masaRes);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <MainCard>
                <Typography color="error">Hata: {error}</Typography>
            </MainCard>
        );
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4">Salonlar & Masalar</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip label={`${salonlar.length} Salon`} color="primary" />
                            <Chip label={`${masalar.length} Masa`} color="secondary" />
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            {salonlar.map(salon => (
                <Grid item xs={12} md={6} key={salon.id}>
                    <SalonCard
                        salon={salon}
                        masalar={masalar.filter(m => m.salonId === salon.id)}
                    />
                </Grid>
            ))}
        </Grid>
    );
}
