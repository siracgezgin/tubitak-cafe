import { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Paper, Divider,
    CircularProgress, Alert, Chip, Button, TextField,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Avatar
} from '@mui/material';
import {
    TrendingUp, BarChart, Receipt, AttachMoney,
    Refresh, CalendarToday, Restaurant
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import MainCard from 'components/MainCard';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler
);

const API_BASE = 'http://localhost:5000/api';

const CHART_OPTS = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `₺${v.toLocaleString()}` } } }
};

export default function RaporlarPage() {
    const [gunSonu, setGunSonu] = useState(null);
    const [hourly, setHourly] = useState([]);
    const [topUrunler, setTopUrunler] = useState([]);
    const [dailySales, setDailySales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);

    const token = localStorage.getItem('cafeml_token');
    const headers = { Authorization: `Bearer ${token}` };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [gunRes, hourlyRes, topRes, dailyRes] = await Promise.all([
                fetch(`${API_BASE}/rapor/gun-sonu?tarih=${tarih}`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/sales/hourly`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/sales/top-urunler?limit=10`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/sales/daily`, { headers }).then(r => r.json()),
            ]);
            setGunSonu(gunRes);
            setHourly(hourlyRes);
            setTopUrunler(topRes);
            setDailySales(dailyRes);
        } catch (err) {
            console.error('Rapor yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }, [tarih]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadData(); }, [loadData]);

    // Saatlik grafik verisi
    const hourlyChart = {
        labels: hourly.map(h => `${h.saat}:00`),
        datasets: [{
            label: 'Satış (₺)',
            data: hourly.map(h => h.toplamSatis),
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25,118,210,0.15)',
            fill: true, tension: 0.4,
            pointBackgroundColor: '#1976d2'
        }]
    };

    // Günlük trend grafik
    const last14 = dailySales.slice(-14);
    const dailyChart = {
        labels: last14.map(d => new Date(d.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })),
        datasets: [{
            label: 'Günlük Ciro',
            data: last14.map(d => d.toplamSatis),
            backgroundColor: last14.map((d, i) => i === last14.length - 1 ? '#ff9800' : '#42a5f5'),
            borderRadius: 6
        }]
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Paper elevation={0} sx={{
                background: 'linear-gradient(135deg, #0d47a1, #1976d2, #42a5f5)',
                color: 'white', p: 3, borderRadius: { xs: 0, sm: 3 }, mb: 3,
                position: 'relative', overflow: 'hidden'
            }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <BarChart sx={{ fontSize: 26 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800}>Raporlar</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85 }}>
                                Satış ve performans analizi
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <TextField
                            type="date"
                            size="small"
                            value={tarih}
                            onChange={e => setTarih(e.target.value)}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.9)',
                                borderRadius: 1,
                                '& .MuiOutlinedInput-root': { borderRadius: 1 }
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<Refresh />}
                            onClick={loadData}
                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 700 }}
                        >
                            Yenile
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Grid container spacing={3}>
                {/* Özet Kartlar */}
                {[
                    { label: 'Toplam Ciro', value: `₺${(gunSonu?.toplamCiro ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, icon: <AttachMoney />, color: '#1976d2', bg: '#e3f2fd' },
                    { label: 'Tahsilat', value: `₺${(gunSonu?.toplamOdeme ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, icon: <Receipt />, color: '#388e3c', bg: '#e8f5e9' },
                    { label: 'Açık Hesap', value: `₺${(gunSonu?.acikHesap ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp />, color: '#f57c00', bg: '#fff3e0' },
                    { label: 'Sipariş Sayısı', value: gunSonu?.siparisSayisi ?? 0, icon: <Restaurant />, color: '#7b1fa2', bg: '#f3e5f5' },
                ].map((item) => (
                    <Grid item xs={12} sm={6} md={3} key={item.label}>
                        <Card sx={{ borderRadius: 3, border: `1px solid ${item.color}22` }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ bgcolor: item.bg, color: item.color, width: 44, height: 44 }}>
                                        {item.icon}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {item.label}
                                        </Typography>
                                        <Typography variant="h5" fontWeight={800} color={item.color}>
                                            {item.value}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {/* Saatlik Satış Grafiği */}
                <Grid item xs={12} md={7}>
                    <MainCard title="📊 Bugün Saatlik Satış Dağılımı">
                        {hourly.length > 0 ? (
                            <Box sx={{ height: 240 }}>
                                <Line data={hourlyChart} options={CHART_OPTS} />
                            </Box>
                        ) : (
                            <Alert severity="info">Bugün için veri yok.</Alert>
                        )}
                    </MainCard>
                </Grid>

                {/* En Çok Satan Ürünler */}
                <Grid item xs={12} md={5}>
                    <MainCard title="🏆 En Çok Satan Ürünler (Son 30 Gün)">
                        {topUrunler.length > 0 ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ürün</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Adet</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Ciro</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {topUrunler.map((u, i) => (
                                            <TableRow key={u.urunId || i} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={i + 1}
                                                        size="small"
                                                        color={i < 3 ? 'primary' : 'default'}
                                                        sx={{ width: 28, fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                        {u.urunAdi}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">{u.toplamAdet}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                    ₺{u.toplamCiro?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info">Veri yok.</Alert>
                        )}
                    </MainCard>
                </Grid>

                {/* 14 Günlük Trend */}
                <Grid item xs={12}>
                    <MainCard title="📈 Son 14 Günlük Satış Trendi">
                        {last14.length > 0 ? (
                            <Box sx={{ height: 260 }}>
                                <Bar
                                    data={dailyChart}
                                    options={{
                                        ...CHART_OPTS,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                callbacks: {
                                                    label: (ctx) => `₺${ctx.parsed.y.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                                                }
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        ) : (
                            <Alert severity="info">Günlük satış verisi yok.</Alert>
                        )}
                    </MainCard>
                </Grid>
            </Grid>
        </Box>
    );
}
