import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CircularProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow, Button, Alert, Snackbar } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Refresh, AutoFixHigh, Info } from '@mui/icons-material';
import MainCard from 'components/MainCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_BASE = 'http://localhost:5000/api';

export default function ForecastPage() {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retraining, setRetraining] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const token = localStorage.getItem('cafeml_token');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/forecast/sales?days=14`);
            const data = await res.json();
            setForecast(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRetrain() {
        setRetraining(true);
        try {
            const res = await fetch(`${API_BASE}/forecast/retrain`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSnackbar({ open: true, message: `✅ ${data.message ?? 'Model yeniden eğitildi'}`, severity: 'success' });
                await loadData();
            } else {
                setSnackbar({ open: true, message: data.message ?? 'Eğitim başlatılamadı', severity: 'warning' });
            }
        } catch {
            setSnackbar({ open: true, message: 'Bağlantı hatası', severity: 'error' });
        } finally {
            setRetraining(false);
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

    const chartData = forecast?.tahminler ? {
        labels: forecast.tahminler.map(t => t.tarih),
        datasets: [
            {
                label: 'Tahmin',
                data: forecast.tahminler.map(t => t.tahminedilenSatis),
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Alt Sınır',
                data: forecast.tahminler.map(t => t.altSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false
            },
            {
                label: 'Üst Sınır',
                data: forecast.tahminler.map(t => t.ustSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false
            }
        ]
    } : null;

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4">Satış Tahmini</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                ML destekli 14 günlük satış tahmini
                            </Typography>
                            {forecast?.modelTipi && (
                                <Chip
                                    icon={<Info sx={{ fontSize: '14px !important' }} />}
                                    label={`Model: ${forecast.modelTipi}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={loadData}
                                size="small"
                            >
                                Yenile
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={retraining ? <CircularProgress size={16} color="inherit" /> : <AutoFixHigh />}
                                onClick={handleRetrain}
                                disabled={retraining}
                                size="small"
                            >
                                {retraining ? 'Eğitiliyor...' : 'Modeli Yeniden Eğit'}
                            </Button>
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            <Grid item xs={12} md={8}>
                <MainCard title="Tahmin Grafiği">
                    {chartData ? (
                        <Box sx={{ height: 400 }}>
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'top' }
                                    }
                                }}
                            />
                        </Box>
                    ) : (
                        <Typography>Veri yükleniyor...</Typography>
                    )}
                </MainCard>
            </Grid>

            <Grid item xs={12} md={4}>
                <MainCard title="Tahmin Detayları">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tarih</TableCell>
                                <TableCell align="right">Tahmin</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {forecast?.tahminler?.map((t, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{t.tarih}</TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold">₺{t.tahminedilenSatis?.toLocaleString()}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </MainCard>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Grid>
    );
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

    const chartData = forecast?.tahminler ? {
        labels: forecast.tahminler.map(t => t.tarih),
        datasets: [
            {
                label: 'Tahmin',
                data: forecast.tahminler.map(t => t.tahminedilenSatis),
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Alt Sınır',
                data: forecast.tahminler.map(t => t.altSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false
            },
            {
                label: 'Üst Sınır',
                data: forecast.tahminler.map(t => t.ustSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false
            }
        ]
    } : null;

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Typography variant="h4">Satış Tahmini</Typography>
                    <Typography variant="body2" color="text.secondary">
                        ML destekli 14 günlük satış tahmini
                    </Typography>
                </MainCard>
            </Grid>

            <Grid item xs={12} md={8}>
                <MainCard title="Tahmin Grafiği">
                    {chartData ? (
                        <Box sx={{ height: 400 }}>
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'top' }
                                    }
                                }}
                            />
                        </Box>
                    ) : (
                        <Typography>Veri yükleniyor...</Typography>
                    )}
                </MainCard>
            </Grid>

            <Grid item xs={12} md={4}>
                <MainCard title="Tahmin Detayları">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tarih</TableCell>
                                <TableCell align="right">Tahmin</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {forecast?.tahminler?.map((t, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{t.tarih}</TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold">₺{t.tahminedilenSatis?.toLocaleString()}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </MainCard>
            </Grid>
        </Grid>
    );
}
