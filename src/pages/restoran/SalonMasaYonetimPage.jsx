import { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Button, TextField,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, ListItemSecondaryAction, Avatar,
    Divider, CircularProgress, Alert, Snackbar, Chip, Paper, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Fab
} from '@mui/material';
import {
    Add, Edit, Delete, QrCode, ExpandMore, TableBar,
    Close, Save, Refresh, DoorBack, ContentCopy
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = 'http://localhost:5000/api';
const QR_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

export default function SalonMasaYonetimPage() {
    const [salonlar, setSalonlar] = useState([]);
    const [masalar, setMasalar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Dialog states
    const [salonDialog, setSalonDialog] = useState({ open: false, mode: 'add', data: null });
    const [masaDialog, setMasaDialog] = useState({ open: false, mode: 'add', salonId: null, data: null });
    const [qrDialog, setQrDialog] = useState({ open: false, masa: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null, baslik: '' });

    // Form states
    const [salonForm, setSalonForm] = useState({ baslik: '', kodu: '' });
    const [masaForm, setMasaForm] = useState({ baslik: '' });
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem('cafeml_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [salonRes, masaRes] = await Promise.all([
                fetch(`${API_BASE}/salonlar`).then(r => r.json()),
                fetch(`${API_BASE}/masalar`).then(r => r.json()),
            ]);
            setSalonlar(salonRes);
            setMasalar(masaRes);
        } catch {
            showSnack('Veriler yüklenemedi', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    function showSnack(message, severity = 'success') {
        setSnackbar({ open: true, message, severity });
    }

    // ========== SALON CRUD ==========
    function openAddSalon() {
        setSalonForm({ baslik: '', kodu: '' });
        setSalonDialog({ open: true, mode: 'add', data: null });
    }

    function openEditSalon(salon) {
        setSalonForm({ baslik: salon.ad, kodu: salon.kodu || '' });
        setSalonDialog({ open: true, mode: 'edit', data: salon });
    }

    async function saveSalon() {
        if (!salonForm.baslik.trim()) return;
        setSaving(true);
        try {
            const { mode, data } = salonDialog;
            const url = mode === 'add' ? `${API_BASE}/salonlar` : `${API_BASE}/salonlar/${data.id}`;
            const method = mode === 'add' ? 'POST' : 'PUT';
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({ baslik: salonForm.baslik, kodu: salonForm.kodu || undefined })
            });
            if (res.ok) {
                showSnack(mode === 'add' ? '✅ Salon eklendi' : '✅ Salon güncellendi');
                setSalonDialog({ open: false, mode: 'add', data: null });
                await loadData();
            } else {
                const err = await res.json();
                showSnack(err.message || 'Hata oluştu', 'error');
            }
        } catch {
            showSnack('Bağlantı hatası', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function deleteSalon(id) {
        try {
            const res = await fetch(`${API_BASE}/salonlar/${id}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (res.ok) {
                showSnack('✅ Salon silindi');
                await loadData();
            } else {
                showSnack(data.message || 'Silinemedi', 'error');
            }
        } catch {
            showSnack('Bağlantı hatası', 'error');
        } finally {
            setDeleteConfirm({ open: false, type: null, id: null, baslik: '' });
        }
    }

    // ========== MASA CRUD ==========
    function openAddMasa(salonId) {
        setMasaForm({ baslik: '' });
        setMasaDialog({ open: true, mode: 'add', salonId, data: null });
    }

    function openEditMasa(masa) {
        setMasaForm({ baslik: masa.baslik || '' });
        setMasaDialog({ open: true, mode: 'edit', salonId: masa.salonId, data: masa });
    }

    async function saveMasa() {
        if (!masaForm.baslik.trim()) return;
        setSaving(true);
        try {
            const { mode, salonId, data } = masaDialog;
            const url = mode === 'add' ? `${API_BASE}/masalar` : `${API_BASE}/masalar/${data.id}`;
            const method = mode === 'add' ? 'POST' : 'PUT';
            const body = mode === 'add'
                ? { salonId, baslik: masaForm.baslik }
                : { baslik: masaForm.baslik };
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            if (res.ok) {
                showSnack(mode === 'add' ? '✅ Masa eklendi' : '✅ Masa güncellendi');
                setMasaDialog({ open: false, mode: 'add', salonId: null, data: null });
                await loadData();
            } else {
                const err = await res.json();
                showSnack(err.message || 'Hata', 'error');
            }
        } catch {
            showSnack('Bağlantı hatası', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function deleteMasa(id) {
        try {
            const res = await fetch(`${API_BASE}/masalar/${id}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (res.ok) {
                showSnack('✅ Masa silindi');
                await loadData();
            } else {
                showSnack(data.message || 'Silinemedi', 'error');
            }
        } catch {
            showSnack('Bağlantı hatası', 'error');
        } finally {
            setDeleteConfirm({ open: false, type: null, id: null, baslik: '' });
        }
    }

    async function yeniQr(masa) {
        try {
            const res = await fetch(`${API_BASE}/masalar/${masa.id}/yeni-qr`, { method: 'POST', headers });
            const data = await res.json();
            if (res.ok) {
                showSnack(`✅ QR kod yenilendi: ${data.yeniQrKod}`);
                await loadData();
                setQrDialog(prev => ({ ...prev, masa: { ...prev.masa, qrKod: data.yeniQrKod } }));
            }
        } catch {
            showSnack('QR yenilenemedi', 'error');
        }
    }

    function openQrDialog(masa) {
        setQrDialog({ open: true, masa });
    }

    function downloadQr(masaBaslik) {
        const svg = document.getElementById('qr-svg-export');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 300, 300);
            ctx.drawImage(img, 0, 0, 300, 300);
            const a = document.createElement('a');
            a.download = `QR-${masaBaslik}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    }

    const masalarBySalon = salonlar.reduce((acc, s) => {
        acc[s.id] = masalar.filter(m => m.salonId === s.id);
        return acc;
    }, {});

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Paper elevation={0} sx={{
                background: 'linear-gradient(135deg, #4a148c, #7b1fa2, #ce93d8)',
                color: 'white', p: 3, borderRadius: { xs: 0, sm: 3 }, mb: 3,
                position: 'relative', overflow: 'hidden'
            }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <TableBar sx={{ fontSize: 26 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" fontWeight={800}>Salon/Masa Yönetimi</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85 }}>
                                {salonlar.length} salon · {masalar.length} masa
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Yenile">
                            <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }} onClick={loadData}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={openAddSalon}
                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 700 }}
                        >
                            Yeni Salon
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Salonlar */}
            {salonlar.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Henüz salon eklenmemiş. "Yeni Salon" butonuna tıklayarak başlayın.
                </Alert>
            ) : (
                salonlar.map(salon => (
                    <Accordion key={salon.id} defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ borderRadius: 2, bgcolor: '#f8f9fa' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, mr: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                                    <DoorBack sx={{ fontSize: 20 }} />
                                </Avatar>
                                <Box>
                                    <Typography fontWeight={700}>{salon.ad}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Kod: {salon.kodu} · {masalarBySalon[salon.id]?.length || 0} masa
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`${masalarBySalon[salon.id]?.length || 0} masa`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ ml: 'auto', mr: 1 }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                                <Tooltip title="Salonu düzenle">
                                    <IconButton size="small" onClick={() => openEditSalon(salon)} color="primary">
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Salonu sil">
                                    <IconButton size="small" color="error"
                                        onClick={() => setDeleteConfirm({ open: true, type: 'salon', id: salon.id, baslik: salon.ad })}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                {masalarBySalon[salon.id]?.map(masa => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={masa.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { boxShadow: 3 }, transition: 'all 0.2s' }}>
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography fontWeight={700}>{masa.baslik}</Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap>
                                                            {masa.qrKod}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={masa.durum || 'Boş'}
                                                        size="small"
                                                        color={masa.durum === 'Dolu' ? 'warning' : 'success'}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, justifyContent: 'flex-end' }}>
                                                    <Tooltip title="QR Kodu Görüntüle">
                                                        <IconButton size="small" color="info" onClick={() => openQrDialog(masa)}>
                                                            <QrCode fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Düzenle">
                                                        <IconButton size="small" color="primary" onClick={() => openEditMasa(masa)}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Sil">
                                                        <IconButton size="small" color="error"
                                                            onClick={() => setDeleteConfirm({ open: true, type: 'masa', id: masa.id, baslik: masa.baslik })}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                                {/* Yeni Masa Ekle Butonu */}
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 2, borderStyle: 'dashed', borderColor: 'primary.main',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'primary.50', boxShadow: 2 }
                                        }}
                                        onClick={() => openAddMasa(salon.id)}
                                    >
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: '14px !important' }}>
                                            <Add color="primary" />
                                            <Typography color="primary" fontWeight={600}>Masa Ekle</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                ))
            )}

            {/* ===== SALON DIALOG ===== */}
            <Dialog open={salonDialog.open} onClose={() => setSalonDialog({ ...salonDialog, open: false })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {salonDialog.mode === 'add' ? '➕ Yeni Salon' : '✏️ Salon Düzenle'}
                </DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <TextField
                        fullWidth label="Salon Adı" value={salonForm.baslik}
                        onChange={e => setSalonForm({ ...salonForm, baslik: e.target.value })}
                        sx={{ mb: 2 }} required autoFocus
                        onKeyDown={e => e.key === 'Enter' && saveSalon()}
                    />
                    <TextField
                        fullWidth label="Salon Kodu (opsiyonel)" value={salonForm.kodu}
                        onChange={e => setSalonForm({ ...salonForm, kodu: e.target.value })}
                        placeholder="Boş bırakırsanız otomatik oluşturulur"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSalonDialog({ ...salonDialog, open: false })}>İptal</Button>
                    <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                        onClick={saveSalon} disabled={saving || !salonForm.baslik.trim()}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ===== MASA DIALOG ===== */}
            <Dialog open={masaDialog.open} onClose={() => setMasaDialog({ ...masaDialog, open: false })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {masaDialog.mode === 'add' ? '➕ Yeni Masa' : '✏️ Masa Düzenle'}
                </DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <TextField
                        fullWidth label="Masa Adı" value={masaForm.baslik}
                        onChange={e => setMasaForm({ baslik: e.target.value })}
                        placeholder="ör. Masa 1, VIP 1, Balkon 2"
                        required autoFocus
                        onKeyDown={e => e.key === 'Enter' && saveMasa()}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setMasaDialog({ ...masaDialog, open: false })}>İptal</Button>
                    <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                        onClick={saveMasa} disabled={saving || !masaForm.baslik.trim()}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ===== QR DIALOG ===== */}
            <Dialog open={qrDialog.open} onClose={() => setQrDialog({ open: false, masa: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={700}>QR Kod — {qrDialog.masa?.baslik}</Typography>
                    <IconButton onClick={() => setQrDialog({ open: false, masa: null })}><Close /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
                    {qrDialog.masa && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                <QRCodeSVG
                                    id="qr-svg-export"
                                    value={`${QR_BASE}/qr/${qrDialog.masa.id}`}
                                    size={240}
                                    level="H"
                                    includeMargin
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {qrDialog.masa.qrKod}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<ContentCopy />}
                                    size="small"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${QR_BASE}/qr/${qrDialog.masa.id}`);
                                        showSnack('Link kopyalandı');
                                    }}
                                >
                                    Linki Kopyala
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<QrCode />}
                                    size="small"
                                    onClick={() => downloadQr(qrDialog.masa.baslik)}
                                >
                                    PNG İndir
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<Refresh />}
                                    size="small"
                                    onClick={() => yeniQr(qrDialog.masa)}
                                >
                                    QR Yenile
                                </Button>
                            </Box>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ===== SİLME ONAY DIALOG ===== */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
                    🗑️ {deleteConfirm.type === 'salon' ? 'Salon' : 'Masa'} Sil
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <strong>{deleteConfirm.baslik}</strong> {deleteConfirm.type === 'salon' ? 'salonu' : 'masası'} silinecek.
                        Bu işlem geri alınamaz.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })}>Vazgeç</Button>
                    <Button
                        variant="contained" color="error"
                        onClick={() => deleteConfirm.type === 'salon'
                            ? deleteSalon(deleteConfirm.id)
                            : deleteMasa(deleteConfirm.id)
                        }
                    >
                        Evet, Sil
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
