import { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, Box, Alert, Button, Chip } from '@mui/material';
import { Line as LineChart } from 'react-chartjs-2';
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
import MainCard from 'components/MainCard';
import { dashboardApi, forecastApi, segmentApi } from 'api/cafeml';

// Chart.js register
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Stat Card Component
function StatCard({ title, value, subtitle, color = 'primary' }) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h3" color={`${color}.main`}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default function CafeMLDashboard() {
    const [summary, setSummary] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [segments, setSegments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const [summaryData, forecastData, segmentData] = await Promise.all([
                dashboardApi.getSummary(),
                forecastApi.getSalesForecast(7),
                segmentApi.getSummary()
            ]);
            setSummary(summaryData);
            setForecast(forecastData);
            setSegments(segmentData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Forecast chart data
    const chartData = forecast?.tahminler ? {
        labels: forecast.tahminler.map(t => t.tarih.split('-').slice(1).join('/')),
        datasets: [
            {
                label: 'Tahmin (TL)',
                data: forecast.tahminler.map(t => t.tahminedilenSatis),
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Alt Sınır',
                data: forecast.tahminler.map(t => t.altSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false,
            },
            {
                label: 'Üst Sınır',
                data: forecast.tahminler.map(t => t.ustSinir),
                borderColor: '#90caf9',
                borderDash: [5, 5],
                fill: false,
            }
        ]
    } : null;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: '7 Günlük Satış Tahmini' }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'TL' } }
        }
    };

    if (error) {
        return (
            <MainCard title="CafeML Dashboard">
                <Alert severity="error" sx={{ mb: 2 }}>
                    API Bağlantı Hatası: {error}
                </Alert>
                <Typography variant="body2" color="text.secondary">
                    Backend çalışıyor mu? <code>http://localhost:5000</code>
                </Typography>
                <Button onClick={loadData} variant="contained" sx={{ mt: 2 }}>
                    Tekrar Dene
                </Button>
            </MainCard>
        );
    }

    return (
        <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4">CafeML Dashboard</Typography>
                        <Button onClick={loadData} variant="outlined" disabled={loading}>
                            {loading ? 'Yükleniyor...' : 'Yenile'}
                        </Button>
                    </Box>
                </MainCard>
            </Grid>

            {/* Stats */}
            {summary && (
                <>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Toplam Sipariş"
                            value={summary.toplamSiparis?.toLocaleString()}
                            subtitle="Tüm zamanlar"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Toplam Ciro"
                            value={`₺${(summary.toplamCiro || 0).toLocaleString()}`}
                            color="success"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Müşteri Sayısı"
                            value={summary.toplamMusteri?.toLocaleString()}
                            color="info"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Ort. Sepet"
                            value={`₺${Math.round(summary.ortalamaSepet || 0)}`}
                            color="warning"
                        />
                    </Grid>
                </>
            )}

            {/* Forecast Chart */}
            <Grid item xs={12} md={8}>
                <MainCard title="Satış Tahmini (7 Gün)">
                    {chartData ? (
                        <LineChart data={chartData} options={chartOptions} />
                    ) : (
                        <Typography color="text.secondary">Veri yükleniyor...</Typography>
                    )}
                </MainCard>
            </Grid>

            {/* Segments */}
            <Grid item xs={12} md={4}>
                <MainCard title="Müşteri Segmentleri">
                    {segments?.segmentOzeti ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {segments.segmentOzeti.map((seg, idx) => (
                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">{seg.segment}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {seg.musteriSayisi} müşteri
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`₺${seg.toplamCiro.toLocaleString()}`}
                                        size="small"
                                        color={idx === 0 ? 'success' : 'default'}
                                    />
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography color="text.secondary">Veri yükleniyor...</Typography>
                    )}
                </MainCard>
            </Grid>
        </Grid>
    );
}

