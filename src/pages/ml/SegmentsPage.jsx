import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CircularProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress } from '@mui/material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

function SegmentCard({ segment, data }) {
    const colors = {
        'VIP - En Değerli': 'success',
        'Sadık Müşteri': 'primary',
        'En Değerli Müşteriler': 'info',
        'Risk Altında': 'warning',
        'Uyuyan Müşteri': 'error',
        'Yeni Müşteri': 'secondary'
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{segment}</Typography>
                    <Chip label={`${data.musteriSayisi} Müşteri`} color={colors[segment] || 'default'} size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Toplam Ciro</Typography>
                        <Typography variant="h5">₺{data.toplamCiro?.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Ort. Recency</Typography>
                        <Typography>{data.ortalamaRecency} gün</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Ort. Sipariş Sayısı</Typography>
                        <Typography>{data.ortalamaFrequency}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function SegmentsPage() {
    const [segments, setSegments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/segments`);
            const data = await res.json();
            setSegments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <MainCard>
                <Typography color="error">Hata: {error}</Typography>
            </MainCard>
        );
    }

    const segmentData = segments?.segmentOzeti || [];
    const totalCustomers = segmentData.reduce((acc, s) => acc + s.musteriSayisi, 0);
    const totalRevenue = segmentData.reduce((acc, s) => acc + s.toplamCiro, 0);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4">Müşteri Segmentleri</Typography>
                            <Typography variant="body2" color="text.secondary">
                                RFM analizi ile K-Means kümeleme
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip label={`${totalCustomers} Müşteri`} color="primary" />
                            <Chip label={`₺${totalRevenue.toLocaleString()} Ciro`} color="success" />
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            {segmentData.map((seg, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                    <SegmentCard segment={seg.segment} data={seg} />
                </Grid>
            ))}

            <Grid item xs={12}>
                <MainCard title="Segment Dağılımı">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Segment</TableCell>
                                <TableCell align="center">Müşteri</TableCell>
                                <TableCell align="center">Oran</TableCell>
                                <TableCell align="right">Toplam Ciro</TableCell>
                                <TableCell align="right">Ort. Ciro</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {segmentData.map((seg, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{seg.segment}</TableCell>
                                    <TableCell align="center">{seg.musteriSayisi}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(seg.musteriSayisi / totalCustomers) * 100}
                                                sx={{ width: 60, height: 8, borderRadius: 4 }}
                                            />
                                            <Typography variant="caption">
                                                {((seg.musteriSayisi / totalCustomers) * 100).toFixed(1)}%
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">₺{seg.toplamCiro?.toLocaleString()}</TableCell>
                                    <TableCell align="right">₺{seg.ortalamaMonetary?.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </MainCard>
            </Grid>
        </Grid>
    );
}
