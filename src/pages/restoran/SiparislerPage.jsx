import { useState, useEffect } from 'react';
import { Grid, Typography, Box, CircularProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, InputAdornment } from '@mui/material';
import { Search, Receipt } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

export default function SiparislerPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sales/daily`);
            const data = await res.json();
            setOrders(data);
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

    const totalOrders = orders.reduce((acc, d) => acc + d.siparisSayisi, 0);
    const totalRevenue = orders.reduce((acc, d) => acc + d.toplamSatis, 0);

    const filteredOrders = orders.filter(o =>
        o.tarih?.includes(search)
    );

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4">Siparişler</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Günlük satış özeti
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip icon={<Receipt />} label={`${totalOrders.toLocaleString()} Sipariş`} color="primary" />
                            <Chip label={`₺${totalRevenue.toLocaleString()} Ciro`} color="success" />
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Tarih ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tarih</TableCell>
                                <TableCell align="center">Sipariş Sayısı</TableCell>
                                <TableCell align="right">Toplam Satış</TableCell>
                                <TableCell align="right">Ort. Sipariş</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrders
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((order, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>
                                            {new Date(order.tarih).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={order.siparisSayisi} size="small" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight="bold">₺{order.toplamSatis?.toLocaleString()}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            ₺{(order.toplamSatis / order.siparisSayisi).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={filteredOrders.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                        labelRowsPerPage="Sayfa başına:"
                    />
                </MainCard>
            </Grid>
        </Grid>
    );
}
