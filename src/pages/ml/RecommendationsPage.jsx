import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CircularProgress, Chip, TextField, Button, List, ListItem, ListItemText, Avatar, Rating } from '@mui/material';
import { Recommend, TrendingUp } from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

function ProductCard({ product }) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                        {product.productName?.charAt(0) || 'P'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{product.productName}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Rating value={product.score / 20} precision={0.5} size="small" readOnly />
                            <Typography variant="caption" color="text.secondary">
                                Skor: {product.score?.toFixed(1)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function RecommendationsPage() {
    const [customerId, setCustomerId] = useState('1');
    const [productId, setProductId] = useState('1');
    const [customerRecs, setCustomerRecs] = useState([]);
    const [productRecs, setProductRecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCustomerRecs();
        loadProductRecs();
    }, []);

    async function loadCustomerRecs() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/recommendations/customer/${customerId}?top=6`);
            const data = await res.json();
            setCustomerRecs(data.oneriler || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadProductRecs() {
        try {
            const res = await fetch(`${API_BASE}/recommendations/product/${productId}?top=6`);
            const data = await res.json();
            setProductRecs(data.iliskiliUrunler || []);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <MainCard>
                    <Typography variant="h4">Ürün Önerileri</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Matrix Factorization ile kişiselleştirilmiş öneriler
                    </Typography>
                </MainCard>
            </Grid>

            {/* Customer Recommendations */}
            <Grid item xs={12} md={6}>
                <MainCard
                    title="Müşteriye Özel Öneriler"
                    secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                label="Müşteri ID"
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                sx={{ width: 100 }}
                            />
                            <Button variant="contained" size="small" onClick={loadCustomerRecs}>
                                Getir
                            </Button>
                        </Box>
                    }
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : customerRecs.length > 0 ? (
                        <Grid container spacing={2}>
                            {customerRecs.map((rec, idx) => (
                                <Grid item xs={12} sm={6} key={idx}>
                                    <ProductCard product={rec} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            Bu müşteri için öneri bulunamadı
                        </Typography>
                    )}
                </MainCard>
            </Grid>

            {/* Related Products */}
            <Grid item xs={12} md={6}>
                <MainCard
                    title="İlişkili Ürünler"
                    secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                label="Ürün ID"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                sx={{ width: 100 }}
                            />
                            <Button variant="contained" size="small" onClick={loadProductRecs}>
                                Getir
                            </Button>
                        </Box>
                    }
                >
                    {productRecs.length > 0 ? (
                        <Grid container spacing={2}>
                            {productRecs.map((rec, idx) => (
                                <Grid item xs={12} sm={6} key={idx}>
                                    <ProductCard product={rec} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            Bu ürün için ilişkili ürün bulunamadı
                        </Typography>
                    )}
                </MainCard>
            </Grid>
        </Grid>
    );
}
