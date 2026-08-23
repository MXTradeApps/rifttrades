import { useMemo, useState } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Search as SearchIcon,
    Style as StyleIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Header from '../components/elements/Header.jsx';
import { useSets } from '../hooks/useSets.js';
import { useCardData } from '../hooks/useCardData.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';

const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return '—';
    return `$${num.toFixed(2)}`;
};

const SetList = () => {
    const { sets, loading, error } = useSets();
    const { metadata } = useCardData();
    const lastUpdatedTimestamp = metadata?.lastUpdated || metadata?.updatedAt || null;
    const { isDark } = useThemeMode();
    const [query, setQuery] = useState('');

    const filteredSets = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sets;
        return sets.filter((s) => s.name.toLowerCase().includes(q));
    }, [sets, query]);

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #061825 0%, #0a2540 50%, #0d3050 100%)'
        : 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 50%, #c0dce8 100%)';
    const textColor = isDark ? '#e8f4f8' : '#0a2540';
    const mutedColor = isDark ? '#a0c4d4' : '#1a4a6e';
    const accent = isDark ? '#d4a853' : '#1a5a7a';
    const paperBg = isDark ? 'rgba(13, 48, 80, 0.6)' : '#ffffff';
    const paperBorder = isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)';

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                pb: '28px',
                background: bgGradient,
                backgroundAttachment: 'fixed',
            }}
        >
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            color: textColor,
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', md: '2rem' },
                        }}
                    >
                        Browse Sets
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedColor }}>
                        Pick a set to see its cards ranked by TCGplayer market price.
                    </Typography>
                </Box>

                <TextField
                    fullWidth
                    placeholder="Search sets..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: paperBg,
                            '& fieldset': { borderColor: paperBorder },
                            '&:hover fieldset': { borderColor: accent },
                        },
                        '& input': { color: textColor },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: mutedColor }} />
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
                        <CircularProgress sx={{ color: accent }} />
                    </Box>
                ) : (
                    <Paper
                        elevation={0}
                        sx={{
                            backgroundColor: paperBg,
                            border: `1px solid ${paperBorder}`,
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}
                    >
                        <List disablePadding>
                            {filteredSets.length === 0 && (
                                <ListItem>
                                    <Typography variant="body2" sx={{ color: mutedColor, py: 2 }}>
                                        No sets match your search.
                                    </Typography>
                                </ListItem>
                            )}
                            {filteredSets.map((set, idx) => {
                                const isLast = idx === filteredSets.length - 1;
                                return (
                                    <ListItem
                                        key={set.slug || set.name}
                                        disablePadding
                                        sx={{
                                            borderBottom: isLast
                                                ? 'none'
                                                : `1px solid ${isDark ? 'rgba(212, 168, 83, 0.12)' : 'rgba(26, 90, 122, 0.08)'}`,
                                        }}
                                    >
                                        <ListItemButton
                                            component={Link}
                                            to={`/sets/${set.slug}`}
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                '&:hover': {
                                                    backgroundColor: isDark
                                                        ? 'rgba(212, 168, 83, 0.1)'
                                                        : 'rgba(26, 90, 122, 0.06)',
                                                },
                                            }}
                                        >
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        color: textColor,
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {set.name}
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        mt: 0.5,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <StyleIcon sx={{ fontSize: 14, color: mutedColor }} />
                                                        <Typography variant="caption" sx={{ color: mutedColor }}>
                                                            {set.cardCount} cards
                                                        </Typography>
                                                    </Box>
                                                    {set.topMarketPrice > 0 && (
                                                        <Chip
                                                            size="small"
                                                            label={`Top ${formatMoney(set.topMarketPrice)}`}
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.7rem',
                                                                backgroundColor: isDark
                                                                    ? 'rgba(212, 168, 83, 0.2)'
                                                                    : 'rgba(26, 90, 122, 0.1)',
                                                                color: isDark ? '#e5c078' : '#1a5a7a',
                                                                border: `1px solid ${paperBorder}`,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                            <ChevronRightIcon sx={{ color: mutedColor, flexShrink: 0 }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                )}
            </Container>
        </Box>
    );
};

export default SetList;
