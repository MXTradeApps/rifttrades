import { useMemo, useState } from 'react';
import {
    Box,
    ButtonBase,
    Typography,
    TextField,
    InputAdornment,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Search as SearchIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Header from '../components/elements/Header.jsx';
import { Page, PageHeader, SectionTitle } from '../components/layout/Page.jsx';
import { tk } from '../theme/tokens.js';
import { useSets } from '../hooks/useSets.js';
import { useCardData } from '../hooks/useCardData.jsx';

const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return '—';
    return `$${num.toFixed(2)}`;
};

// Set code from the collector number prefix ("OGN-001" -> "OGN").
const setCodeFromNumber = (extNumber) => {
    const match = /^([A-Za-z]{2,5})[-\s]/.exec(String(extNumber || ''));
    return match ? match[1].toUpperCase() : null;
};

/**
 * Set tile: the set code on a neutral plate, then the name and the numbers
 * people scan for.
 */
const SetTile = ({ set, code }) => (
    <ButtonBase
        component={Link}
        to={`/sets/${set.slug}`}
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            textAlign: 'left',
            minWidth: 0,
            borderRadius: '14px',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            transition: 'border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
            '&:hover': {
                borderColor: 'text.disabled',
                boxShadow: (t) => tk(t).shadowMd,
            },
            '&:hover .set-tile-arrow': { transform: 'translateX(2px)', color: 'text.primary' },
            '&.Mui-focusVisible': { borderColor: 'primary.main' },
        }}
    >
        <Box
            sx={{
                height: { xs: 68, sm: 84 },
                display: 'grid',
                placeItems: 'center',
                px: 2.5,
                bgcolor: 'surface.sunken',
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <Typography
                aria-hidden
                sx={{
                    fontFamily: (t) => t.typography.h1.fontFamily,
                    fontWeight: 800,
                    fontStretch: '120%',
                    fontSize: '1.6rem',
                    letterSpacing: '0.02em',
                    color: 'text.disabled',
                }}
            >
                {code || set.name.slice(0, 3).toUpperCase()}
            </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
                    <Typography
                        variant="subtitle1"
                        noWrap
                        sx={{ color: 'text.primary', fontWeight: 650, lineHeight: 1.3, minWidth: 0 }}
                    >
                        {set.name}
                    </Typography>
                    {code ? (
                        <Typography
                            component="span"
                            sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}
                        >
                            {code}
                        </Typography>
                    ) : null}
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        columnGap: 1.5,
                        rowGap: 0.25,
                        mt: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    <span>{set.cardCount} cards</span>
                    {set.topMarketPrice > 0 && (
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Top {formatMoney(set.topMarketPrice)}
                        </Box>
                    )}
                </Box>
            </Box>
            <ChevronRightIcon
                className="set-tile-arrow"
                sx={{ color: 'text.disabled', flexShrink: 0, transition: 'transform 120ms ease, color 120ms ease' }}
            />
        </Box>
    </ButtonBase>
);

const SetList = () => {
    const { sets, loading, error } = useSets();
    const { metadata, cards } = useCardData();
    const lastUpdatedTimestamp = metadata?.lastUpdated || metadata?.updatedAt || null;
    const [query, setQuery] = useState('');

    const filteredSets = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sets;
        return sets.filter((s) => s.name.toLowerCase().includes(q));
    }, [sets, query]);

    const setCodes = useMemo(() => {
        const map = new Map();
        for (const card of cards || []) {
            if (!card._setName || map.has(card._setName)) continue;
            const code = setCodeFromNumber(card.extNumber);
            if (code) map.set(card._setName, code);
        }
        return map;
    }, [cards]);

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Page>
                <PageHeader
                    title="Browse Sets"
                    subtitle="Pick a set to see its cards ranked by TCGplayer market price."
                />

                <TextField
                    fullWidth
                    placeholder="Search sets…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    inputProps={{ 'aria-label': 'Search sets' }}
                    sx={{ mb: 3, maxWidth: 640 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredSets.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                        {sets.length === 0 ? 'No sets available.' : 'No sets match your search.'}
                    </Typography>
                ) : (
                    <Box component="section">
                        <SectionTitle count={filteredSets.length}>
                            {query.trim() ? 'Matching sets' : 'All sets'}
                        </SectionTitle>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    lg: 'repeat(3, minmax(0, 1fr))',
                                },
                                gap: 1.5,
                            }}
                        >
                            {filteredSets.map((set) => (
                                <SetTile key={set.slug || set.name} set={set} code={setCodes.get(set.name)} />
                            ))}
                        </Box>
                    </Box>
                )}
            </Page>
        </>
    );
};

export default SetList;
