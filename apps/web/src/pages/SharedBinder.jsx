import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    MenuItem,
    Select,
    Snackbar,
    Typography,
} from '@mui/material';
import {
    AddShoppingCart as AddShoppingCartIcon,
    CollectionsBookmarkOutlined,
    LinkOffRounded,
    SortRounded,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useCardData } from '../hooks/useCardData.jsx';
import Header from '../components/elements/Header.jsx';
import { useCardDetail } from '../contexts/CardDetailContext.jsx';
import { getPublicBinder } from '../services/binder.js';
import { formatCurrency } from '../utils/helpers.js';
import { addCardToTradeDraft } from '../utils/tradeDraft.js';
import { sharedBinderTitle } from '../utils/binderNames.js';
import { capture } from '../lib/analytics.js';
import { Page, PageHeader, Panel, EmptyState } from '../components/layout/Page.jsx';
import { tk } from '../theme/tokens.js';

const SORT_OPTIONS = [
    { id: 'nameAsc', label: 'Name (A–Z)' },
    { id: 'priceDesc', label: 'Price (high → low)' },
    { id: 'priceAsc', label: 'Price (low → high)' },
    { id: 'numberAsc', label: 'Collector #' },
];

function compareEntries(a, b, sort, resolveCard) {
    const ca = resolveCard(a);
    const cb = resolveCard(b);
    switch (sort) {
        case 'priceDesc': {
            const pa = ca.market || 0;
            const pb = cb.market || 0;
            return pb - pa || ca.name.localeCompare(cb.name);
        }
        case 'priceAsc': {
            const pa = ca.market || 0;
            const pb = cb.market || 0;
            return pa - pb || ca.name.localeCompare(cb.name);
        }
        case 'numberAsc': {
            const an = ca.collectorNumber || '';
            const bn = cb.collectorNumber || '';
            if (!an && !bn) return ca.name.localeCompare(cb.name);
            if (!an) return 1;
            if (!bn) return -1;
            return an.localeCompare(bn, undefined, { numeric: true }) ||
                ca.name.localeCompare(cb.name);
        }
        case 'nameAsc':
        default:
            return ca.name.localeCompare(cb.name);
    }
}

function SharedCardArt({ imageUrl, fallbackUrl, alt, onClick, qty }) {
    const [src, setSrc] = useState(imageUrl || fallbackUrl || '');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setSrc(imageUrl || fallbackUrl || '');
        setFailed(false);
    }, [imageUrl, fallbackUrl]);

    const handleError = () => {
        if (fallbackUrl && src !== fallbackUrl) {
            setSrc(fallbackUrl);
            return;
        }
        setFailed(true);
    };

    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            aria-label={`Preview ${alt || 'card'}`}
            sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '5 / 4',
                p: 0,
                border: 0,
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'zoom-in',
                bgcolor: 'surface.sunken',
                overflow: 'hidden',
                display: 'block',
            }}
        >
            {!failed && src ? (
                <Box
                    component="img"
                    src={src}
                    alt={alt || ''}
                    loading="lazy"
                    onError={handleError}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        display: 'block',
                    }}
                />
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                    }}
                >
                    <Typography
                        sx={{ color: 'text.disabled', fontSize: '0.65rem', textAlign: 'center' }}
                    >
                        {alt || 'No image'}
                    </Typography>
                </Box>
            )}
            {qty > 1 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        px: 0.75,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 999,
                        fontSize: '0.6875rem',
                        fontWeight: 750,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#fff',
                        bgcolor: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    {qty}×
                </Box>
            )}
        </Box>
    );
}

/**
 * Read-only public binder view at `/b/:token`.
 */
const SharedBinder = () => {
    const { token } = useParams();
    const { cards, pricesUpdatedAt: lastUpdatedTimestamp } = useCardData();
    const { openDetail } = useCardDetail();

    const [entries, setEntries] = useState([]);
    const [ownerName, setOwnerName] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sort, setSort] = useState('nameAsc');
    const [toast, setToast] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await getPublicBinder(token);
            if (cancelled) return;
            if (fetchError) {
                setError(fetchError.message || 'This binder link is unavailable');
                setEntries([]);
                setOwnerName(null);
                capture('shared_binder_view_failed', {
                    error_message: fetchError.message || 'unavailable',
                });
            } else {
                const list = data.entries || [];
                setEntries(list);
                setOwnerName(data.ownerName || null);
                capture('shared_binder_viewed', {
                    card_count: list.length,
                });
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const catalogById = useMemo(() => {
        const map = new Map();
        for (const card of cards) {
            if (card._uniqueId) map.set(card._uniqueId, card);
        }
        return map;
    }, [cards]);

    const resolveCard = useCallback(
        (entry) => {
            const stub = entry.card || {};
            const live = catalogById.get(entry.cardId);
            const finish =
                live?.subTypeName ||
                stub.subTypeName ||
                (stub.isFoil ? 'Foil' : 'Normal');
            const collectorNumber =
                live?.extNumber || live?.number || stub.collectorNumber || '';
            const primaryImage = live?.imageUrl || stub.imageUrl || '';

            return {
                name: live?.name || stub.name || 'Unknown card',
                imageUrl: primaryImage,
                imageUrlFallback: stub.imageUrl && stub.imageUrl !== primaryImage
                    ? stub.imageUrl
                    : '',
                collectorNumber,
                rarity: live?.extRarity || live?.rarity || stub.rarity || '',
                finish,
                setName: live?._setName || stub.setName || '',
                typeLine: [finish, live?.extRarity || live?.rarity || stub.rarity]
                    .filter(Boolean)
                    .join(' — '),
                market: Number(live?.marketPrice) || Number(stub.tcgMarket) || 0,
                low:
                    Number(live?.lowPrice) ||
                    (stub.tcgLow != null ? Number(stub.tcgLow) : null) ||
                    null,
            };
        },
        [catalogById],
    );

    const sorted = useMemo(() => {
        const list = [...entries];
        list.sort((a, b) => compareEntries(a, b, sort, resolveCard));
        return list;
    }, [entries, sort, resolveCard]);

    const totalValue = useMemo(
        () =>
            entries.reduce((sum, entry) => {
                const price = resolveCard(entry).market;
                return sum + price * (entry.quantity || 1);
            }, 0),
        [entries, resolveCard],
    );

    const openEntryDetail = (entry) => {
        const live = catalogById.get(entry.cardId);
        if (live?._uniqueId) openDetail(live);
    };

    const handleAddToTrade = (entry) => {
        const live = catalogById.get(entry.cardId);
        const stub = entry.card || {};
        const name = live?.displayName || live?.name || stub.name || 'Card';
        const subTypeName =
            live?.subTypeName ||
            stub.subTypeName ||
            (stub.isFoil ? 'Foil' : 'Normal');
        const price =
            Number(live?.marketPrice) ||
            Number(stub.tcgMarket) ||
            0;

        addCardToTradeDraft('want', {
            uniqueId: entry.cardId || live?._uniqueId || null,
            name,
            subTypeName,
            quantity: 1,
            price,
        });

        const shortName = live?.name || stub.name || 'Card';
        setToast(`Added ${shortName} to trade calculator`);
        capture('shared_binder_add_to_trade', {
            card_name: shortName,
        });
    };

    const ready = !loading && !error;

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Page>
                <PageHeader
                    title={sharedBinderTitle(ownerName)}
                    subtitle={
                        ready ? (
                            <Box
                                component="span"
                                sx={{ display: 'inline-flex', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}
                            >
                                <span>
                                    {entries.length} {entries.length === 1 ? 'card' : 'cards'}
                                </span>
                                <span aria-hidden>·</span>
                                <Box
                                    component="span"
                                    sx={{ color: 'text.primary', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {formatCurrency(totalValue.toFixed(2))}
                                </Box>
                                <span aria-hidden>·</span>
                                <span>Add cards straight to your trade calculator.</span>
                            </Box>
                        ) : null
                    }
                    actions={
                        ready && entries.length > 0 ? (
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <Select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    inputProps={{ 'aria-label': 'Sort cards' }}
                                    startAdornment={
                                        <SortRounded sx={{ fontSize: '1.1rem', color: 'text.secondary', mr: 1 }} />
                                    }
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.id} value={opt.id}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null
                    }
                />

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress size={36} />
                    </Box>
                )}

                {!loading && error && (
                    <Panel>
                        <EmptyState icon={<LinkOffRounded />} title="Binder unavailable">
                            {error}
                        </EmptyState>
                    </Panel>
                )}

                {ready && sorted.length === 0 && (
                    <Panel>
                        <EmptyState icon={<CollectionsBookmarkOutlined />} title="Nothing here yet">
                            This binder is empty.
                        </EmptyState>
                    </Panel>
                )}

                {ready && sorted.length > 0 && (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                sm: 'repeat(auto-fill, minmax(168px, 1fr))',
                            },
                            gap: { xs: 1.25, sm: 1.5 },
                        }}
                    >
                        {sorted.map((entry) => {
                            const card = resolveCard(entry);
                            const meta = [card.collectorNumber, card.finish, entry.condition]
                                .filter(Boolean)
                                .join(' · ');
                            return (
                                <Box
                                    key={`${entry.binderId || 'system:trade'}|${entry.cardId}|${entry.condition || 'NM'}`}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: 0,
                                        borderRadius: '14px',
                                        overflow: 'hidden',
                                        bgcolor: 'background.paper',
                                        border: 1,
                                        borderColor: 'divider',
                                        boxShadow: (t) => tk(t).shadowSm,
                                        transition: 'border-color 120ms ease, box-shadow 120ms ease',
                                        '&:hover': { borderColor: 'text.disabled', boxShadow: (t) => tk(t).shadowMd },
                                    }}
                                >
                                    <SharedCardArt
                                        imageUrl={card.imageUrl}
                                        fallbackUrl={card.imageUrlFallback}
                                        alt={card.name}
                                        qty={entry.quantity || 1}
                                        onClick={() => openEntryDetail(entry)}
                                    />
                                    <Box
                                        sx={{
                                            px: 1.25,
                                            pt: 1,
                                            pb: 1.25,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.4,
                                            flexGrow: 1,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.8125rem',
                                                color: 'text.primary',
                                                lineHeight: 1.25,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {card.name}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: '0.7rem',
                                                lineHeight: 1.3,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {meta || '—'}
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                justifyContent: 'space-between',
                                                gap: 1,
                                                mt: 'auto',
                                                pt: 0.4,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            <Typography sx={{ color: 'text.primary', fontSize: '0.8125rem', fontWeight: 750 }}>
                                                {card.market ? formatCurrency(card.market.toFixed(2)) : '—'}
                                            </Typography>
                                            <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                                                {entry.quantity || 1}×
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            fullWidth
                                            variant="contained"
                                            startIcon={<AddShoppingCartIcon sx={{ fontSize: '1rem !important' }} />}
                                            onClick={() => handleAddToTrade(entry)}
                                            sx={{ mt: 0.75, minHeight: 32, fontSize: '0.75rem' }}
                                        >
                                            Add to trade
                                        </Button>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Page>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={2500}
                onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ bottom: { xs: 'calc(var(--shell-bottom, 0px) + 16px)', sm: 24 } }}
            >
                <Alert onClose={() => setToast('')} severity="success" variant="filled" sx={{ width: '100%' }}>
                    {toast}
                </Alert>
            </Snackbar>
        </>
    );
};

export default SharedBinder;
