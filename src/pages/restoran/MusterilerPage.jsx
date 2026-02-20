import { useState, useEffect } from 'react';
import { Grid, Typography, Box, CircularProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment, Avatar, Card, CardContent } from '@mui/material';
import { Search, People } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

export default function MusterilerPage() {
    const [customers, setCustomers] = useState([]);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [segRes] = await Promise.all([
                fetch(`${API_BASE}/segments`).then(r => r.json())
            ]);

            // Segment özetinden müşteri listesi
            setSegments(segRes.segmentOzeti || []);

            // Segmentlere göre müşterileri getir (limit 50)
            const customerPromises = (segRes.segmentOzeti || []).slice(0, 3).map(seg =>
                fetch(`${API_BASE}/segments/customers?segment=${encodeURIComponent(seg.segment)}&limit=10`)
                    .then(r => r.json())
            );
            const customerData = await Promise.all(customerPromises);
            setCustomers(customerData.flat().filter(c => c.customerId));
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

    const segmentColors = {
        'VIP - En Değerli': 'success',
        'Sadık Müşteri': 'primary',
        'En Değerli Müşteriler': 'info',
        'Risk Altında': 'warning',
        'Uyuyan Müşteri': 'error'
    };

    const filteredCustomers = customers.filter(c =>
        c.customerId?.toString().includes(search) ||
        c.segmentName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4">Müşteriler</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Segment bazlı müşteri listesi
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip icon={<People />} label={`${customers.length} Müşteri`} color="primary" />
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            {/* Segment Summary Cards */}
            {segments.slice(0, 4).map((seg, idx) => (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">{seg.segment}</Typography>
                            <Typography variant="h4">{seg.musteriSayisi}</Typography>
                            <Typography variant="caption">₺{seg.toplamCiro?.toLocaleString()}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}

            <Grid item xs={12}>
                <MainCard title="Müşteri Listesi">
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Müşteri ID veya segment ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                )
                            }}
                            fullWidth
                            sx={{ maxWidth: 400 }}
                        />
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Müşteri</TableCell>
                                <TableCell>Segment</TableCell>
                                <TableCell align="center">Recency (Gün)</TableCell>
                                <TableCell align="center">Sipariş Sayısı</TableCell>
                                <TableCell align="right">Toplam Harcama</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCustomers.slice(0, 30).map((customer, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                                                {customer.customerId}
                                            </Avatar>
                                            <Typography>Müşteri #{customer.customerId}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={customer.segmentName}
                                            size="small"
                                            color={segmentColors[customer.segmentName] || 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="center">{customer.recency?.toFixed(0)}</TableCell>
                                    <TableCell align="center">{customer.frequency}</TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold">₺{customer.monetary?.toLocaleString()}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </MainCard>
            </Grid>
        </Grid>
    );
}
