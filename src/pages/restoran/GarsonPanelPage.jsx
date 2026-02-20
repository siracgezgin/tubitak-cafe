import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Chip, Button, TextField,
    IconButton, Badge, Divider, CircularProgress, Snackbar,
    Alert, InputAdornment, Grid, Dialog, DialogTitle, DialogContent,
    DialogActions, Slide, Avatar, Paper, Tooltip, Table, TableBody,
    TableCell, TableHead, TableRow, TableContainer
} from '@mui/material';
import {
    Add, Remove, ShoppingCart, Send, Search, Close, ArrowBack,
    TableBar, Restaurant, Delete, Edit, LocalDining, LocalCafe,
    EventSeat, People, Timer, CheckCircle, Payment, Receipt,
    CreditCard, Money, Print, Cancel
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useSignalR } from 'hooks/useSignalR';

const API_BASE = 'http://localhost:5000/api';

const STEPS = { MASA: 1, URUN: 2, SEPET: 3 };

const SALON_ICONS = {
    'Bahçe': '🌿',
    'Teras': '☀️',
    'İç Mekan': '🏠',
    'VIP': '⭐'
};

const KAT_COLORS = {
    'Yiyecek': { bg: 'linear-gradient(135deg, #fff3e0, #ffe0b2)', border: '#ff9800', chip: 'warning', icon: '🍽️' },
    'İçecek': { bg: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', border: '#2196f3', chip: 'info', icon: '🥤' },
    'Tatlı': { bg: 'linear-gradient(135deg, #fce4ec, #f8bbd0)', border: '#e91e63', chip: 'secondary', icon: '🍰' },
    'Atıştırmalık': { bg: 'linear-gradient(135deg, #f3e5f5, #e1bee7)', border: '#9c27b0', chip: 'secondary', icon: '🥨' },
};

function getKatStyle(kat) {
    return KAT_COLORS[kat] || { bg: '#f5f5f5', border: '#9e9e9e', chip: 'default', icon: '📦' };
}

export default function GarsonPanelPage() {
    const [step, setStep] = useState(STEPS.MASA);
    const [salonlar, setSalonlar] = useState([]);
    const [masalar, setMasalar] = useState([]);
    const [menu, setMenu] = useState([]);
    const [selectedSalon, setSelectedSalon] = useState(null);
    const [selectedMasa, setSelectedMasa] = useState(null);
    const [sepet, setSepet] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedKategori, setSelectedKategori] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [itemDialog, setItemDialog] = useState({ open: false, urun: null, miktar: 1, not: '' });

    // Adisyon/Ödeme state
    const [adisyonDialog, setAdisyonDialog] = useState(false);
    const [adisyon, setAdisyon] = useState(null);
    const [adisyonLoading, setAdisyonLoading] = useState(false);
    const [odemeTutar, setOdemeTutar] = useState('');
    const [odemeProcessing, setOdemeProcessing] = useState(false);
    const [iptaling, setIptaling] = useState(null);

    const token = localStorage.getItem('cafeml_token');
    const { lastMessage } = useSignalR('garsonlar');

    useEffect(() => { loadData(); }, []);

    // SignalR: Sipariş onaylandığında masa durumunu güncelle
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'SiparisOnaylandi') {
            setSnackbar({ open: true, message: '✅ Sipariş onaylandı!', severity: 'success' });
            loadData();
            if (adisyonDialog && selectedMasa) openAdisyon(selectedMasa);
        }
    }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadData() {
        setLoading(true);
        try {
            const [salonRes, masaRes, menuRes] = await Promise.all([
                fetch(`${API_BASE}/salonlar`).then(r => r.json()),
                fetch(`${API_BASE}/masalar`).then(r => r.json()),
                fetch(`${API_BASE}/menu`).then(r => r.json())
            ]);
            setSalonlar(salonRes);
            setMasalar(masaRes);
            setMenu(menuRes);
        } catch (err) {
            setSnackbar({ open: true, message: 'Bağlantı hatası!', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }

    function openItemDialog(urun) {
        const existing = sepet.find(s => s.urunId === urun.id);
        setItemDialog({
            open: true, urun,
            miktar: existing?.miktar || 1,
            not: existing?.not || ''
        });
    }

    function confirmItem() {
        const { urun, miktar, not } = itemDialog;
        setSepet(prev => {
            const idx = prev.findIndex(s => s.urunId === urun.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], miktar, not };
                return updated;
            }
            return [...prev, { urunId: urun.id, baslik: urun.baslik, fiyat: urun.fiyat, miktar, not }];
        });
        setItemDialog({ open: false, urun: null, miktar: 1, not: '' });
    }

    function removeFromCart(urunId) {
        setSepet(prev => prev.filter(s => s.urunId !== urunId));
    }

    async function sendOrder() {
        if (!selectedMasa || sepet.length === 0) return;
        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/siparisler`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    masaId: selectedMasa.id,
                    urunler: sepet.map(s => ({ urunId: s.urunId, miktar: s.miktar, not: s.not || undefined }))
                })
            });
            const data = await res.json();
            setSepet([]);
            setStep(STEPS.MASA);
            setSelectedMasa(null);
            setSnackbar({
                open: true,
                message: `✅ Sipariş gönderildi! ${selectedMasa.baslik} • ₺${data.tutar?.toLocaleString()}`,
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({ open: true, message: 'Sipariş gönderilemedi!', severity: 'error' });
        } finally {
            setSending(false);
        }
    }

    // Dolu masaya tıklayınca adisyon aç
    async function openAdisyon(masa) {
        setSelectedMasa(masa);
        setAdisyonDialog(true);
        setAdisyonLoading(true);
        setOdemeTutar('');
        try {
            const res = await fetch(`${API_BASE}/masalar/${masa.id}/adisyon`);
            const data = await res.json();
            setAdisyon(data);
        } catch {
            setSnackbar({ open: true, message: 'Adisyon yüklenemedi', severity: 'error' });
        } finally {
            setAdisyonLoading(false);
        }
    }

    async function handleOdeme(tip) {
        if (!selectedMasa || !odemeTutar) return;
        const tutar = parseFloat(odemeTutar);
        if (isNaN(tutar) || tutar <= 0) return;
        setOdemeProcessing(true);
        try {
            const res = await fetch(`${API_BASE}/masalar/${selectedMasa.id}/odeme`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tutar, tip })
            });
            const data = await res.json();
            if (res.ok) {
                setSnackbar({ open: true, message: data.message, severity: 'success' });
                if (data.masaKapandi) {
                    setAdisyonDialog(false);
                    await loadData();
                } else {
                    await openAdisyon(selectedMasa);
                }
            } else {
                setSnackbar({ open: true, message: data.message, severity: 'error' });
            }
        } catch {
            setSnackbar({ open: true, message: 'Ödeme hatası', severity: 'error' });
        } finally {
            setOdemeProcessing(false);
        }
    }

    function handlePrintAdisyon() {
        const printContent = document.getElementById('adisyon-print');
        if (!printContent) return;
        const w = window.open('', '_blank', 'width=400,height=600');
        w.document.write(`<html><head><title>Adisyon</title>
            <style>body{font-family:monospace;padding:20px;font-size:14px}
            table{width:100%;border-collapse:collapse}
            td,th{padding:4px 8px;text-align:left;border-bottom:1px dashed #ccc}
            .center{text-align:center}.bold{font-weight:bold}
            .right{text-align:right}.line{border-top:2px solid #000;margin:8px 0}
            </style></head><body>${printContent.innerHTML}</body></html>`);
        w.document.close();
        w.print();
    }

    async function handleKalemIptal(kalemId) {
        setIptaling(kalemId);
        try {
            const res = await fetch(`${API_BASE}/siparisler/${kalemId}/iptal`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSnackbar({ open: true, message: `✅ ${data.message}`, severity: 'success' });
                await openAdisyon(selectedMasa);
            } else {
                setSnackbar({ open: true, message: data.message || 'İptal hatası', severity: 'error' });
            }
        } catch {
            setSnackbar({ open: true, message: 'Kalem iptal edilemedi', severity: 'error' });
        } finally {
            setIptaling(null);
        }
    }

    const toplam = sepet.reduce((sum, s) => sum + s.fiyat * s.miktar, 0);
    const itemCount = sepet.reduce((sum, s) => sum + s.miktar, 0);

    const masalarBySalon = {};
    masalar.forEach(m => {
        const salonAd = salonlar.find(s => s.id === m.salonId)?.ad || 'Diğer';
        if (!masalarBySalon[salonAd]) masalarBySalon[salonAd] = [];
        masalarBySalon[salonAd].push(m);
    });

    const filteredSalonlar = selectedSalon
        ? { [selectedSalon]: masalarBySalon[selectedSalon] || [] }
        : masalarBySalon;

    const allProducts = menu.flatMap(k => (k.urunler || []).map(u => ({ ...u, kategori: k.kategori })));
    const filteredProducts = allProducts
        .filter(u => !selectedKategori || u.kategori === selectedKategori)
        .filter(u => !search.trim() || u.baslik?.toLowerCase().includes(search.toLowerCase()));

    const kategoriler = [...new Set(allProducts.map(u => u.kategori))];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    // ==================== ADIM 1: MASA SEÇ ====================
    if (step === STEPS.MASA) {
        return (
            <Box sx={{ pb: 2 }}>
                {/* Hero Header */}
                <Paper
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)',
                        color: 'white', p: { xs: 2.5, md: 3.5 }, borderRadius: { xs: 0, sm: 3 }, mb: 3,
                        position: 'relative', overflow: 'hidden'
                    }}
                >
                    {/* Dekoratif daireler */}
                    <Box sx={{
                        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)'
                    }} />
                    <Box sx={{
                        position: 'absolute', bottom: -20, left: '50%', width: 80, height: 80,
                        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)'
                    }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                        <Avatar sx={{
                            width: 56, height: 56,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Restaurant sx={{ fontSize: 28 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800} letterSpacing={-0.5}>
                                Garson Paneli
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.3 }}>
                                Sipariş almak istediğiniz masayı seçin
                            </Typography>
                        </Box>
                    </Box>

                    {/* İstatistik Chips */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                        <Chip
                            icon={<EventSeat sx={{ color: 'white !important', fontSize: 16 }} />}
                            label={`${masalar.length} Masa`}
                            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 600, backdropFilter: 'blur(4px)' }}
                        />
                        <Chip
                            icon={<People sx={{ color: 'white !important', fontSize: 16 }} />}
                            label={`${masalar.filter(m => m.durum === 'Dolu').length} Dolu`}
                            sx={{ bgcolor: 'rgba(255,152,0,0.3)', color: 'white', fontWeight: 600 }}
                        />
                        <Chip
                            icon={<CheckCircle sx={{ color: 'white !important', fontSize: 16 }} />}
                            label={`${masalar.filter(m => m.durum !== 'Dolu').length} Boş`}
                            sx={{ bgcolor: 'rgba(76,175,80,0.3)', color: 'white', fontWeight: 600 }}
                        />
                    </Box>
                </Paper>

                {/* Salon Filtreleri */}
                <Box sx={{
                    display: 'flex', gap: 1, mb: 3, px: { xs: 1, sm: 0 },
                    overflowX: 'auto', flexWrap: 'nowrap',
                    '&::-webkit-scrollbar': { height: 0 }
                }}>
                    <Chip
                        label="🏪 Tüm Salonlar"
                        color={!selectedSalon ? 'primary' : 'default'}
                        variant={!selectedSalon ? 'filled' : 'outlined'}
                        onClick={() => setSelectedSalon(null)}
                        sx={{
                            fontWeight: 600, py: 2.5, px: 0.5, fontSize: '0.85rem',
                            borderRadius: 2,
                            ...(selectedSalon ? {} : {
                                boxShadow: '0 2px 8px rgba(25,118,210,0.3)'
                            })
                        }}
                    />
                    {salonlar.map(s => (
                        <Chip
                            key={s.id}
                            label={`${SALON_ICONS[s.ad] || '🏠'} ${s.ad}`}
                            color={selectedSalon === s.ad ? 'primary' : 'default'}
                            variant={selectedSalon === s.ad ? 'filled' : 'outlined'}
                            onClick={() => setSelectedSalon(selectedSalon === s.ad ? null : s.ad)}
                            sx={{
                                fontWeight: 600, py: 2.5, px: 0.5, fontSize: '0.85rem',
                                borderRadius: 2, whiteSpace: 'nowrap',
                                ...(selectedSalon === s.ad ? {
                                    boxShadow: '0 2px 8px rgba(25,118,210,0.3)'
                                } : {})
                            }}
                        />
                    ))}
                </Box>

                {/* Salon Grupları ile Masalar */}
                {Object.entries(filteredSalonlar).map(([salonAd, salonMasalar]) => (
                    <Box key={salonAd} sx={{ mb: 4 }}>
                        {/* Salon Başlık */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            mb: 2, px: { xs: 1, sm: 0 }
                        }}>
                            <Typography variant="h6" fontWeight={700} color="primary.dark">
                                {SALON_ICONS[salonAd] || '🏠'} {salonAd}
                            </Typography>
                            <Chip
                                label={`${salonMasalar.length} masa`}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', ml: 1 }} />
                        </Box>

                        {/* Masa Kartları */}
                        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ px: { xs: 0.5, sm: 0 } }}>
                            {salonMasalar.map(m => {
                                const isDolu = m.durum === 'Dolu';
                                return (
                                    <Grid item xs={6} sm={4} md={3} lg={2} key={m.id}>
                                        <Card
                                            onClick={() => {
                                                console.log('MASA CLICK:', m.id, 'durum:', m.durum, 'isDolu:', isDolu);
                                                if (isDolu) {
                                                    openAdisyon(m);
                                                } else {
                                                    setSelectedMasa(m);
                                                    setStep(STEPS.URUN);
                                                }
                                            }}
                                            sx={{
                                                cursor: 'pointer', borderRadius: 3, overflow: 'hidden',
                                                border: '2px solid',
                                                borderColor: isDolu ? '#ff9800' : '#4caf50',
                                                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: isDolu
                                                        ? '0 8px 25px rgba(255,152,0,0.25)'
                                                        : '0 8px 25px rgba(76,175,80,0.25)'
                                                },
                                                '&:active': { transform: 'scale(0.96)' }
                                            }}
                                        >
                                            {/* Üst renk şeridi */}
                                            <Box sx={{
                                                height: 6,
                                                background: isDolu
                                                    ? 'linear-gradient(90deg, #ff9800, #ffc107)'
                                                    : 'linear-gradient(90deg, #4caf50, #81c784)'
                                            }} />

                                            <CardContent sx={{
                                                textAlign: 'center', p: { xs: 1.5, sm: 2 },
                                                '&:last-child': { pb: { xs: 1.5, sm: 2 } }
                                            }}>
                                                {/* Masa İkonu */}
                                                <Box sx={{
                                                    width: 52, height: 52, borderRadius: '50%',
                                                    bgcolor: isDolu ? '#fff3e0' : '#e8f5e9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    mx: 'auto', mb: 1.2
                                                }}>
                                                    <TableBar sx={{
                                                        fontSize: 26,
                                                        color: isDolu ? '#e65100' : '#2e7d32'
                                                    }} />
                                                </Box>

                                                {/* Masa Adı */}
                                                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                                                    {m.baslik}
                                                </Typography>

                                                {/* Durum */}
                                                <Chip
                                                    label={isDolu ? '🔴 Dolu' : '🟢 Boş'}
                                                    size="small"
                                                    sx={{
                                                        mt: 1, fontWeight: 700, fontSize: '0.72rem',
                                                        bgcolor: isDolu ? '#fff3e0' : '#e8f5e9',
                                                        color: isDolu ? '#e65100' : '#2e7d32',
                                                        border: '1px solid',
                                                        borderColor: isDolu ? '#ffcc80' : '#a5d6a7'
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                ))}

                <Snackbar open={snackbar.open} autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        );
    }

    // ==================== ADIM 2: ÜRÜN EKLE ====================
    if (step === STEPS.URUN) {
        return (
            <Box sx={{ pb: 12 }}>
                {/* Sticky Header */}
                <Paper
                    elevation={3}
                    sx={{
                        position: 'sticky', top: 0, zIndex: 10,
                        background: 'linear-gradient(135deg, #0d47a1, #1976d2, #42a5f5)',
                        color: 'white', p: 2, borderRadius: { xs: 0, sm: 3 }, mb: 2
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)' }}
                                onClick={() => { setStep(STEPS.MASA); setSelectedMasa(null); setSepet([]); }}>
                                <ArrowBack />
                            </IconButton>
                            <Box>
                                <Typography variant="h6" fontWeight={800}>
                                    {selectedMasa?.baslik}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    {salonlar.find(s => s.id === selectedMasa?.salonId)?.ad} • Ürün ekleyin
                                </Typography>
                            </Box>
                        </Box>
                        {sepet.length > 0 && (
                            <Badge badgeContent={itemCount} color="error">
                                <IconButton
                                    sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                                    onClick={() => setStep(STEPS.SEPET)}>
                                    <ShoppingCart />
                                </IconButton>
                            </Badge>
                        )}
                    </Box>

                    {/* Arama */}
                    <TextField
                        fullWidth size="small" placeholder="Ürün ara..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        sx={{
                            mt: 1.5,
                            '& .MuiInputBase-root': {
                                bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2.5,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }
                        }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}><Close fontSize="small" /></IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Kategori Chips */}
                    <Box sx={{
                        display: 'flex', gap: 0.8, mt: 1.5, overflowX: 'auto',
                        '&::-webkit-scrollbar': { height: 0 }
                    }}>
                        <Chip
                            label="Tümü" size="small"
                            sx={{
                                bgcolor: !selectedKategori ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                                color: !selectedKategori ? 'primary.main' : 'white',
                                fontWeight: 700, fontSize: '0.78rem'
                            }}
                            onClick={() => setSelectedKategori('')}
                        />
                        {kategoriler.map(k => {
                            const ks = getKatStyle(k);
                            return (
                                <Chip
                                    key={k} label={`${ks.icon} ${k}`} size="small"
                                    sx={{
                                        bgcolor: selectedKategori === k ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                                        color: selectedKategori === k ? 'primary.main' : 'white',
                                        fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap'
                                    }}
                                    onClick={() => setSelectedKategori(selectedKategori === k ? '' : k)}
                                />
                            );
                        })}
                    </Box>
                </Paper>

                {/* Ürün Grid */}
                <Grid container spacing={1.5} sx={{ px: { xs: 1, sm: 0 } }}>
                    {filteredProducts.length === 0 ? (
                        <Grid item xs={12}>
                            <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                                {search ? `"${search}" için sonuç bulunamadı` : 'Bu kategoride ürün yok'}
                            </Typography>
                        </Grid>
                    ) : (
                        filteredProducts.map((urun, i) => {
                            const inCart = sepet.find(s => s.urunId === urun.id);
                            const ks = getKatStyle(urun.kategori);
                            return (
                                <Grid item xs={12} sm={6} md={4} key={urun.id || i}>
                                    <Card
                                        onClick={() => openItemDialog(urun)}
                                        sx={{
                                            cursor: 'pointer', borderRadius: 2.5,
                                            border: inCart ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                            bgcolor: inCart ? '#e8f0fe' : 'white',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { boxShadow: 3, borderColor: '#90caf9' },
                                            '&:active': { transform: 'scale(0.98)' }
                                        }}
                                    >
                                        <CardContent sx={{
                                            display: 'flex', alignItems: 'center',
                                            p: 2, '&:last-child': { pb: 2 }, gap: 2
                                        }}>
                                            {/* Kategori ikonu */}
                                            <Avatar sx={{
                                                width: 48, height: 48,
                                                bgcolor: inCart ? '#bbdefb' : '#f5f5f5',
                                                fontSize: '1.4rem'
                                            }}>
                                                {ks.icon}
                                            </Avatar>

                                            {/* Ürün bilgisi */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                    <Typography variant="body1" fontWeight={700} noWrap>
                                                        {urun.baslik}
                                                    </Typography>
                                                    {inCart && (
                                                        <Chip label={`×${inCart.miktar}`} size="small" color="primary"
                                                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 800 }} />
                                                    )}
                                                </Box>
                                                <Chip
                                                    label={urun.kategori} size="small"
                                                    sx={{
                                                        mt: 0.3, height: 20, fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        bgcolor: ks.bg, color: ks.border, border: `1px solid ${ks.border}22`
                                                    }}
                                                />
                                            </Box>

                                            {/* Fiyat */}
                                            <Typography variant="h6" fontWeight={800} color="success.dark"
                                                sx={{ whiteSpace: 'nowrap' }}>
                                                ₺{urun.fiyat}
                                            </Typography>

                                            {/* Add buton */}
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    bgcolor: inCart ? 'primary.main' : 'primary.light',
                                                    color: 'white', width: 40, height: 40,
                                                    '&:hover': { bgcolor: 'primary.dark' },
                                                    boxShadow: 2
                                                }}
                                                onClick={e => { e.stopPropagation(); openItemDialog(urun); }}
                                            >
                                                <Add />
                                            </IconButton>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })
                    )}
                </Grid>

                {/* Bottom Bar - Sepete Git */}
                {sepet.length > 0 && (
                    <Paper
                        elevation={8}
                        sx={{
                            position: 'fixed', bottom: 0, left: 0, right: 0,
                            p: 2, bgcolor: 'white', zIndex: 20,
                            borderTop: '1px solid #e0e0e0'
                        }}
                    >
                        <Button
                            fullWidth variant="contained" size="large"
                            onClick={() => setStep(STEPS.SEPET)}
                            sx={{
                                py: 1.6, borderRadius: 3, fontWeight: 800, fontSize: '1rem',
                                background: 'linear-gradient(135deg, #1b5e20, #43a047)',
                                boxShadow: '0 4px 15px rgba(46,125,50,0.35)',
                                '&:hover': { background: 'linear-gradient(135deg, #1b5e20, #2e7d32)' }
                            }}
                        >
                            <Badge badgeContent={itemCount} color="error" sx={{ mr: 2 }}>
                                <ShoppingCart />
                            </Badge>
                            Sepeti Gör • ₺{toplam.toLocaleString()}
                        </Button>
                    </Paper>
                )}

                {/* Adet/Not Dialog */}
                <Dialog
                    open={itemDialog.open}
                    onClose={() => setItemDialog({ ...itemDialog, open: false })}
                    maxWidth="xs" fullWidth
                    TransitionComponent={Slide}
                    TransitionProps={{ direction: 'up' }}
                    PaperProps={{ sx: { borderRadius: 3 } }}
                >
                    <DialogTitle sx={{ pb: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800}>{itemDialog.urun?.baslik}</Typography>
                                <Chip
                                    label={`₺${itemDialog.urun?.fiyat}`}
                                    color="success" size="small"
                                    sx={{ fontWeight: 700, mt: 0.5 }}
                                />
                            </Box>
                            <IconButton onClick={() => setItemDialog({ ...itemDialog, open: false })}>
                                <Close />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 3, my: 3
                        }}>
                            <IconButton
                                color="error"
                                onClick={() => setItemDialog(p => ({ ...p, miktar: Math.max(1, p.miktar - 1) }))}
                                sx={{
                                    border: '2px solid', borderColor: 'error.light',
                                    width: 52, height: 52
                                }}
                            >
                                <Remove />
                            </IconButton>
                            <Typography variant="h2" fontWeight={800} sx={{ minWidth: 60, textAlign: 'center' }}>
                                {itemDialog.miktar}
                            </Typography>
                            <IconButton
                                color="primary"
                                onClick={() => setItemDialog(p => ({ ...p, miktar: p.miktar + 1 }))}
                                sx={{
                                    border: '2px solid', borderColor: 'primary.light',
                                    width: 52, height: 52
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Box>

                        <TextField
                            fullWidth label="Sipariş Notu (Opsiyonel)"
                            placeholder="Örn: Az pişmiş, buzlu, sos olmasın..."
                            value={itemDialog.not}
                            onChange={e => setItemDialog(p => ({ ...p, not: e.target.value }))}
                            multiline rows={2}
                            sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, pt: 1 }}>
                        <Button
                            fullWidth variant="contained" size="large"
                            onClick={confirmItem}
                            sx={{
                                py: 1.5, borderRadius: 3, fontWeight: 800, fontSize: '1rem',
                                background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
                                boxShadow: '0 4px 12px rgba(25,118,210,0.35)'
                            }}
                        >
                            <Add sx={{ mr: 0.5 }} />
                            Sepete Ekle • ₺{((itemDialog.urun?.fiyat || 0) * itemDialog.miktar).toLocaleString()}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={3000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        );
    }

    // ==================== ADIM 3: SEPET / ONAY ====================
    return (
        <Box sx={{ pb: 2, minHeight: '80vh' }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)',
                    color: 'white', p: { xs: 2.5, md: 3 }, borderRadius: { xs: 0, sm: 3 }, mb: 3,
                    position: 'relative', overflow: 'hidden'
                }}
            >
                <Box sx={{
                    position: 'absolute', top: -20, right: -20, width: 100, height: 100,
                    borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)'
                }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)' }}
                        onClick={() => setStep(STEPS.URUN)}>
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h5" fontWeight={800}>
                            <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Sipariş Onay
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            {selectedMasa?.baslik} • {salonlar.find(s => s.id === selectedMasa?.salonId)?.ad}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Sepet Listesi */}
            <Box sx={{ px: { xs: 1, sm: 0 } }}>
                {sepet.map((item, i) => (
                    <Card key={i} sx={{
                        mb: 1.5, borderRadius: 3, border: '1px solid #e0e0e0',
                        transition: 'all 0.2s ease',
                        '&:hover': { boxShadow: 2 }
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={800}>
                                        {item.baslik}
                                    </Typography>
                                    {item.not && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.3 }}>
                                            📝 {item.not}
                                        </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
                                        <Box sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.5,
                                            border: '1px solid #e0e0e0', borderRadius: 2, px: 0.5
                                        }}>
                                            <IconButton size="small" color="error"
                                                onClick={() => {
                                                    if (item.miktar <= 1) removeFromCart(item.urunId);
                                                    else setSepet(p => p.map(s => s.urunId === item.urunId ? { ...s, miktar: s.miktar - 1 } : s));
                                                }}>
                                                <Remove fontSize="small" />
                                            </IconButton>
                                            <Typography fontWeight={800} sx={{ minWidth: 28, textAlign: 'center' }}>
                                                {item.miktar}
                                            </Typography>
                                            <IconButton size="small" color="primary"
                                                onClick={() => setSepet(p => p.map(s => s.urunId === item.urunId ? { ...s, miktar: s.miktar + 1 } : s))}>
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            ₺{item.fiyat} × {item.miktar}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="h6" fontWeight={800} color="success.dark">
                                        ₺{(item.fiyat * item.miktar).toLocaleString()}
                                    </Typography>
                                    <IconButton size="small" color="error"
                                        onClick={() => removeFromCart(item.urunId)}
                                        sx={{ mt: 0.5 }}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}

                {/* Daha ürün ekle */}
                <Button fullWidth variant="outlined" size="large" startIcon={<Add />}
                    onClick={() => setStep(STEPS.URUN)}
                    sx={{ mt: 1, mb: 2, borderRadius: 3, borderStyle: 'dashed', py: 1.5, fontWeight: 700 }}>
                    Daha Ürün Ekle
                </Button>

                {/* Toplam */}
                <Card sx={{ borderRadius: 3, bgcolor: '#f8f9fa', mb: 2.5, border: '1px solid #e0e0e0' }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1" color="text.secondary">Ürün Sayısı</Typography>
                            <Typography variant="body1" fontWeight={700}>{itemCount} adet</Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h5" fontWeight={800}>Toplam</Typography>
                            <Typography variant="h5" fontWeight={800} color="success.dark">
                                ₺{toplam.toLocaleString()}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Gönder */}
                <Button
                    fullWidth variant="contained" size="large"
                    startIcon={sending ? <CircularProgress size={22} color="inherit" /> : <Send />}
                    onClick={sendOrder}
                    disabled={sending || sepet.length === 0}
                    sx={{
                        py: 2, borderRadius: 3, fontWeight: 800, fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #e65100, #ff9800)',
                        boxShadow: '0 4px 15px rgba(230,81,0,0.35)',
                        '&:hover': { background: 'linear-gradient(135deg, #bf360c, #f57c00)' }
                    }}
                >
                    {sending ? 'Gönderiliyor...' : 'Siparişi Gönder'}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block"
                    textAlign="center" sx={{ mt: 1.5 }}>
                    Sipariş onay bekleyecek, onaylandığında mutfak/bar ekranına düşecektir
                </Typography>
            </Box>

            {/* ========== ADİSYON / ÖDEME DİALOG ========== */}
            <Dialog open={adisyonDialog} onClose={() => setAdisyonDialog(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
                <DialogTitle sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff', py: 2
                }}>
                    <Box>
                        <Typography variant="h5" fontWeight={800}>
                            <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Masa {selectedMasa?.masaNo} — Adisyon
                        </Typography>
                        {adisyon?.acilisSaati && (
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                Açılış: {new Date(adisyon.acilisSaati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={() => setAdisyonDialog(false)} sx={{ color: '#fff' }}><Close /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {adisyonLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={48} />
                        </Box>
                    ) : adisyon?.aktif ? (
                        <Box>
                            {/* Sipariş Kalemleri */}
                            <Box sx={{ p: 2.5 }}>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                    📋 Sipariş Kalemleri
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Ürün</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Adet</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Birim</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Toplam</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, width: 48 }}></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {adisyon.kalemler?.map((k, i) => (
                                                <TableRow key={k.id || i} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>{k.urun}</Typography>
                                                        {k.sipNotu && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                📝 {k.sipNotu}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center">{k.miktar}</TableCell>
                                                    <TableCell align="right">₺{k.birimFiyat?.toFixed(2)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>₺{k.tutari?.toFixed(2)}</TableCell>
                                                    <TableCell align="center" sx={{ p: 0.5 }}>
                                                        <Tooltip title="Kalemi iptal et">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={iptaling === k.id}
                                                                    onClick={() => handleKalemIptal(k.id)}
                                                                    sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                                                                >
                                                                    {iptaling === k.id
                                                                        ? <CircularProgress size={16} color="error" />
                                                                        : <Cancel sx={{ fontSize: 18 }} />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            <Divider />

                            {/* Toplam Özeti */}
                            <Box sx={{ p: 2.5, bgcolor: '#fafafa' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#e3f2fd' }}>
                                            <Typography variant="caption" color="text.secondary">Toplam</Typography>
                                            <Typography variant="h5" fontWeight={800} color="primary">
                                                ₺{adisyon.toplam?.toFixed(2)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#e8f5e9' }}>
                                            <Typography variant="caption" color="text.secondary">Ödenen</Typography>
                                            <Typography variant="h5" fontWeight={800} color="success.main">
                                                ₺{adisyon.odenen?.toFixed(2)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Paper sx={{
                                            p: 2, textAlign: 'center', borderRadius: 2,
                                            bgcolor: adisyon.kalan > 0 ? '#fff3e0' : '#e8f5e9'
                                        }}>
                                            <Typography variant="caption" color="text.secondary">Kalan</Typography>
                                            <Typography variant="h5" fontWeight={800}
                                                color={adisyon.kalan > 0 ? 'warning.main' : 'success.main'}>
                                                ₺{adisyon.kalan?.toFixed(2)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>

                            {adisyon.kalan > 0 && (
                                <>
                                    <Divider />
                                    {/* Ödeme Girişi */}
                                    <Box sx={{ p: 2.5 }}>
                                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                            💳 Ödeme Al
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                                            <TextField
                                                label="Tutar (₺)" type="number" size="small"
                                                value={odemeTutar}
                                                onChange={e => setOdemeTutar(e.target.value)}
                                                sx={{ flex: 1 }}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                                                    sx: { borderRadius: 2 }
                                                }}
                                            />
                                            <Button variant="outlined" size="small"
                                                onClick={() => setOdemeTutar(adisyon.kalan?.toFixed(2))}
                                                sx={{ borderRadius: 2, fontWeight: 700, minWidth: 70 }}>
                                                Tümü
                                            </Button>
                                        </Box>
                                        <Grid container spacing={1.5}>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="contained" size="large"
                                                    startIcon={odemeProcessing ? <CircularProgress size={20} color="inherit" /> : <Money />}
                                                    onClick={() => handleOdeme('Nakit')}
                                                    disabled={odemeProcessing || !odemeTutar}
                                                    sx={{
                                                        py: 1.5, borderRadius: 2, fontWeight: 700,
                                                        background: 'linear-gradient(135deg, #2e7d32, #4caf50)',
                                                        '&:hover': { background: 'linear-gradient(135deg, #1b5e20, #388e3c)' }
                                                    }}>
                                                    NAKİT ÖDE
                                                </Button>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="contained" size="large"
                                                    startIcon={odemeProcessing ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
                                                    onClick={() => handleOdeme('Kredi Kartı')}
                                                    disabled={odemeProcessing || !odemeTutar}
                                                    sx={{
                                                        py: 1.5, borderRadius: 2, fontWeight: 700,
                                                        background: 'linear-gradient(135deg, #e65100, #ff9800)',
                                                        '&:hover': { background: 'linear-gradient(135deg, #bf360c, #f57c00)' }
                                                    }}>
                                                    KART İLE ÖDE
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </>
                            )}

                            {/* Ödeme Geçmişi */}
                            {adisyon.odemeler?.length > 0 && (
                                <Box sx={{ px: 2.5, pb: 2 }}>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                        📜 Ödeme Geçmişi
                                    </Typography>
                                    {adisyon.odemeler.map((o, i) => (
                                        <Box key={o.id || i} sx={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', py: 0.5
                                        }}>
                                            <Chip
                                                icon={o.tip === 'Nakit' ? <Money sx={{ fontSize: 16 }} /> : <CreditCard sx={{ fontSize: 16 }} />}
                                                label={o.tip} size="small" variant="outlined"
                                                color={o.tip === 'Nakit' ? 'success' : 'warning'}
                                            />
                                            <Typography variant="body2" fontWeight={700} color="success.main">
                                                ₺{o.tutari?.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            {/* Yazdırma için gizli içerik */}
                            <Box id="adisyon-print" sx={{ display: 'none' }}>
                                <div className="center bold" style={{ fontSize: 18 }}>CafeML</div>
                                <div className="center">Adisyon</div>
                                <div className="line" />
                                <div>Masa: {selectedMasa?.masaNo}</div>
                                <div>Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
                                <div>Saat: {new Date().toLocaleTimeString('tr-TR')}</div>
                                <div className="line" />
                                <table>
                                    <thead><tr><th>Ürün</th><th>Ad.</th><th className="right">Tutar</th></tr></thead>
                                    <tbody>
                                        {adisyon.kalemler?.map((k, i) => (
                                            <tr key={i}><td>{k.urun}</td><td>{k.miktar}</td><td className="right">₺{k.tutari?.toFixed(2)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="line" />
                                <div className="bold right">TOPLAM: ₺{adisyon.toplam?.toFixed(2)}</div>
                                <div className="center" style={{ marginTop: 16 }}>Afiyet Olsun! 🙏</div>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">Bu masada aktif adisyon yok</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1, bgcolor: '#f5f5f5' }}>
                    <Button variant="outlined" startIcon={<Add />}
                        onClick={() => { setAdisyonDialog(false); setStep(STEPS.URUN); }}
                        sx={{ borderRadius: 2 }}>
                        Sipariş Ekle
                    </Button>
                    <Button variant="outlined" startIcon={<Print />}
                        onClick={handlePrintAdisyon}
                        sx={{ borderRadius: 2 }}>
                        Adisyon Yazdır
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" color="error"
                        onClick={() => setAdisyonDialog(false)}
                        sx={{ borderRadius: 2 }}>
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
