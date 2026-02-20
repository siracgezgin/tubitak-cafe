import { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Chip, IconButton, Badge,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, ListItemSecondaryAction, Avatar, Divider,
    CircularProgress, Alert, Tooltip
} from '@mui/material';
import { Check, Close, Notifications, AccessTime, WifiTethering, WifiOff } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useSignalR } from 'hooks/useSignalR';

const API_BASE = 'http://localhost:5000/api';

export default function TaleplerPage() {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Bekliyor');
    const [selectedTalep, setSelectedTalep] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [newAlert, setNewAlert] = useState(false);

    const token = localStorage.getItem('cafeml_token');
    const { connected, lastMessage } = useSignalR('garsonlar');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/talepler?durum=${filter}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setTalepler(data);
        } catch (err) {
            console.error('Talepler yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }, [filter, token]);

    // İlk yükleme + 30sn fallback polling
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // SignalR: yeni talep geldiğinde anında güncelle
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'YeniTalep') {
            setNewAlert(true);
            loadData();
            setTimeout(() => setNewAlert(false), 4000);
        }
    }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleAction(id, action) {
        setActionLoading(true);
        try {
            await fetch(`${API_BASE}/talepler/${id}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedTalep(null);
            await loadData();
        } catch (err) {
            console.error(`${action} hatası:`, err);
        } finally {
            setActionLoading(false);
        }
    }

    function timeSince(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}sn`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}dk`;
        return `${Math.floor(minutes / 60)}sa`;
    }

    const statusColors = {
        Bekliyor: 'warning',
        Onaylandi: 'success',
        Reddedildi: 'error'
    };

    return (
        <Grid container spacing={3}>
            {newAlert && (
                <Grid item xs={12}>
                    <Alert severity="warning" icon={<Notifications />} onClose={() => setNewAlert(false)}>
                        Yeni sipariş talebi geldi!
                    </Alert>
                </Grid>
            )}
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4">Sipariş Talepleri</Typography>
                            <Typography variant="body2" color="text.secondary">
                                QR menüden gelen müşteri sipariş talepleri
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title={connected ? 'Canlı bağlı' : 'Canlı bağlantı yok (polling aktif)'}>
                                <Chip
                                    size="small"
                                    icon={connected ? <WifiTethering sx={{ fontSize: '14px !important' }} /> : <WifiOff sx={{ fontSize: '14px !important' }} />}
                                    label={connected ? 'Canlı' : 'Offline'}
                                    color={connected ? 'success' : 'default'}
                                    variant="outlined"
                                />
                            </Tooltip>
                            {['Bekliyor', 'Onaylandi', 'Reddedildi'].map(d => (
                                <Chip
                                    key={d}
                                    label={d}
                                    color={filter === d ? statusColors[d] : 'default'}
                                    variant={filter === d ? 'filled' : 'outlined'}
                                    onClick={() => setFilter(d)}
                                />
                            ))}
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            {loading ? (
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                </Grid>
            ) : talepler.length === 0 ? (
                <Grid item xs={12}>
                    <Alert severity="info">Bekleyen sipariş talebi bulunmuyor.</Alert>
                </Grid>
            ) : (
                talepler.map(talep => (
                    <Grid item xs={12} sm={6} md={4} key={talep.id}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                border: talep.durum === 'Bekliyor' ? '2px solid #ff9800' : '1px solid #e0e0e0',
                                transition: 'all 0.2s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                            }}
                            onClick={() => setSelectedTalep(talep)}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Badge color="warning" variant="dot" invisible={talep.durum !== 'Bekliyor'}>
                                            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                                                {talep.masa?.charAt(0) || '?'}
                                            </Avatar>
                                        </Badge>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700}>{talep.masa}</Typography>
                                            <Typography variant="caption" color="text.secondary">{talep.salon}</Typography>
                                        </Box>
                                    </Box>
                                    <Chip label={talep.durum} size="small" color={statusColors[talep.durum]} />
                                </Box>
                                <Divider sx={{ mb: 1 }} />
                                {talep.urunler?.slice(0, 3).map((u, i) => (
                                    <Typography key={i} variant="body2" noWrap>
                                        {u.miktar}x {u.urun}
                                    </Typography>
                                ))}
                                {talep.urunler?.length > 3 && (
                                    <Typography variant="caption" color="text.secondary">
                                        +{talep.urunler.length - 3} ürün daha
                                    </Typography>
                                )}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <AccessTime sx={{ fontSize: 14 }} color="action" />
                                        <Typography variant="caption" color="text.secondary">
                                            {timeSince(talep.tarih)} önce
                                        </Typography>
                                    </Box>
                                    <Typography variant="subtitle2" color="success.main" fontWeight={700}>
                                        ₺{talep.urunler?.reduce((sum, u) => sum + u.fiyat * u.miktar, 0).toLocaleString()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))
            )}

            {/* Talep Detay Dialog */}
            <Dialog open={!!selectedTalep} onClose={() => setSelectedTalep(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5">
                            Talep #{selectedTalep?.id} - {selectedTalep?.masa}
                        </Typography>
                        <Chip label={selectedTalep?.durum} color={statusColors[selectedTalep?.durum]} />
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <List>
                        {selectedTalep?.urunler?.map((u, i) => (
                            <ListItem key={i}>
                                <ListItemText
                                    primary={u.urun}
                                    secondary={u.not && `Not: ${u.not}`}
                                />
                                <ListItemSecondaryAction>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2">{u.miktar} adet</Typography>
                                        <Typography variant="body2" fontWeight={700} color="success.main">
                                            ₺{(u.fiyat * u.miktar).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                    {selectedTalep?.musteriNotu && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            Müşteri Notu: {selectedTalep.musteriNotu}
                        </Alert>
                    )}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="h5" textAlign="right">
                            Toplam: ₺{selectedTalep?.urunler?.reduce((sum, u) => sum + u.fiyat * u.miktar, 0).toLocaleString()}
                        </Typography>
                    </Box>
                </DialogContent>
                {selectedTalep?.durum === 'Bekliyor' && (
                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Close />}
                            onClick={() => handleAction(selectedTalep.id, 'reddet')}
                            disabled={actionLoading}
                        >
                            Reddet
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<Check />}
                            onClick={() => handleAction(selectedTalep.id, 'onayla')}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <CircularProgress size={20} /> : 'Onayla'}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </Grid>
    );
}
