import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CardList from './CardList.jsx';
import { SearchInput, SearchDialog } from '../search';
import { useThemeMode } from "../../contexts/ThemeContext.jsx";

const CardPanel = ({ 
    allCards, 
    title, 
    cards, 
    cardOptions, 
    inputValue, 
    onInputChange, 
    onAddCard, 
    onRemoveCard, 
    onUpdateQuantity,
    isMobile, 
    totalColor = 'primary',
    disabled = false,
    isLandscape = false,
    viewMode = 'list',
}) => {
    const { isDark } = useThemeMode();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);

    return (
        <Paper 
            elevation={isLandscape ? 3 : 0}
            sx={{ 
                flex: 1,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: isLandscape ? 0 : { xs: '250px', sm: '300px', md: '350px' },
                height: isLandscape ? '100%' : 'auto',
                overflow: 'hidden',
                p: isLandscape ? 1.25 : { xs: 1.5, sm: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: isLandscape ? 3 : 0,
                border: isLandscape 
                    ? `2px solid ${isDark ? 'rgba(58, 154, 186, 0.2)' : 'rgba(26, 90, 122, 0.15)'}` 
                    : `1px solid ${isDark ? 'rgba(58, 154, 186, 0.25)' : 'rgba(26, 90, 122, 0.15)'}`,
                borderTop: isLandscape 
                    ? `2px solid ${isDark ? 'rgba(58, 154, 186, 0.2)' : 'rgba(26, 90, 122, 0.15)'}` 
                    : `4px solid ${isDark ? '#d4a853' : '#1a5a7a'}`,
                boxSizing: 'border-box',
                background: isDark 
                    ? 'linear-gradient(180deg, #0d3050 0%, #0a2540 100%)' 
                    : 'linear-gradient(180deg, #ffffff 0%, #f0f8fa 100%)',
                boxShadow: isLandscape 
                    ? '0 8px 24px rgba(10, 37, 64, 0.2)' 
                    : '0 2px 8px rgba(10, 37, 64, 0.1)',
                '&:hover': {
                    boxShadow: isLandscape 
                        ? '0 12px 32px rgba(10, 37, 64, 0.25)' 
                        : '0 4px 12px rgba(10, 37, 64, 0.15)',
                    transform: isLandscape ? 'translateY(-2px)' : 'none',
                    borderTopColor: '#d4a853'
                }
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                mb: isLandscape ? 1 : { xs: 1.5, sm: 2 },
                width: '100%',
                pb: isLandscape ? 0.75 : 1.5,
                flexShrink: 0,
                borderBottom: `2px solid ${isDark ? 'rgba(212, 168, 83, 0.3)' : 'rgba(26, 90, 122, 0.15)'}`
            }}>
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontSize: isLandscape
                            ? '0.95rem'
                            : { xs: '1.1rem', sm: '1.25rem', md: '1.35rem' },
                        fontWeight: 700,
                        color: isDark ? '#e5c078' : '#0a2540',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {title}
                </Typography>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isSmallScreen ? (
                        <Box
                            onClick={() => !disabled && setSearchDialogOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!disabled) setSearchDialogOpen(true);
                                }
                            }}
                            aria-label={`Search cards for ${title}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                minHeight: 36,
                                px: 1,
                                borderRadius: 1,
                                border: isDark
                                    ? '1px solid rgba(58, 154, 186, 0.3)'
                                    : '1px solid rgba(26, 90, 122, 0.25)',
                                backgroundColor: isDark ? '#0a2540' : '#ffffff',
                                cursor: disabled ? 'default' : 'pointer',
                                opacity: disabled ? 0.6 : 1,
                            }}
                        >
                            <SearchIcon sx={{
                                fontSize: '1rem',
                                color: isDark ? '#a0c4d4' : '#1a5a7a',
                            }} />
                            <Typography
                                variant="body2"
                                sx={{
                                    color: isDark ? 'rgba(160, 196, 212, 0.75)' : 'rgba(26, 74, 110, 0.55)',
                                    fontSize: '0.8125rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Search cards…
                            </Typography>
                        </Box>
                    ) : (
                        <SearchInput
                            label=""
                            placeholder="Search cards…"
                            items={cardOptions || []}
                            value={inputValue || ''}
                            onChange={onInputChange}
                            onSelect={onAddCard}
                            disabled={disabled}
                            fullWidth
                            size="small"
                            placement="bottom"
                            keepOpenOnSelect
                            keepInputOnSelect
                        />
                    )}
                </Box>
            </Box>
            
            <CardList
                cards={cards}
                onRemoveCard={onRemoveCard}
                onUpdateQuantity={onUpdateQuantity}
                disabled={disabled}
                viewMode={viewMode}
                isLandscape={isLandscape}
            />

            <SearchDialog
                open={searchDialogOpen}
                onClose={() => setSearchDialogOpen(false)}
                title={`Search Cards for ${title}`}
                items={cardOptions || []}
                onSelect={(card) => {
                    if (card) onAddCard(card);
                }}
                keepOpenOnSelect
                keepInputOnSelect
            />
        </Paper>
    );
};

export default CardPanel;
