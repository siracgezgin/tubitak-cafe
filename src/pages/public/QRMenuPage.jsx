import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box, Typography, Card, CardContent, CardMedia, Button, Chip,
    IconButton, Badge, Drawer, Divider, TextField, CircularProgress,
    Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    Slide, InputAdornment
} from '@mui/material';
import {
    Add, Remove, ShoppingCart, Send, Close, Search, Restaurant,
    LocationOn, Delete
} from '@mui/icons-material';

const API_BASE = 'http://localhost:5000/api';

export default function QRMenuPage() {
    const { masaId, qrKod } = useParams();
    const [masaInfo, setMasaInfo] = useState(null);
    const [kategoriler, setKategoriler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedKategori, setSelectedKategori] = useState('Tümü');
    const [search, setSearch] = useState('');
    const [sepet, setSepet] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [itemDialog, setItemDialog] = useState({ open: false, urun: null, miktar: 1, not: '' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadMenu();
    }, [masaId, qrKod]);

    async function loadMenu() {
        setLoading(true);
        try {
            const url = qrKod
                ? `${API_BASE}/qr/kod/${qrKod}`
                : `${API_BASE}/qr/${masaId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Menü yüklenemedi');
            const data = await res.json();
            setMasaInfo(data.masa);
            setKategoriler(data.kategoriler || []);
        } catch (err) {
            setError('Menü yüklenemedi. QR kodu kontrol edin.');
        } finally {
            setLoading(false);
        }
    }

    const allUrunler = useMemo(() =>
        kategoriler.flatMap(k => (k.urunler || []).map(u => ({ ...u, kategoriAdi: k.kategori }))),
        [kategoriler]
    );

    const kategoriLabels = useMemo(() =>
        ['Tümü', ...kategoriler.map(k => k.kategori)],
        [kategoriler]
    );

    const filteredUrunler = useMemo(() => {
        let result = selectedKategori === 'Tümü'
            ? allUrunler
            : allUrunler.filter(u => u.kategoriAdi === selectedKategori);
        if (search.trim()) {
            result = result.filter(u => u.baslik?.toLowerCase().includes(search.toLowerCase()));
        }
        return result;
    }, [allUrunler, selectedKategori, search]);

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
        setSnackbar({ open: true, message: 'Sepete eklendi ✓', severity: 'success' });
    }

    function removeFromCart(urunId) {
        setSepet(prev => prev.filter(s => s.urunId !== urunId));
    }

    async function submitOrder() {
        if (!masaInfo || sepet.length === 0) return;
        setSending(true);
        try {
            const mId = masaInfo.id;
            const res = await fetch(`${API_BASE}/qr/${mId}/talep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    urunler: sepet.map(s => ({ urunId: s.urunId, miktar: s.miktar, not: s.not || undefined })),
                    not: ''
                })
            });
            if (res.ok) {
                setOrderSuccess(true);
                setSepet([]);
                setCartOpen(false);
            } else {
                setSnackbar({ open: true, message: 'Sipariş gönderilemedi', severity: 'error' });
            }
        } catch (err) {
            setSnackbar({ open: true, message: 'Bağlantı hatası', severity: 'error' });
        } finally {
            setSending(false);
        }
    }

    const toplam = sepet.reduce((sum, s) => sum + s.fiyat * s.miktar, 0);
    const itemCount = sepet.reduce((sum, s) => sum + s.miktar, 0);

    // Loading
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    // Error
    if (error) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8f9fa', p: 3 }}>
                <Card sx={{ maxWidth: 400, textAlign: 'center', p: 4, borderRadius: 3 }}>
                    <Typography variant="h5" color="error" gutterBottom>❌ Hata</Typography>
                    <Typography color="text.secondary">{error}</Typography>
                </Card>
            </Box>
        );
    }

    // Sipariş Başarılı
    if (orderSuccess) {
        return (
            <Box sx={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: '100vh', bgcolor: '#f8f9fa', p: 3
            }}>
                <Card sx={{ maxWidth: 420, textAlign: 'center', p: 4, borderRadius: 3, boxShadow: 6 }}>
                    <Typography variant="h1" sx={{ mb: 2 }}>🎉</Typography>
                    <Typography variant="h4" fontWeight={700} gutterBottom>Siparişiniz Alındı!</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        Siparişiniz mutfak ekranına düştü.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Garson onayladığında hazırlanmaya başlayacak.
                    </Typography>
                    <Chip icon={<LocationOn />} label={`${masaInfo?.baslik} • ${masaInfo?.salon}`} color="primary" sx={{ mb: 3, fontSize: '1rem', py: 2.5 }} />
                    <br />
                    <Button variant="contained" size="large" onClick={() => setOrderSuccess(false)}
                        sx={{ borderRadius: 2, px: 4, background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}>
                        Menüye Dön
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', pb: sepet.length > 0 ? 12 : 2 }}>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1a237e, #1976d2)',
                color: 'white', px: 2, py: 2.5, position: 'sticky', top: 0, zIndex: 10
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, mx: 'auto' }}>
                    <Box>
                        <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                            <Restaurant sx={{ mr: 1, verticalAlign: 'middle' }} />
                            CafeML
                        </Typography>
                    </Box>
                    {sepet.length > 0 && (
                        <IconButton sx={{ color: 'white' }} onClick={() => setCartOpen(true)}>
                            <Badge badgeContent={itemCount} color="error">
                                <ShoppingCart />
                            </Badge>
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Masa Bilgisi */}
            <Box sx={{
                bgcolor: 'white', py: 1.5, px: 2, borderBottom: '1px solid #e0e0e0',
                position: 'sticky', top: 56, zIndex: 9
            }}>
                <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <LocationOn sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="body1" fontWeight={600}>{masaInfo?.baslik}</Typography>
                    <Typography variant="body2" color="text.secondary">• {masaInfo?.salon}</Typography>
                </Box>
            </Box>

            {/* Arama */}
            <Box sx={{ px: 2, pt: 2, maxWidth: 900, mx: 'auto' }}>
                <TextField
                    fullWidth size="small" placeholder="Ürün ara..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ '& .MuiInputBase-root': { borderRadius: 3, bgcolor: 'white' } }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: search && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearch('')}><Close fontSize="small" /></IconButton>
                            </InputAdornment>
                        )
                    }}
                />
            </Box>

            {/* Kategori Chips */}
            <Box sx={{
                display: 'flex', gap: 1, px: 2, py: 1.5,
                overflowX: 'auto', maxWidth: 900, mx: 'auto',
                '&::-webkit-scrollbar': { display: 'none' }
            }}>
                {kategoriLabels.map(k => (
                    <Chip
                        key={k} label={k}
                        color={selectedKategori === k ? 'primary' : 'default'}
                        variant={selectedKategori === k ? 'filled' : 'outlined'}
                        onClick={() => setSelectedKategori(k)}
                        sx={{
                            fontWeight: 600, borderRadius: 3,
                            flexShrink: 0,
                            px: 1
                        }}
                    />
                ))}
            </Box>

            {/* Ürün Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 1.5, px: 2, maxWidth: 900, mx: 'auto', pb: 2
            }}>
                {filteredUrunler.map((urun, i) => {
                    const inCart = sepet.find(s => s.urunId === urun.id);
                    return (
                        <Card
                            key={urun.id || i}
                            onClick={() => openItemDialog(urun)}
                            sx={{
                                cursor: 'pointer', borderRadius: 3,
                                transition: 'all 0.2s',
                                border: inCart ? '2px solid #1976d2' : '1px solid #e8e8e8',
                                '&:hover': { boxShadow: 4 },
                                '&:active': { transform: 'scale(0.97)' },
                                position: 'relative',
                                overflow: 'visible'
                            }}
                        >
                            {/* Ürün Resmi Placeholder */}
                            <Box sx={{
                                height: 120, bgcolor: '#f0f0f0', borderRadius: '12px 12px 0 0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {urun.resim ? (
                                    <CardMedia component="img" image={urun.resim} sx={{ height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Restaurant sx={{ fontSize: 40, color: '#bbb' }} />
                                )}
                            </Box>

                            {/* Fiyat Badge */}
                            <Chip
                                label={`₺${urun.fiyat}`}
                                size="small"
                                sx={{
                                    position: 'absolute', top: 100, right: 8,
                                    bgcolor: '#ff9800', color: 'white', fontWeight: 700,
                                    fontSize: '0.8rem', height: 28
                                }}
                            />

                            {/* İçerik */}
                            <CardContent sx={{ p: 1.5, pt: 2.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {urun.baslik}
                                </Typography>

                                <Button
                                    fullWidth variant={inCart ? 'contained' : 'outlined'}
                                    size="small"
                                    startIcon={<ShoppingCart sx={{ fontSize: 16 }} />}
                                    onClick={(e) => { e.stopPropagation(); openItemDialog(urun); }}
                                    sx={{
                                        mt: 1, borderRadius: 2, textTransform: 'none',
                                        fontWeight: 600, fontSize: '0.75rem',
                                        ...(inCart ? {
                                            background: 'linear-gradient(135deg, #1976d2, #42a5f5)'
                                        } : {})
                                    }}
                                >
                                    {inCart ? `Sepette (${inCart.miktar})` : 'Sepete Ekle'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>

            {/* Bottom Bar - Sepet */}
            {sepet.length > 0 && (
                <Box sx={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    bgcolor: 'white', borderTop: '1px solid #e0e0e0',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', p: 2, zIndex: 20
                }}>
                    <Button
                        fullWidth variant="contained" size="large"
                        onClick={() => setCartOpen(true)}
                        sx={{
                            py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: '1rem',
                            background: 'linear-gradient(135deg, #e65100, #ff9800)',
                            maxWidth: 500, mx: 'auto', display: 'flex'
                        }}
                    >
                        <Badge badgeContent={itemCount} color="error" sx={{ mr: 2 }}>
                            <ShoppingCart />
                        </Badge>
                        Sepetim • ₺{toplam.toLocaleString()}
                    </Button>
                </Box>
            )}

            {/* Adet/Not Dialog */}
            <Dialog
                open={itemDialog.open}
                onClose={() => setItemDialog({ ...itemDialog, open: false })}
                maxWidth="xs" fullWidth
                TransitionComponent={Slide}
                TransitionProps={{ direction: 'up' }}
            >
                <DialogTitle sx={{ pb: 0 }}>
                    <Typography variant="h6" fontWeight={700}>{itemDialog.urun?.baslik}</Typography>
                    <Chip label={`₺${itemDialog.urun?.fiyat}`} color="warning" sx={{ fontWeight: 700 }} />
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 3 }}>
                        <IconButton color="error"
                            onClick={() => setItemDialog(p => ({ ...p, miktar: Math.max(1, p.miktar - 1) }))}
                            sx={{ border: '2px solid', borderColor: 'error.light', width: 48, height: 48 }}>
                            <Remove />
                        </IconButton>
                        <Typography variant="h3" fontWeight={700} sx={{ minWidth: 50, textAlign: 'center' }}>
                            {itemDialog.miktar}
                        </Typography>
                        <IconButton color="primary"
                            onClick={() => setItemDialog(p => ({ ...p, miktar: p.miktar + 1 }))}
                            sx={{ border: '2px solid', borderColor: 'primary.light', width: 48, height: 48 }}>
                            <Add />
                        </IconButton>
                    </Box>
                    <TextField
                        fullWidth label="Sipariş Notu (Örn: Acısız, Soslu)"
                        value={itemDialog.not}
                        onChange={e => setItemDialog(p => ({ ...p, not: e.target.value }))}
                        multiline rows={2}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button fullWidth variant="contained" size="large" onClick={confirmItem}
                        sx={{
                            py: 1.3, borderRadius: 2, fontWeight: 700,
                            background: 'linear-gradient(135deg, #1976d2, #42a5f5)'
                        }}>
                        <ShoppingCart sx={{ mr: 1 }} />
                        Sepete Ekle • ₺{((itemDialog.urun?.fiyat || 0) * itemDialog.miktar).toLocaleString()}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Sepet Drawer */}
            <Drawer anchor="bottom" open={cartOpen} onClose={() => setCartOpen(false)}
                PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '85vh' } }}>
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" fontWeight={700}>
                            <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Sepetim
                        </Typography>
                        <IconButton onClick={() => setCartOpen(false)}><Close /></IconButton>
                    </Box>

                    {sepet.map((item, i) => (
                        <Card key={i} variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700}>{item.baslik}</Typography>
                                        <Typography variant="caption" color="text.secondary">₺{item.fiyat}</Typography>
                                        {item.not && (
                                            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                📝 {item.not}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconButton size="small" onClick={() => {
                                            if (item.miktar <= 1) removeFromCart(item.urunId);
                                            else setSepet(p => p.map(s => s.urunId === item.urunId ? { ...s, miktar: s.miktar - 1 } : s));
                                        }}><Remove fontSize="small" /></IconButton>
                                        <Typography fontWeight={700}>{item.miktar}</Typography>
                                        <IconButton size="small" onClick={() =>
                                            setSepet(p => p.map(s => s.urunId === item.urunId ? { ...s, miktar: s.miktar + 1 } : s))
                                        }><Add fontSize="small" /></IconButton>
                                    </Box>
                                    <Box sx={{ textAlign: 'right', ml: 1.5 }}>
                                        <Typography fontWeight={700} color="success.main">₺{(item.fiyat * item.miktar).toLocaleString()}</Typography>
                                        <IconButton size="small" color="error" onClick={() => removeFromCart(item.urunId)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Sipariş Özeti */}
                    <Card sx={{ mt: 2, borderRadius: 2, bgcolor: '#f9f9f9' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Sipariş Özeti</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">Ara Toplam</Typography>
                                <Typography variant="body2">₺{toplam.toLocaleString()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Hizmet Bedeli</Typography>
                                <Typography variant="body2" color="success.main">Ücretsiz</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6" fontWeight={700}>Toplam</Typography>
                                <Typography variant="h6" fontWeight={700} color="success.main">₺{toplam.toLocaleString()}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, p: 1, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                                <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="body2" fontWeight={600}>
                                    MASA NUMARASI: {masaInfo?.baslik}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Sipariş Onayla */}
                    <Button
                        fullWidth variant="contained" size="large"
                        startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                        onClick={submitOrder}
                        disabled={sending || sepet.length === 0}
                        sx={{
                            mt: 2, py: 1.8, borderRadius: 3, fontWeight: 700, fontSize: '1.1rem',
                            background: 'linear-gradient(135deg, #e65100, #ff9800)',
                            '&:hover': { background: 'linear-gradient(135deg, #bf360c, #f57c00)' }
                        }}
                    >
                        {sending ? 'GÖNDERİLİYOR...' : 'SİPARİŞİ ONAYLA'}
                    </Button>
                    <Typography variant="caption" display="block" textAlign="center" color="text.secondary" sx={{ mt: 1 }}>
                        Menüye Dön
                    </Typography>
                </Box>
            </Drawer>

            <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
