import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    List,
    ListItem,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    ToggleButtonGroup,
    ToggleButton,
    FormControlLabel,
    Switch,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    Style as StyleIcon,
} from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/elements/Header.jsx';
import { Page, Panel } from '../components/layout/Page.jsx';
import { CardThumbnail } from '../components/ui/CardImagePreview.jsx';
import FoilTag from '../components/ui/FoilTag.jsx';
import { useSets } from '../hooks/useSets.js';
import { useCardData } from '../hooks/useCardData.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { useCardDetail } from '../contexts/CardDetailContext.jsx';
import {
    isSignatureCard,
    isOvernumberedCard,
    isShowcaseCard,
    parseCardVariant,
    rarityColor,
} from '../utils/riftboundCards.js';

const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return '—';
    return `$${num.toFixed(2)}`;
};

const SORT_OPTIONS = [
    { value: 'market-desc', label: 'Market ↓' },
    { value: 'market-asc', label: 'Market ↑' },
    { value: 'low-desc', label: 'Low ↓' },
    { value: 'high-desc', label: 'High ↓' },
    { value: 'name', label: 'Name' },
    { value: 'number', label: '#' },
];

const getSortedCards = (cards, sortMode) => {
    const arr = [...cards];
    switch (sortMode) {
        case 'market-asc':
            return arr.sort((a, b) => (a.marketPrice || 0) - (b.marketPrice || 0));
        case 'low-desc':
            return arr.sort((a, b) => (b.lowPrice || 0) - (a.lowPrice || 0));
        case 'high-desc':
            return arr.sort((a, b) => (b.highPrice || 0) - (a.highPrice || 0));
        case 'name':
            return arr.sort((a, b) => {
                const an = a._baseName || a.name || '';
                const bn = b._baseName || b.name || '';
                const nameCmp = an.localeCompare(bn);
                if (nameCmp !== 0) return nameCmp;
                return (b.marketPrice || 0) - (a.marketPrice || 0);
            });
        case 'number':
            return arr.sort((a, b) => {
                const an = parseInt(String(a.extNumber || '').replace(/\D/g, ''), 10) || 0;
                const bn = parseInt(String(b.extNumber || '').replace(/\D/g, ''), 10) || 0;
                if (an !== bn) return an - bn;
                return (a.isFoil ? 1 : 0) - (b.isFoil ? 1 : 0);
            });
        case 'market-desc':
        default:
            return arr.sort((a, b) => {
                const priceCmp = (b.marketPrice || 0) - (a.marketPrice || 0);
                if (priceCmp !== 0) return priceCmp;
                const an = a._baseName || a.name || '';
                const bn = b._baseName || b.name || '';
                if (an !== bn) return an.localeCompare(bn);
                return (a.isFoil ? 1 : 0) - (b.isFoil ? 1 : 0);
            });
    }
};

const annotateCards = (cards) =>
    cards.map((card) => {
        const { baseName, artVariant } = parseCardVariant(card.name || '');
        return { ...card, _baseName: baseName, _artVariant: artVariant };
    });

const FilterToggle = ({ label, count, singular, plural, checked, onChange }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
        }}
    >
        <FormControlLabel
            control={
                <Switch
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    size="small"
                />
            }
            label={
                <Typography sx={{ fontSize: '0.84375rem', fontWeight: 600, color: 'text.primary' }}>
                    {label}
                </Typography>
            }
            sx={{ m: 0, gap: 0.5 }}
        />
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {checked
                ? `${count} ${count === 1 ? singular : plural} hidden`
                : `${count} ${count === 1 ? singular : plural} included`}
        </Typography>
    </Box>
);

const PRICE_COLUMNS = [
    { key: 'marketPrice', label: 'Market' },
    { key: 'lowPrice', label: 'Low' },
    { key: 'highPrice', label: 'High' },
];

// Rank · art · name/meta · Market · Low · High. Phones fold Low and High under
// Market so the row keeps one line of name.
const ROW_GRID = {
    display: 'grid',
    gridTemplateColumns: {
        xs: '22px auto minmax(0, 1fr) auto',
        sm: '28px auto minmax(0, 1fr) 84px 72px 72px',
    },
    alignItems: 'center',
    columnGap: { xs: 1.25, sm: 1.75 },
};

// Soft tinted tags for Riftbound's special printings, matching FoilTag.
const SPECIAL_TAGS = {
    signature: { label: 'Signature', light: ['#F1E8FD', '#6B21A8'], dark: ['rgba(192, 132, 252, 0.16)', '#D8B4FE'] },
    overnumbered: { label: 'Overnumbered', light: ['#FDEBDD', '#9A3412'], dark: ['rgba(251, 146, 60, 0.16)', '#FDBA74'] },
    showcase: { label: 'Showcase', light: ['#FCE7F3', '#9D174D'], dark: ['rgba(244, 114, 182, 0.16)', '#F9A8D4'] },
};

const SpecialTag = ({ kind, isDark }) => {
    const tag = SPECIAL_TAGS[kind];
    const [bg, fg] = isDark ? tag.dark : tag.light;
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 18,
                px: 0.75,
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 650,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                bgcolor: bg,
                color: fg,
            }}
        >
            {tag.label}
        </Box>
    );
};

const SetDetail = () => {
    const { setId } = useParams();
    const { getSetById, loading, error } = useSets();
    const { pricesUpdatedAt: lastUpdatedTimestamp } = useCardData();
    const { isDark } = useThemeMode();
    const { openDetail } = useCardDetail();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const [query, setQuery] = useState('');
    const [sortMode, setSortMode] = useState('market-desc');
    const [hideSignatures, setHideSignatures] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('riftrades-hide-signatures') === 'true';
    });
    const [hideOvernumbered, setHideOvernumbered] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('riftrades-hide-overnumbered') === 'true';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('riftrades-hide-signatures', String(hideSignatures));
    }, [hideSignatures]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('riftrades-hide-overnumbered', String(hideOvernumbered));
    }, [hideOvernumbered]);

    const set = useMemo(() => getSetById(setId), [getSetById, setId]);

    const annotated = useMemo(() => (set ? annotateCards(set.cards) : []), [set]);

    const signatureCount = useMemo(
        () => annotated.filter(isSignatureCard).length,
        [annotated]
    );
    const overnumberedCount = useMemo(
        () => annotated.filter(isOvernumberedCard).length,
        [annotated]
    );
    const showcaseCount = useMemo(
        () => annotated.filter(isShowcaseCard).length,
        [annotated]
    );

    const visibleCards = useMemo(() => {
        const toggled = annotated.filter((c) => {
            if (hideSignatures && isSignatureCard(c)) return false;
            if (hideOvernumbered && isOvernumberedCard(c)) return false;
            return true;
        });

        const q = query.trim().toLowerCase();
        const filtered = q
            ? toggled.filter((c) => {
                const name = (c.name || '').toLowerCase();
                const num = (c.extNumber || '').toLowerCase();
                const rarity = (c.extRarity || '').toLowerCase();
                const sub = (c.subTypeName || '').toLowerCase();
                const variant = (c._artVariant || '').toLowerCase();
                return (
                    name.includes(q) ||
                    num.includes(q) ||
                    rarity.includes(q) ||
                    sub.includes(q) ||
                    variant.includes(q)
                );
            })
            : toggled;

        return getSortedCards(filtered, sortMode);
    }, [annotated, query, sortMode, hideSignatures, hideOvernumbered]);

    const openCard = (card) => {
        if (card?._uniqueId) openDetail(card);
    };

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Page maxWidth={1080}>
                <Button
                    component={Link}
                    to="/sets"
                    size="small"
                    color="inherit"
                    startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
                    sx={{ mb: 2, ml: -1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                    All sets
                </Button>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {!loading && !error && !set && (
                    <Alert severity="warning">Set not found.</Alert>
                )}

                {!loading && set && (
                    <>
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="h1"
                                sx={{ fontSize: { xs: '1.6rem', md: '2.25rem' }, color: 'text.primary', textWrap: 'balance' }}
                            >
                                {set.name}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    columnGap: 1.5,
                                    rowGap: 0.5,
                                    mt: 1,
                                    flexWrap: 'wrap',
                                    color: 'text.secondary',
                                    fontSize: '0.8125rem',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                    <StyleIcon sx={{ fontSize: 14 }} />
                                    {set.cards.length} printings
                                    {signatureCount > 0 ? ` · ${signatureCount} signatures` : ''}
                                    {overnumberedCount > 0 ? ` · ${overnumberedCount} overnumbered` : ''}
                                    {showcaseCount > 0 ? ` · ${showcaseCount} showcase` : ''}
                                </Box>
                                {set.topMarketPrice > 0 && (
                                    <Box component="span">
                                        Top card{' '}
                                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                                            {formatMoney(set.topMarketPrice)}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                gap: 1.5,
                                mb: 2,
                                alignItems: { xs: 'stretch', md: 'center' },
                            }}
                        >
                            <TextField
                                placeholder="Filter by name, number, rarity or finish…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                size="small"
                                inputProps={{ 'aria-label': 'Filter cards' }}
                                sx={{ flexGrow: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={sortMode}
                                onChange={(_, v) => v && setSortMode(v)}
                                aria-label="Sort cards"
                                sx={{ flexWrap: 'wrap', alignSelf: { xs: 'flex-start', md: 'auto' } }}
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.5, py: 0.5 }}>
                                        {opt.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        {(signatureCount > 0 || overnumberedCount > 0) && (
                            <Panel
                                sx={{
                                    mb: 2,
                                    px: 2,
                                    py: 1.25,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                }}
                            >
                                {signatureCount > 0 && (
                                    <FilterToggle
                                        label="Hide signature cards"
                                        count={signatureCount}
                                        singular="signature"
                                        plural="signatures"
                                        checked={hideSignatures}
                                        onChange={setHideSignatures}
                                    />
                                )}
                                {overnumberedCount > 0 && (
                                    <FilterToggle
                                        label="Hide overnumbered cards"
                                        count={overnumberedCount}
                                        singular="overnumbered card"
                                        plural="overnumbered cards"
                                        checked={hideOvernumbered}
                                        onChange={setHideOvernumbered}
                                    />
                                )}
                            </Panel>
                        )}

                        <Panel sx={{ overflow: 'hidden' }}>
                            <Box
                                aria-hidden
                                sx={{
                                    ...ROW_GRID,
                                    display: { xs: 'none', sm: 'grid' },
                                    px: 2,
                                    py: 1,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: 'surface.sunken',
                                    color: 'text.secondary',
                                    fontSize: '0.6875rem',
                                    fontWeight: 650,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                <Box sx={{ textAlign: 'right' }}>#</Box>
                                <Box sx={{ gridColumn: 'span 2' }}>Card</Box>
                                {PRICE_COLUMNS.map((col) => (
                                    <Box key={col.key} sx={{ textAlign: 'right' }}>{col.label}</Box>
                                ))}
                            </Box>
                            <List disablePadding>
                                {visibleCards.length === 0 && (
                                    <ListItem>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                                            No cards match your filter.
                                        </Typography>
                                    </ListItem>
                                )}
                                {visibleCards.map((card, idx) => {
                                    const isSig = isSignatureCard(card);
                                    const isOver = isOvernumberedCard(card);
                                    const isShow = isShowcaseCard(card);
                                    const rColor = rarityColor(card.extRarity, isDark);

                                    return (
                                        <ListItem
                                            key={card._uniqueId || `${card.productId}-${card.subTypeName}-${idx}`}
                                            sx={{
                                                ...ROW_GRID,
                                                px: { xs: 1.5, sm: 2 },
                                                py: 1,
                                                borderBottom: idx === visibleCards.length - 1 ? 0 : 1,
                                                borderColor: 'divider',
                                                transition: 'background-color 120ms ease',
                                                '&:hover': { bgcolor: 'action.hover' },
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.disabled',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {idx + 1}
                                            </Typography>

                                            <CardThumbnail
                                                imageUrl={card.imageUrl}
                                                fallbackUrl={card.imageUrlFallback}
                                                alt={card.name}
                                                size={isSmall ? 34 : 40}
                                                onClick={() => openCard(card)}
                                            />

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    component={card._uniqueId ? 'button' : 'span'}
                                                    type={card._uniqueId ? 'button' : undefined}
                                                    onClick={card._uniqueId ? () => openCard(card) : undefined}
                                                    aria-label={card._uniqueId ? `View details for ${card.name}` : undefined}
                                                    variant="body2"
                                                    sx={{
                                                        display: 'block',
                                                        maxWidth: '100%',
                                                        color: 'text.primary',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        border: 0,
                                                        background: 'none',
                                                        p: 0,
                                                        m: 0,
                                                        textAlign: 'left',
                                                        fontFamily: 'inherit',
                                                        cursor: card._uniqueId ? 'pointer' : 'default',
                                                        '&:hover': card._uniqueId ? { color: 'primary.main' } : undefined,
                                                    }}
                                                >
                                                    {card._baseName || card.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.4, alignItems: 'center' }}>
                                                    {card.extNumber && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                            #{card.extNumber}
                                                        </Typography>
                                                    )}
                                                    {card.extRarity && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: rColor,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                mr: 0.25,
                                                            }}
                                                        >
                                                            · {card.extRarity}
                                                        </Typography>
                                                    )}
                                                    {card.isFoil && (
                                                        <FoilTag subTypeName={card.subTypeName || 'Foil'} />
                                                    )}
                                                    {isSig && <SpecialTag kind="signature" isDark={isDark} />}
                                                    {isOver && <SpecialTag kind="overnumbered" isDark={isDark} />}
                                                    {isShow && !isSig && !isOver && <SpecialTag kind="showcase" isDark={isDark} />}
                                                </Box>
                                            </Box>

                                            {isSmall ? (
                                                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary', lineHeight: 1.3 }}>
                                                        {formatMoney(card.marketPrice)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                        {formatMoney(card.lowPrice)} – {formatMoney(card.highPrice)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                PRICE_COLUMNS.map((col, colIdx) => (
                                                    <Typography
                                                        key={col.key}
                                                        sx={{
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: colIdx === 0 ? 700 : 500,
                                                            fontSize: colIdx === 0 ? '0.9375rem' : '0.84375rem',
                                                            color: colIdx === 0 ? 'text.primary' : 'text.secondary',
                                                        }}
                                                    >
                                                        {formatMoney(card[col.key])}
                                                    </Typography>
                                                ))
                                            )}
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Panel>
                    </>
                )}
            </Page>
        </>
    );
};

export default SetDetail;
