import { useState, useEffect } from 'react';
import {
    Grid, Typography, Box, Card, CardContent, CircularProgress, Chip,
    TextField, Button, List, ListItem, ListItemText, Avatar, Rating,
    Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow,
    Paper, Alert, Tooltip, LinearProgress
} from '@mui/material';
import {
    Recommend, TrendingUp, ShoppingCart, AutoGraph,
    LocalOffer, Restaurant, Lightbulb
} from '@mui/icons-material';
import MainCard from 'components/MainCard';

const API_BASE = 'http://localhost:5000/api';

// ─── Yardımcı bileşenler ────────────────────────────────────────────────────

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

function ConfidenceBar({ value, color = 'primary' }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <LinearProgress
                variant="determinate"
                value={value}
                color={color}
                sx={{ flex: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" sx={{ minWidth: 36 }}>%{value}</Typography>
        </Box>
    );
}

// ─── Ana Sayfa ───────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
    const [tab, setTab] = useState(0);

    // Matrix Factorization state
    const [customerId, setCustomerId] = useState('1');
    const [productId, setProductId] = useState('1');
    const [customerRecs, setCustomerRecs] = useState([]);
    const [productRecs, setProductRecs] = useState([]);
    const [mfLoading, setMfLoading] = useState(false);

    // Apriori state
    const [topRules, setTopRules] = useState([]);
    const [topPairs, setTopPairs] = useState([]);
    const [basketInput, setBasketInput] = useState('');
    const [basketRecs, setBasketRecs] = useState([]);
    const [aprioriLoading, setAprioriLoading] = useState(false);
    const [retrainLoading, setRetrainLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCustomerRecs();
        loadProductRecs();
        loadAprioriData();
    }, []);

    // ── Matrix Factorization ─────────────────────────────────────────────────

    async function loadCustomerRecs() {
        setMfLoading(true);
        try {
            const res = await fetch(`${API_BASE}/recommendations/customer/${customerId}?top=6`);
            const data = await res.json();
            setCustomerRecs(data.oneriler || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setMfLoading(false);
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

    // ── Apriori ──────────────────────────────────────────────────────────────

    async function loadAprioriData() {
        setAprioriLoading(true);
        try {
            const [rulesRes, pairsRes] = await Promise.all([
                fetch(`${API_BASE}/recommendations/rules?top=25`),
                fetch(`${API_BASE}/recommendations/pairs?top=15`),
            ]);
            const rulesData = await rulesRes.json();
            const pairsData = await pairsRes.json();
            setTopRules(rulesData.kurallar || []);
            setTopPairs(Array.isArray(pairsData) ? pairsData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setAprioriLoading(false);
        }
    }

    async function loadBasketRecs() {
        if (!basketInput.trim()) return;
        setAprioriLoading(true);
        try {
            const res = await fetch(`${API_BASE}/recommendations/basket?urunler=${encodeURIComponent(basketInput)}&top=6`);
            const data = await res.json();
            setBasketRecs(data.oneriler || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setAprioriLoading(false);
        }
    }

    async function handleRetrain() {
        setRetrainLoading(true);
        try {
            await fetch(`${API_BASE}/recommendations/rules/retrain`, { method: 'POST' });
            await loadAprioriData();
        } finally {
            setRetrainLoading(false);
        }
    }

    // ── Lift rengine göre chip rengi ─────────────────────────────────────────
    function liftColor(lift) {
        if (lift >= 4) return 'error';
        if (lift >= 2.5) return 'warning';
        if (lift >= 1.5) return 'success';
        return 'default';
    }

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <Grid container spacing={3}>
            {/* Başlık */}
            <Grid item xs={12}>
                <MainCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h4">Öneri Sistemi</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Matrix Factorization + Apriori Market Basket Analysis
                            </Typography>
                        </Box>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                            <Tab icon={<Recommend />} label="Kişisel Öneri" iconPosition="start" />
                            <Tab icon={<AutoGraph />} label="Pazar Sepeti" iconPosition="start" />
                        </Tabs>
                    </Box>
                </MainCard>
            </Grid>

            {error && (
                <Grid item xs={12}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Grid>
            )}

            {/* ── SEKME 0: Matrix Factorization ─────────────────────────────── */}
            {tab === 0 && (
                <>
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
                            {mfLoading ? (
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
                </>
            )}

            {/* ── SEKME 1: Apriori / Market Basket ──────────────────────────── */}
            {tab === 1 && (
                <>
                    {/* Sepet Bazlı Öneri */}
                    <Grid item xs={12} md={5}>
                        <MainCard
                            title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShoppingCart fontSize="small" /> Sepet Önerisi</Box>}
                            secondary={
                                <Tooltip title="Modeli gerçek verilerle yeniden eğit">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleRetrain}
                                        disabled={retrainLoading}
                                        startIcon={retrainLoading ? <CircularProgress size={14} /> : <TrendingUp />}
                                    >
                                        Yeniden Eğit
                                    </Button>
                                </Tooltip>
                            }
                        >
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                Stok Kartı ID'lerini virgülle girin (örn: 1,3,7)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="1,3,7"
                                    value={basketInput}
                                    onChange={(e) => setBasketInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && loadBasketRecs()}
                                />
                                <Button variant="contained" onClick={loadBasketRecs} disabled={aprioriLoading}>
                                    Öner
                                </Button>
                            </Box>

                            {aprioriLoading && <LinearProgress sx={{ mb: 2 }} />}

                            {basketRecs.length > 0 ? (
                                <List dense disablePadding>
                                    {basketRecs.map((rec, idx) => (
                                        <ListItem
                                            key={idx}
                                            sx={{ px: 0, borderBottom: '1px solid', borderColor: 'divider' }}
                                        >
                                            <Avatar sx={{ bgcolor: 'success.light', mr: 1.5, width: 32, height: 32, fontSize: 13 }}>
                                                {idx + 1}
                                            </Avatar>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="subtitle2">{rec.productName}</Typography>
                                                        <Chip label={`Lift ${rec.lift}`} size="small" color={liftColor(rec.lift)} />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <ConfidenceBar value={rec.confidence} color="success" />
                                                        <Typography variant="caption" color="text.secondary">{rec.reason}</Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : !aprioriLoading && (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Lightbulb sx={{ fontSize: 40, color: 'text.disabled' }} />
                                    <Typography variant="body2" color="text.secondary" mt={1}>
                                        Ürün ID'leri girerek sepet önerisi alın
                                    </Typography>
                                </Box>
                            )}
                        </MainCard>

                        {/* En Sık Çiftler */}
                        <MainCard sx={{ mt: 2 }} title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LocalOffer fontSize="small" /> En Sık Birlikte Satılanlar</Box>}>
                            {topPairs.length > 0 ? (
                                <List dense disablePadding>
                                    {topPairs.slice(0, 8).map((pair, idx) => (
                                        <ListItem key={idx} sx={{ px: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                        <Chip label={pair.productAName} size="small" variant="outlined" color="primary" />
                                                        <Typography variant="caption">+</Typography>
                                                        <Chip label={pair.productBName} size="small" variant="outlined" color="secondary" />
                                                        <Chip label={`${pair.count} kez`} size="small" />
                                                    </Box>
                                                }
                                                secondary={`Destek: %${pair.support}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography color="text.secondary" textAlign="center" py={2}>
                                    Veri yükleniyor…
                                </Typography>
                            )}
                        </MainCard>
                    </Grid>

                    {/* Birliktelik Kuralları Tablosu */}
                    <Grid item xs={12} md={7}>
                        <MainCard title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Restaurant fontSize="small" /> Birliktelik Kuralları (Apriori)</Box>}>
                            {aprioriLoading ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
                            ) : topRules.length > 0 ? (
                                <Paper variant="outlined" sx={{ maxHeight: 560, overflow: 'auto' }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>X (Tetikleyici)</strong></TableCell>
                                                <TableCell><strong>Y (Öneri)</strong></TableCell>
                                                <TableCell align="center"><strong>Güven</strong></TableCell>
                                                <TableCell align="center"><strong>Lift</strong></TableCell>
                                                <TableCell align="center"><strong>Destek</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {topRules.map((rule, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell>
                                                        <Typography variant="caption" fontWeight="bold">
                                                            {rule.antecedent}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption">{rule.consequent}</Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <ConfidenceBar value={rule.confidence} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={rule.lift?.toFixed ? rule.lift.toFixed(2) : rule.lift}
                                                            size="small"
                                                            color={liftColor(rule.lift)}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="caption">%{rule.support}</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            ) : (
                                <Alert severity="info">
                                    Yeterli sipariş verisi yok. Önce <code>/api/seed</code> ile veri oluşturun,
                                    ardından "Yeniden Eğit" butonuna tıklayın.
                                </Alert>
                            )}
                        </MainCard>
                    </Grid>
                </>
            )}
        </Grid>
    );
}
