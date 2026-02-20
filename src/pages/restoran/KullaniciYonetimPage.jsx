import { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Button, TextField,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Snackbar, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Avatar, Tooltip
} from '@mui/material';
import {
    Add, Edit, Delete, Close, Save, PersonAdd,
    AdminPanelSettings, SupervisorAccount, Person, Visibility, VisibilityOff
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useAuth } from 'contexts/AuthContext';

const API_BASE = 'http://localhost:5000/api';

const ROL_CONFIG = {
    'Admin': { color: '#d32f2f', bg: '#ffebee', icon: <AdminPanelSettings />, label: 'Admin' },
    'SubAdmin': { color: '#1565c0', bg: '#e3f2fd', icon: <SupervisorAccount />, label: 'SubAdmin' },
    'Garson': { color: '#2e7d32', bg: '#e8f5e9', icon: <Person />, label: 'Garson' },
    'Yonetici': { color: '#d32f2f', bg: '#ffebee', icon: <AdminPanelSettings />, label: 'Admin' },
    'Kasa': { color: '#ed6c02', bg: '#fff3e0', icon: <SupervisorAccount />, label: 'Kasa' }
};

function getRolConfig(rol) {
    return ROL_CONFIG[rol] || ROL_CONFIG['Garson'];
}

export default function KullaniciYonetimPage() {
    const { user, token } = useAuth();
    const [kullanicilar, setKullanicilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ kullanici: '', sifre: '', ad: '', soyad: '', rol: 'Garson' });
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const myRol = user?.rol || user?.Rol || 'Garson';
    const isAdmin = myRol === 'Admin' || myRol === 'Yonetici';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/kullanicilar`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setKullanicilar(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadData(); }, [loadData]);

    function openAdd() {
        setEditUser(null);
        setForm({ kullanici: '', sifre: '', ad: '', soyad: '', rol: 'Garson' });
        setDialogOpen(true);
    }

    function openEdit(u) {
        setEditUser(u);
        setForm({ kullanici: u.kullanici, sifre: '', ad: u.ad, soyad: u.soyad, rol: u.rol });
        setDialogOpen(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            if (editUser) {
                // Güncelle
                const body = { ad: form.ad, soyad: form.soyad };
                if (form.sifre) body.sifre = form.sifre;
                const res = await fetch(`${API_BASE}/kullanicilar/${editUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                setSnackbar({ open: true, message: data.message || 'Güncellendi', severity: res.ok ? 'success' : 'error' });
            } else {
                // Yeni oluştur
                const res = await fetch(`${API_BASE}/kullanicilar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(form)
                });
                const data = await res.json();
                setSnackbar({ open: true, message: data.message || 'Oluşturuldu', severity: res.ok ? 'success' : 'error' });
            }
            setDialogOpen(false);
            await loadData();
        } catch {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_BASE}/kullanicilar/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setSnackbar({ open: true, message: data.message || 'Silindi', severity: res.ok ? 'success' : 'error' });
            await loadData();
        } catch {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' });
        }
    }

    async function handleToggle(u) {
        try {
            await fetch(`${API_BASE}/kullanicilar/${u.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enabled: !u.enabled })
            });
            await loadData();
        } catch {
            setSnackbar({ open: true, message: 'Hata', severity: 'error' });
        }
    }

    function canModify(targetUser) {
        // SubAdmin, Admin'i değiştiremez
        if (!isAdmin && (targetUser.rol === 'Admin' || targetUser.rol === 'Yonetici')) return false;
        // Kendini silemez
        if (targetUser.id === user?.id) return false;
        return true;
    }

    // Oluşturulabilecek roller
    const creatableRoles = isAdmin ? ['SubAdmin', 'Garson'] : ['Garson'];

    const stats = {
        admin: kullanicilar.filter(u => u.rol === 'Admin' || u.rol === 'Yonetici').length,
        subadmin: kullanicilar.filter(u => u.rol === 'SubAdmin').length,
        garson: kullanicilar.filter(u => u.rol === 'Garson').length
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    return (
        <Box>
            <Grid container spacing={2.5}>
                {/* Header */}
                <Grid item xs={12}>
                    <MainCard>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="h4" fontWeight={700}>
                                    <PersonAdd sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                                    Kullanıcı Yönetimi
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Hesap oluştur, düzenle ve yetkilendir
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip icon={<AdminPanelSettings sx={{ fontSize: 16 }} />}
                                    label={`${stats.admin} Admin`} size="small"
                                    sx={{ bgcolor: '#ffebee', color: '#d32f2f', fontWeight: 600 }} />
                                <Chip icon={<SupervisorAccount sx={{ fontSize: 16 }} />}
                                    label={`${stats.subadmin} SubAdmin`} size="small"
                                    sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                                <Chip icon={<Person sx={{ fontSize: 16 }} />}
                                    label={`${stats.garson} Garson`} size="small"
                                    sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }} />
                                <Button variant="contained" startIcon={<Add />} onClick={openAdd}
                                    sx={{ borderRadius: 2, ml: 1, background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}>
                                    Yeni Hesap
                                </Button>
                            </Box>
                        </Box>
                    </MainCard>
                </Grid>

                {/* Tablo */}
                <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Kullanıcı</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Ad Soyad</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Oluşturan</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>İşlemler</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {kullanicilar.map(u => {
                                    const rc = getRolConfig(u.rol);
                                    const oluturanKisi = u.olusturanId
                                        ? kullanicilar.find(k => k.id === u.olusturanId)
                                        : null;
                                    return (
                                        <TableRow key={u.id} hover
                                            sx={{ opacity: u.enabled ? 1 : 0.5 }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{
                                                        bgcolor: rc.bg, color: rc.color,
                                                        width: 36, height: 36, fontSize: '0.9rem'
                                                    }}>
                                                        {u.ad?.charAt(0)}{u.soyad?.charAt(0)}
                                                    </Avatar>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {u.kullanici}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{u.ad} {u.soyad}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={rc.icon}
                                                    label={rc.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: rc.bg, color: rc.color,
                                                        fontWeight: 700, '& .MuiChip-icon': { color: rc.color }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.enabled ? 'Aktif' : 'Pasif'}
                                                    size="small"
                                                    color={u.enabled ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {oluturanKisi ? `${oluturanKisi.ad} ${oluturanKisi.soyad}` : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {canModify(u) ? (
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        <Tooltip title="Düzenle">
                                                            <IconButton size="small" color="primary"
                                                                onClick={() => openEdit(u)}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={u.enabled ? 'Devre dışı bırak' : 'Aktif et'}>
                                                            <IconButton size="small"
                                                                color={u.enabled ? 'warning' : 'success'}
                                                                onClick={() => handleToggle(u)}>
                                                                {u.enabled ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Sil">
                                                            <IconButton size="small" color="error"
                                                                onClick={() => handleDelete(u.id)}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {u.id === user?.id ? 'Sizsiniz' : 'Yetkisiz'}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>

            {/* Hesap Oluştur/Düzenle Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                        {editUser ? '✏️ Hesabı Düzenle' : '➕ Yeni Hesap Oluştur'}
                    </Typography>
                    <IconButton onClick={() => setDialogOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField label="Ad" value={form.ad} required fullWidth
                                    onChange={e => setForm({ ...form, ad: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField label="Soyad" value={form.soyad} required fullWidth
                                    onChange={e => setForm({ ...form, soyad: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                        </Grid>
                        <TextField label="Kullanıcı Adı" value={form.kullanici} required fullWidth
                            disabled={!!editUser}
                            onChange={e => setForm({ ...form, kullanici: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2 } }} />
                        <TextField
                            label={editUser ? "Yeni Şifre (boş bırakırsan değişmez)" : "Şifre"}
                            value={form.sifre}
                            required={!editUser}
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            onChange={e => setForm({ ...form, sifre: e.target.value })}
                            InputProps={{
                                sx: { borderRadius: 2 },
                                endAdornment: (
                                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                )
                            }}
                        />
                        {!editUser && (
                            <FormControl fullWidth>
                                <InputLabel>Rol</InputLabel>
                                <Select value={form.rol}
                                    onChange={e => setForm({ ...form, rol: e.target.value })}
                                    label="Rol" sx={{ borderRadius: 2 }}>
                                    {creatableRoles.map(r => {
                                        const rc = getRolConfig(r);
                                        return (
                                            <MenuItem key={r} value={r}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {rc.icon}
                                                    <Typography>{rc.label}</Typography>
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        )}

                        {/* Rol açıklaması */}
                        {!editUser && (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                {form.rol === 'SubAdmin'
                                    ? 'SubAdmin: Sizinle aynı yetkilere sahip olur, garson hesabı oluşturabilir. Admin hesabını silemez.'
                                    : 'Garson: Sadece sipariş alabilir, onaylayabilir. Dashboard ve menü yönetimini göremez.'}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>İptal</Button>
                    <Button variant="contained" startIcon={<Save />}
                        onClick={handleSave}
                        disabled={saving || !form.ad || !form.soyad || (!editUser && (!form.kullanici || !form.sifre))}
                        sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}>
                        {saving ? <CircularProgress size={20} /> : (editUser ? 'Güncelle' : 'Hesap Oluştur')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
