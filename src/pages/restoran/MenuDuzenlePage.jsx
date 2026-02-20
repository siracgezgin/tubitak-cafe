import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, CardMedia, CardActions,
    Chip, Button, TextField, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, CircularProgress, Alert, Snackbar, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Divider, Tooltip, Fab, Paper, Badge, Tabs, Tab
} from '@mui/material';
import {
    Add, Edit, Delete, Search, Save, DragIndicator, CloudUpload,
    Image as ImageIcon, Restaurant, Close, Visibility, VisibilityOff,
    ArrowUpward, ArrowDownward, ContentCopy, Category
} from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

const KATEGORI_RENKLERI = {
    'Yiyecek': { bg: '#fff3e0', color: '#e65100', icon: '🍽️' },
    'İçecek': { bg: '#e3f2fd', color: '#1565c0', icon: '🥤' },
    'Tatlı': { bg: '#fce4ec', color: '#c62828', icon: '🍰' },
    'Atıştırmalık': { bg: '#f3e5f5', color: '#6a1b9a', icon: '🥨' },
    'Diğer': { bg: '#f5f5f5', color: '#424242', icon: '📦' }
};

function getKategoriStyle(kat) {
    return KATEGORI_RENKLERI[kat] || KATEGORI_RENKLERI['Diğer'];
}

export default function MenuDuzenlePage() {
    const [urunler, setUrunler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editUrun, setEditUrun] = useState(null);
    const [form, setForm] = useState({
        baslik: '', fiyat: '', kategori: 'Yiyecek', kodu: '', aciklama: '', enabled: true
    });
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);
    const [imageUploading, setImageUploading] = useState(null);
    const [kategoriDialogOpen, setKategoriDialogOpen] = useState(false);
    const [yeniKategori, setYeniKategori] = useState('');
    const [showDisabled, setShowDisabled] = useState(false);

    const token = localStorage.getItem('cafeml_token');
    const fileInputRef = useRef(null);
    const uploadTargetId = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/menu`);
            const data = await res.json();
            const allUrunler = data.flatMap(k =>
                (k.urunler || []).map(u => ({ ...u, kategori: k.kategori }))
            );
            allUrunler.sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999));
            setUrunler(allUrunler);
        } catch (err) {
            console.error('Menü yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    function openAdd() {
        setEditUrun(null);
        setForm({ baslik: '', fiyat: '', kategori: 'Yiyecek', kodu: '', aciklama: '', enabled: true });
        setDialogOpen(true);
    }

    function openEdit(urun) {
        setEditUrun(urun);
        setForm({
            baslik: urun.baslik || '',
            fiyat: String(urun.fiyat || ''),
            kategori: urun.kategori || 'Yiyecek',
            kodu: urun.kodu || '',
            aciklama: urun.aciklama || '',
            enabled: urun.enabled !== false
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const url = editUrun ? `${API_BASE}/urunler/${editUrun.id}` : `${API_BASE}/urunler`;
            const method = editUrun ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    baslik: form.baslik,
                    fiyat: parseFloat(form.fiyat),
                    kategori: form.kategori,
                    kodu: form.kodu || undefined,
                    aciklama: form.aciklama || undefined,
                    enabled: form.enabled
                })
            });
            if (res.status === 403) {
                setSnackbar({ open: true, message: 'Yetkiniz yok! Admin veya SubAdmin yetkisi gereklidir.', severity: 'error' });
                return;
            }
            const data = await res.json();
            setSnackbar({ open: true, message: data.message || 'İşlem başarılı', severity: 'success' });
            setDialogOpen(false);
            await loadData();
        } catch (err) {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Bu ürünü devre dışı bırakmak istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_BASE}/urunler/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 403) {
                setSnackbar({ open: true, message: 'Yetkiniz yok!', severity: 'error' });
                return;
            }
            setSnackbar({ open: true, message: 'Ürün devre dışı bırakıldı', severity: 'success' });
            await loadData();
        } catch (err) {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        }
    }

    async function handleToggleEnabled(urun) {
        try {
            await fetch(`${API_BASE}/urunler/${urun.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enabled: !urun.enabled })
            });
            await loadData();
        } catch (err) {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        }
    }

    function triggerImageUpload(urunId) {
        uploadTargetId.current = urunId;
        fileInputRef.current?.click();
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !uploadTargetId.current) return;

        setImageUploading(uploadTargetId.current);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/urunler/${uploadTargetId.current}/resim`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                setSnackbar({ open: true, message: 'Resim yüklendi ✓', severity: 'success' });
                await loadData();
            } else {
                setSnackbar({ open: true, message: 'Resim yüklenemedi', severity: 'error' });
            }
        } catch {
            setSnackbar({ open: true, message: 'Resim yükleme hatası', severity: 'error' });
        } finally {
            setImageUploading(null);
            e.target.value = '';
        }
    }

    // Sürükle-bırak
    function handleDragStart(e, index) {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    }

    function handleDragOver(e, index) {
        e.preventDefault();
        setDragOverItem(index);
    }

    function handleDrop(e, dropIndex) {
        e.preventDefault();
        if (draggedItem === null || draggedItem === dropIndex) {
            setDraggedItem(null);
            setDragOverItem(null);
            return;
        }

        const items = [...filtered];
        const [dragged] = items.splice(draggedItem, 1);
        items.splice(dropIndex, 0, dragged);

        // SortOrder güncelle
        const updated = items.map((item, i) => ({ ...item, sortOrder: i + 1 }));
        setUrunler(prev => {
            const newAll = [...prev];
            updated.forEach(u => {
                const idx = newAll.findIndex(x => x.id === u.id);
                if (idx >= 0) newAll[idx] = u;
            });
            return newAll;
        });

        // Backend'e sıralamayı kaydet
        saveSortOrder(updated.map((u, i) => ({ id: u.id, sortOrder: i + 1 })));

        setDraggedItem(null);
        setDragOverItem(null);
    }

    async function saveSortOrder(siralama) {
        try {
            await fetch(`${API_BASE}/urunler/siralama`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ siralama })
            });
            setSnackbar({ open: true, message: 'Sıralama kaydedildi ✓', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Sıralama kaydedilemedi', severity: 'error' });
        }
    }

    async function handleDuplicate(urun) {
        try {
            const res = await fetch(`${API_BASE}/urunler`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    baslik: urun.baslik + ' (Kopya)',
                    fiyat: urun.fiyat,
                    kategori: urun.kategori,
                    kodu: ''
                })
            });
            if (res.ok) {
                setSnackbar({ open: true, message: 'Ürün kopyalandı', severity: 'success' });
                await loadData();
            }
        } catch {
            setSnackbar({ open: true, message: 'Kopyalama hatası', severity: 'error' });
        }
    }

    const kategoriler = [...new Set(urunler.map(u => u.kategori))];
    const filtered = urunler
        .filter(u => showDisabled || u.enabled !== false)
        .filter(u => !kategoriFilter || u.kategori === kategoriFilter)
        .filter(u => !search || u.baslik?.toLowerCase().includes(search.toLowerCase()));

    const stats = {
        toplam: urunler.length,
        aktif: urunler.filter(u => u.enabled !== false).length,
        pasif: urunler.filter(u => u.enabled === false).length
    };

    return (
        <Box>
            {/* Gizli input */}
            <input
                ref={fileInputRef} type="file" accept="image/*" hidden
                onChange={handleImageUpload}
            />

            <Grid container spacing={2.5}>
                {/* Header */}
                <Grid item xs={12}>
                    <MainCard>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="h4" fontWeight={700}>
                                    <Restaurant sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                                    Menü Yönetimi
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ürün ekle/düzenle • Sürükle-bırak sıralama • Resim yükleme • Kategori filtresi
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip icon={<Visibility sx={{ fontSize: 16 }} />} label={`${stats.aktif} aktif`}
                                    color="success" size="small" variant="outlined" />
                                <Chip icon={<VisibilityOff sx={{ fontSize: 16 }} />} label={`${stats.pasif} pasif`}
                                    size="small" variant="outlined" />
                                <Button variant="contained" startIcon={<Add />} onClick={openAdd}
                                    sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}>
                                    Yeni Ürün
                                </Button>
                            </Box>
                        </Box>
                    </MainCard>
                </Grid>

                {/* Arama + Filtreler */}
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            size="small" placeholder="Ürün ara..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                            sx={{ minWidth: 200, flex: 1 }}
                        />
                        <Divider orientation="vertical" flexItem />

                        {/* Kategori Chips */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <Chip
                                label="Tümü" size="small"
                                color={!kategoriFilter ? 'primary' : 'default'}
                                variant={!kategoriFilter ? 'filled' : 'outlined'}
                                onClick={() => setKategoriFilter('')}
                            />
                            {kategoriler.map(k => {
                                const style = getKategoriStyle(k);
                                return (
                                    <Chip
                                        key={k} label={`${style.icon} ${k}`} size="small"
                                        color={kategoriFilter === k ? 'primary' : 'default'}
                                        variant={kategoriFilter === k ? 'filled' : 'outlined'}
                                        onClick={() => setKategoriFilter(kategoriFilter === k ? '' : k)}
                                    />
                                );
                            })}
                        </Box>

                        <Divider orientation="vertical" flexItem />
                        <FormControlLabel
                            control={<Switch size="small" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)} />}
                            label={<Typography variant="caption">Pasifleri göster</Typography>}
                        />
                    </Paper>
                </Grid>

                {/* Ürün Kartları */}
                {loading ? (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={48} /></Box>
                    </Grid>
                ) : (
                    filtered.map((urun, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={urun.id}
                            draggable
                            onDragStart={e => handleDragStart(e, index)}
                            onDragOver={e => handleDragOver(e, index)}
                            onDrop={e => handleDrop(e, index)}
                            onDragEnd={() => { setDraggedItem(null); setDragOverItem(null); }}
                        >
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    opacity: urun.enabled === false ? 0.5 : 1,
                                    transform: draggedItem === index ? 'scale(1.03) rotate(1deg)' : 'none',
                                    borderColor: dragOverItem === index ? 'primary.main' : (draggedItem === index ? 'warning.main' : 'divider'),
                                    borderWidth: dragOverItem === index ? 2 : 1,
                                    boxShadow: dragOverItem === index ? '0 0 20px rgba(25,118,210,0.3)' : 'none',
                                    cursor: 'grab', '&:active': { cursor: 'grabbing' },
                                    '&:hover': { boxShadow: 4 }
                                }}
                            >
                                {/* Resim Alanı */}
                                <Box
                                    sx={{
                                        position: 'relative', height: 160, bgcolor: '#f5f5f5',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', borderBottom: '1px solid #eee'
                                    }}
                                    onClick={() => triggerImageUpload(urun.id)}
                                >
                                    {imageUploading === urun.id ? (
                                        <CircularProgress size={36} />
                                    ) : urun.resim ? (
                                        <CardMedia
                                            component="img" image={`http://localhost:5000${urun.resim}`}
                                            sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
                                        />
                                    ) : (
                                        <Box sx={{ textAlign: 'center', color: '#bbb' }}>
                                            <CloudUpload sx={{ fontSize: 36 }} />
                                            <Typography variant="caption" display="block">Resim Yükle</Typography>
                                        </Box>
                                    )}

                                    {/* Sürükle göstergesi */}
                                    <Box sx={{
                                        position: 'absolute', top: 6, left: 6,
                                        bgcolor: 'rgba(0,0,0,0.45)', borderRadius: 1, px: 0.5
                                    }}>
                                        <DragIndicator sx={{ color: 'white', fontSize: 18 }} />
                                    </Box>

                                    {/* Sıra numarası */}
                                    <Box sx={{
                                        position: 'absolute', top: 6, right: 6,
                                        bgcolor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%',
                                        width: 26, height: 26, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
                                    }}>
                                        {index + 1}
                                    </Box>

                                    {/* Enabled/Disabled badge */}
                                    {urun.enabled === false && (
                                        <Chip
                                            label="Pasif" size="small"
                                            sx={{
                                                position: 'absolute', bottom: 6, left: 6,
                                                bgcolor: 'error.main', color: 'white', fontWeight: 600
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* Kart İçerik */}
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                                            {urun.baslik}
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight={800} color="success.main" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                                            ₺{urun.fiyat}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Chip
                                            label={urun.kategori} size="small"
                                            sx={{
                                                bgcolor: getKategoriStyle(urun.kategori).bg,
                                                color: getKategoriStyle(urun.kategori).color,
                                                fontWeight: 600, fontSize: '0.7rem'
                                            }}
                                        />
                                        <Box>
                                            <Tooltip title="Düzenle">
                                                <IconButton size="small" color="primary" onClick={() => openEdit(urun)}>
                                                    <Edit sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Kopyala">
                                                <IconButton size="small" onClick={() => handleDuplicate(urun)}>
                                                    <ContentCopy sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={urun.enabled !== false ? 'Devre dışı bırak' : 'Aktif et'}>
                                                <IconButton size="small" onClick={() => handleToggleEnabled(urun)}
                                                    color={urun.enabled !== false ? 'default' : 'success'}>
                                                    {urun.enabled !== false ?
                                                        <VisibilityOff sx={{ fontSize: 16 }} /> :
                                                        <Visibility sx={{ fontSize: 16 }} />
                                                    }
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Sil">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(urun.id)}>
                                                    <Delete sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}

                {/* Bilgi */}
                <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                        {filtered.length} ürün gösteriliyor • Sıralamaları değiştirmek için kartları sürükleyip bırakın
                    </Typography>
                </Grid>
            </Grid>

            {/* Ürün Ekle/Düzenle Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                        {editUrun ? '✏️ Ürünü Düzenle' : '➕ Yeni Ürün Ekle'}
                    </Typography>
                    <IconButton onClick={() => setDialogOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        {/* Resim Önizleme */}
                        {editUrun?.resim && (
                            <Box sx={{
                                textAlign: 'center', p: 1, bgcolor: '#f9f9f9', borderRadius: 2
                            }}>
                                <img
                                    src={`http://localhost:5000${editUrun.resim}`}
                                    alt={editUrun.baslik}
                                    style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'cover' }}
                                />
                                <Button size="small" startIcon={<CloudUpload />}
                                    onClick={() => { setDialogOpen(false); triggerImageUpload(editUrun.id); }}
                                    sx={{ mt: 1 }}>
                                    Resmi Değiştir
                                </Button>
                            </Box>
                        )}

                        <TextField
                            label="Ürün Adı" value={form.baslik} required fullWidth
                            onChange={e => setForm({ ...form, baslik: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Fiyat (₺)" value={form.fiyat} required fullWidth type="number"
                                    onChange={e => setForm({ ...form, fiyat: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Kategori</InputLabel>
                                    <Select
                                        value={form.kategori}
                                        onChange={e => setForm({ ...form, kategori: e.target.value })}
                                        label="Kategori"
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {['Yiyecek', 'İçecek', 'Tatlı', 'Atıştırmalık', 'Diğer', ...kategoriler]
                                            .filter((v, i, a) => a.indexOf(v) === i)
                                            .map(k => (
                                                <MenuItem key={k} value={k}>
                                                    {getKategoriStyle(k).icon} {k}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <TextField
                            label="Açıklama (opsiyonel)" value={form.aciklama} fullWidth multiline rows={2}
                            onChange={e => setForm({ ...form, aciklama: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                        <TextField
                            label="Ürün Kodu (opsiyonel)" value={form.kodu} fullWidth
                            onChange={e => setForm({ ...form, kodu: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                        <FormControlLabel
                            control={<Switch checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />}
                            label={form.enabled ? '✅ Aktif - Menüde görünür' : '❌ Pasif - Menüde gizli'}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>İptal</Button>
                    <Button
                        variant="contained" startIcon={<Save />}
                        onClick={handleSave}
                        disabled={saving || !form.baslik || !form.fiyat}
                        sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}
                    >
                        {saving ? <CircularProgress size={20} /> : (editUrun ? 'Güncelle' : 'Ürün Ekle')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={2500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
