import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CircularProgress, Chip, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Avatar } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

export default function MenuPage() {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/menu`);
            const data = await res.json();
            setMenu(data);
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

    const totalProducts = menu.reduce((acc, cat) => acc + cat.urunler.length, 0);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4">Menü Yönetimi</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Kategorilere göre ürün listesi
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip label={`${menu.length} Kategori`} color="primary" />
                            <Chip label={`${totalProducts} Ürün`} color="secondary" />
                        </Box>
                    </Box>
                </MainCard>
            </Grid>

            <Grid item xs={12}>
                {menu.map((category, idx) => (
                    <Accordion key={idx} defaultExpanded={idx === 0}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6">{category.kategori}</Typography>
                                <Chip label={`${category.urunler.length} ürün`} size="small" />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                {category.urunler.map((urun, uidx) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={uidx}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                        {urun.baslik?.charAt(0) || 'Ü'}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="subtitle2" noWrap>
                                                            {urun.baslik}
                                                        </Typography>
                                                        <Typography variant="h6" color="success.main">
                                                            ₺{urun.fiyat?.toFixed(2)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Grid>
        </Grid>
    );
}
