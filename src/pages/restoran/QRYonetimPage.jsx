import { useState, useEffect, useRef } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Button, Chip, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    Snackbar, Alert, Paper, IconButton, TextField, InputAdornment
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Print, Search, QrCode2, TableBar, Refresh } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

export default function QRYonetimPage() {
    const [masalar, setMasalar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMasa, setSelectedMasa] = useState(null);
    const [search, setSearch] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const token = localStorage.getItem('cafeml_token');
    const qrRef = useRef(null);

    useEffect(() => { loadMasalar(); }, []);

    async function loadMasalar() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/masalar/qr`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setMasalar(data);
        } catch (err) {
            setSnackbar({ open: true, message: 'Masalar yüklenemedi!', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }

    function getQrUrl(masa) {
        // QR içine gömülecek URL - müşteri bunu tarayacak
        const base = window.location.origin;
        return `${base}/free/qr/${masa.id}`;
    }

    function handleDownload(masa) {
        const svg = document.getElementById(`qr-svg-${masa.id}`);
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            // Beyaz arka plan
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 600, 720);

            // QR kod
            ctx.drawImage(img, 50, 30, 500, 500);

            // Masa bilgisi
            ctx.fillStyle = '#1976d2';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(masa.baslik, 300, 580);

            ctx.fillStyle = '#666';
            ctx.font = '24px Arial';
            ctx.fillText(masa.salon, 300, 615);

            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.fillText(`QR: ${masa.qrKod}`, 300, 650);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('📱 QR Okutun • Menüyü Görün • Sipariş Verin', 300, 695);

            // İndir
            const link = document.createElement('a');
            link.download = `QR_${masa.salon}_${masa.baslik}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

        setSnackbar({ open: true, message: `${masa.baslik} QR kodu indirildi`, severity: 'success' });
    }

    function handlePrint(masa) {
        setSelectedMasa(masa);
        setTimeout(() => {
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (!printWindow) return;
            const url = getQrUrl(masa);
            printWindow.document.write(`
                <html>
                <head><title>QR - ${masa.baslik}</title></head>
                <body style="text-align:center;font-family:Arial;padding:20px">
                    <div style="border:3px solid #1976d2;border-radius:16px;padding:30px;display:inline-block;max-width:350px">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" width="300" height="300" />
                        <h1 style="color:#1976d2;margin:15px 0 5px">${masa.baslik}</h1>
                        <p style="color:#666;margin:0 0 10px">${masa.salon}</p>
                        <p style="color:#333;font-size:14px;background:#f5f5f5;padding:8px;border-radius:8px">
                            📱 QR Okutun • Menüyü Görün<br/>Sipariş Verin
                        </p>
                    </div>
                    <script>setTimeout(()=>window.print(),500)<\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }, 100);
    }

    const filtered = masalar.filter(m =>
        !search || m.baslik?.toLowerCase().includes(search.toLowerCase()) ||
        m.salon?.toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce((acc, m) => {
        if (!acc[m.salon]) acc[m.salon] = [];
        acc[m.salon].push(m);
        return acc;
    }, {});

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4">
                                <QrCode2 sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                                QR Kod Yönetimi
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Her masa için QR kodu oluşturun, indirin veya yazdırın. Matbaaya vermek için PNG çıktı alabilirsiniz.
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Masa veya salon ara..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                                }}
                            />
                            <IconButton onClick={loadMasalar} color="primary">
                                <Refresh />
                            </IconButton>
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            {loading ? (
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                </Grid>
            ) : (
                Object.entries(grouped).map(([salon, salonMasalar]) => (
                    <Grid item xs={12} key={salon}>
                        <MainCard>
                            <Typography variant="h5" sx={{ mb: 2, color: 'primary.main' }}>
                                🏠 {salon} ({salonMasalar.length} masa)
                            </Typography>
                            <Grid container spacing={2}>
                                {salonMasalar.map(masa => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={masa.id}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 3,
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                '&:hover': { boxShadow: 4, borderColor: 'primary.main' }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                {/* QR Kod */}
                                                <Box sx={{
                                                    bgcolor: 'white', p: 1.5, borderRadius: 2,
                                                    border: '2px solid #e0e0e0', display: 'inline-block', mb: 1.5
                                                }}>
                                                    <QRCodeSVG
                                                        id={`qr-svg-${masa.id}`}
                                                        value={getQrUrl(masa)}
                                                        size={140}
                                                        level="H"
                                                        includeMargin={true}
                                                    />
                                                </Box>

                                                {/* Masa Bilgisi */}
                                                <Typography variant="h6" fontWeight={700}>
                                                    <TableBar sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle', color: 'primary.main' }} />
                                                    {masa.baslik}
                                                </Typography>
                                                <Chip label={masa.salon} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1.5 }}>
                                                    QR: {masa.qrKod}
                                                </Typography>

                                                {/* Butonlar */}
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                    <Button
                                                        size="small" variant="contained"
                                                        startIcon={<Download />}
                                                        onClick={() => handleDownload(masa)}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
                                                    >
                                                        İndir
                                                    </Button>
                                                    <Button
                                                        size="small" variant="outlined"
                                                        startIcon={<Print />}
                                                        onClick={() => handlePrint(masa)}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
                                                    >
                                                        Yazdır
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </MainCard>
                    </Grid>
                ))
            )}

            {/* Toplu İndir Butonu */}
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="body1" fontWeight={600}>
                                Tüm QR kodlarını toplu indirmek ister misiniz?
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Her masa için ayrı PNG dosyası oluşturulur. Matbaaya vermek için idealdir.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<Download />}
                            onClick={() => {
                                masalar.forEach((m, i) => setTimeout(() => handleDownload(m), i * 300));
                            }}
                            sx={{
                                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                                borderRadius: 2
                            }}
                        >
                            Tümünü İndir ({masalar.length} QR)
                        </Button>
                    </Box>
                </MainCard>
            </Grid>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Grid>
    );
}
