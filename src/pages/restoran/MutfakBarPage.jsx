import { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Chip, CircularProgress,
    Avatar, Divider, IconButton, Button, Paper, Tooltip, Snackbar, Alert,
    Badge
} from '@mui/material';
import {
    Restaurant, LocalBar, AccessTime, CheckCircle, Timer,
    Refresh, DoneAll, LocalDining, LocalCafe, WifiTethering, WifiOff
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useSignalR } from 'hooks/useSignalR';

const API_BASE = 'http://localhost:5000/api';

function KitchenScreen({ type = 'mutfak' }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const token = localStorage.getItem('cafeml_token');

    const { connected, lastMessage } = useSignalR(type);

    const loadData = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            console.error('Yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }, [type, token]);

    // İlk yükleme + 30sn fallback polling
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // SignalR: yeni sipariş geldiğinde aninda güncelle
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'YeniSiparis' || lastMessage.type === 'SiparisTamamlandi') {
            loadData();
        }
    }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

    function timeSince(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}sn`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}dk`;
        return `${Math.floor(minutes / 60)}sa`;
    }

    function getTimeColor(date) {
        const minutes = Math.floor((new Date() - new Date(date)) / 60000);
        if (minutes < 5) return '#4caf50';   // yeşil - yeni
        if (minutes < 15) return '#ff9800';  // turuncu - bekliyor
        return '#f44336';                     // kırmızı - gecikiyor
    }

    async function completeOrder(orderId) {
        setCompleting(orderId);
        try {
            const res = await fetch(`${API_BASE}/siparisler/${orderId}/tamamla`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
                setSnackbar({ open: true, message: '✅ Sipariş tamamlandı!', severity: 'success' });
            }
        } catch {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        } finally {
            setCompleting(null);
        }
    }

    const isBar = type === 'bar';
    const title = isBar ? 'Bar Ekranı' : 'Mutfak Ekranı';
    const subtitle = isBar ? 'Hazırlanacak içecek siparişleri' : 'Hazırlanacak yemek siparişleri';
    const accentColor = isBar ? '#2196f3' : '#ff9800';
    const accentBg = isBar ? '#e3f2fd' : '#fff3e0';
    const accentDark = isBar ? '#1565c0' : '#e65100';
    const gradientBg = isBar
        ? 'linear-gradient(135deg, #0d47a1, #1976d2, #42a5f5)'
        : 'linear-gradient(135deg, #e65100, #ff9800, #ffb74d)';

    // Siparişleri masaya göre grupla
    const ordersByMasa = {};
    orders.forEach(order => {
        const masaKey = order.masa || 'Bilinmeyen';
        if (!ordersByMasa[masaKey]) ordersByMasa[masaKey] = [];
        ordersByMasa[masaKey].push(order);
    });

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Hero Header */}
            <Paper
                elevation={0}
                sx={{
                    background: gradientBg,
                    color: 'white', p: { xs: 2.5, md: 3.5 }, borderRadius: { xs: 0, sm: 3 }, mb: 3,
                    position: 'relative', overflow: 'hidden'
                }}
            >
                {/* Dekoratif */}
                <Box sx={{
                    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                    borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)'
                }} />
                <Box sx={{
                    position: 'absolute', bottom: -20, left: '40%', width: 80, height: 80,
                    borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)'
                }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                            width: 56, height: 56,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)'
                        }}>
                            {isBar ? <LocalCafe sx={{ fontSize: 28 }} /> : <LocalDining sx={{ fontSize: 28 }} />}
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800} letterSpacing={-0.5}>
                                {title}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.3 }}>
                                {subtitle}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Tooltip title={connected ? 'SignalR canlı bağlı' : 'Canlı bağlantı yok'}>
                            <Chip
                                size="small"
                                icon={connected
                                    ? <WifiTethering sx={{ color: 'white !important', fontSize: 16 }} />
                                    : <WifiOff sx={{ color: 'rgba(255,255,255,0.6) !important', fontSize: 16 }} />}
                                label={connected ? 'Canlı' : 'Offline'}
                                sx={{
                                    bgcolor: connected ? 'rgba(76,175,80,0.35)' : 'rgba(255,255,255,0.1)',
                                    color: 'white', fontWeight: 600, fontSize: '0.75rem'
                                }}
                            />
                        </Tooltip>
                        <Chip
                            icon={<Timer sx={{ color: 'white !important', fontSize: 18 }} />}
                            label={`${orders.length} sipariş hazırlanıyor`}
                            sx={{
                                bgcolor: orders.length > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(76,175,80,0.3)',
                                color: 'white', fontWeight: 700, fontSize: '0.85rem',
                                py: 2.5, backdropFilter: 'blur(4px)'
                            }}
                        />
                        <Tooltip title="Yenile">
                            <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}
                                onClick={loadData}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Paper>

            {/* Sipariş Kartları - Masa Bazlı */}
            {orders.length === 0 ? (
                <Card sx={{
                    textAlign: 'center', py: 8, borderRadius: 3,
                    border: '2px dashed #e0e0e0'
                }}>
                    <CheckCircle sx={{ fontSize: 64, color: 'success.light', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={600}>
                        Tüm siparişler tamamlandı! 🎉
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                        Yeni siparişler otomatik olarak görünecek
                    </Typography>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {Object.entries(ordersByMasa).map(([masaAd, masaOrders]) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={masaAd}>
                            <Card sx={{
                                borderRadius: 3, overflow: 'hidden',
                                border: '2px solid',
                                borderColor: accentColor,
                                transition: 'all 0.3s ease',
                                '&:hover': { boxShadow: `0 8px 25px ${accentColor}33` }
                            }}>
                                {/* Masa Header */}
                                <Box sx={{
                                    background: gradientBg,
                                    color: 'white', p: 2,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{
                                            bgcolor: 'rgba(255,255,255,0.25)',
                                            width: 36, height: 36, fontWeight: 800
                                        }}>
                                            {masaAd.replace('Masa ', '').charAt(0)}
                                        </Avatar>
                                        <Typography variant="subtitle1" fontWeight={800}>
                                            {masaAd}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${masaOrders.length} ürün`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white', fontWeight: 700
                                        }}
                                    />
                                </Box>

                                {/* Sipariş Listesi */}
                                <CardContent sx={{ p: 0 }}>
                                    {masaOrders.map((order, idx) => (
                                        <Box key={order.id || idx}>
                                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {/* Durum göstergesi */}
                                                <Box sx={{
                                                    width: 4, height: 40, borderRadius: 2,
                                                    bgcolor: getTimeColor(order.tarih)
                                                }} />

                                                {/* Sipariş bilgisi */}
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                        <Typography variant="h6" fontWeight={800}>
                                                            {order.miktar}x
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight={700}>
                                                            {order.urun}
                                                        </Typography>
                                                    </Box>
                                                    {order.sipNotu && (
                                                        <Typography variant="caption" color="error.main"
                                                            sx={{ fontStyle: 'italic', fontWeight: 600 }}>
                                                            📝 {order.sipNotu}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Süre */}
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Box sx={{
                                                        display: 'flex', alignItems: 'center', gap: 0.3,
                                                        color: getTimeColor(order.tarih)
                                                    }}>
                                                        <AccessTime sx={{ fontSize: 14 }} />
                                                        <Typography variant="caption" fontWeight={700}>
                                                            {timeSince(order.tarih)}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label="Hazırlanıyor"
                                                        size="small"
                                                        sx={{
                                                            mt: 0.5, height: 20, fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            bgcolor: '#fff3e0', color: '#e65100',
                                                            border: '1px solid #ffcc80'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>

                                            {idx < masaOrders.length - 1 && (
                                                <Divider sx={{ mx: 2 }} />
                                            )}
                                        </Box>
                                    ))}
                                </CardContent>

                                {/* Tamamla Butonu */}
                                <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                                    <Button
                                        fullWidth variant="contained" size="medium"
                                        startIcon={completing === masaOrders[0]?.id
                                            ? <CircularProgress size={18} color="inherit" />
                                            : <DoneAll />}
                                        onClick={() => {
                                            masaOrders.forEach(o => completeOrder(o.id));
                                        }}
                                        disabled={completing !== null}
                                        sx={{
                                            borderRadius: 2, fontWeight: 700,
                                            background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
                                            '&:hover': { background: 'linear-gradient(135deg, #1b5e20, #4caf50)' }
                                        }}
                                    >
                                        Tamamlandı
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

export function MutfakPage() {
    return <KitchenScreen type="mutfak" />;
}

export function BarPage() {
    return <KitchenScreen type="bar" />;
}
