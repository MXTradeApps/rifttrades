import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    Button,
    Tooltip,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    ListItemIcon,
} from '@mui/material';
import {
    DarkMode,
    LightMode,
    Menu as MenuIcon,
    Close as CloseIcon,
    Home as HomeIcon,
    Style as BrowseIcon,
    PrivacyTip as PrivacyIcon,
    SupportAgent as SupportIcon,
    CollectionsBookmark as BinderIcon,
    FavoriteBorder as WantIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { formatTimestamp } from "../../utils/helpers.js";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";
import LoginButton from "../auth/LoginButton.jsx";

const NAV_ITEMS = [
    { label: 'Trade Calculator', to: '/', icon: HomeIcon, match: (path) => path === '/' },
    { label: 'Browse Sets', to: '/sets', icon: BrowseIcon, match: (path) => path.startsWith('/sets') },
    { label: 'My Binders', to: '/binder', icon: BinderIcon, match: (path) => path === '/binder' },
    { label: 'Want List', to: '/wants', icon: WantIcon, match: (path) => path === '/wants' },
    { label: 'Trade History', to: '/history', icon: HistoryIcon, match: (path) => path === '/history' },
];

const Header = ({ lastUpdatedTimestamp }) => {
    const { isDark, toggleMode } = useThemeMode();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();

    const navButtonSx = (active) => ({
        display: { xs: 'none', sm: 'inline-flex' },
        color: active ? '#ffffff' : '#d4a853',
        fontWeight: active ? 700 : 600,
        fontSize: '0.875rem',
        textTransform: 'none',
        minWidth: 0,
        px: 1,
        py: 0.35,
        whiteSpace: 'nowrap',
        backgroundColor: active ? 'rgba(212, 168, 83, 0.25)' : 'transparent',
        '&:hover': {
            backgroundColor: 'rgba(212, 168, 83, 0.15)',
        },
    });

    return (
        <>
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #0a2540 0%, #0d3050 50%, #1a4a6e 100%)',
                    borderBottom: '2px solid #d4a853',
                    boxShadow: '0 2px 10px rgba(10, 37, 64, 0.45)'
                }}
            >
                <Toolbar
                    variant="dense"
                    sx={{
                        position: 'relative',
                        px: { xs: 0.75, sm: 1.5, md: 2 },
                        py: 0.5,
                        minHeight: { xs: 48, sm: 52 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        minWidth: 0,
                        flexShrink: 1,
                        zIndex: 1,
                    }}>
                        <Tooltip title="Menu">
                            <IconButton
                                onClick={() => setDrawerOpen(true)}
                                size="small"
                                aria-label="Menu"
                                sx={{
                                    color: '#d4a853',
                                    p: 0.75,
                                    '&:hover': {
                                        backgroundColor: 'rgba(212, 168, 83, 0.15)',
                                    }
                                }}
                            >
                                <MenuIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Button
                            component={Link}
                            to="/"
                            size="small"
                            sx={navButtonSx(location.pathname === '/')}
                        >
                            Trade Calculator
                        </Button>
                        <Button
                            component={Link}
                            to="/binder"
                            size="small"
                            sx={navButtonSx(location.pathname === '/binder')}
                        >
                            My Binders
                        </Button>
                    </Box>

                    <Box
                        component={Link}
                        to="/"
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.75,
                            zIndex: 0,
                            textDecoration: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <Box
                            component="img"
                            src="/app_icon.png"
                            alt="RiftTrades"
                            sx={{
                                width: { xs: 24, sm: 28 },
                                height: { xs: 24, sm: 28 },
                                borderRadius: 1,
                                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.6rem' },
                                background: 'linear-gradient(135deg, #e5c078 0%, #d4a853 50%, #b8892e 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '0.02em',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            RiftTrades
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        flexShrink: 0,
                        zIndex: 1,
                        ml: 'auto',
                    }}>
                        <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                            <IconButton
                                onClick={toggleMode}
                                size="small"
                                sx={{
                                    color: '#d4a853',
                                    p: 0.75,
                                    '&:hover': {
                                        backgroundColor: 'rgba(212, 168, 83, 0.15)',
                                    }
                                }}
                            >
                                {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        <LoginButton />
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="footer"
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                    py: 0.5,
                    px: 1.5,
                    textAlign: 'center',
                    borderTop: '1px solid',
                    borderColor: isDark ? 'rgba(212, 168, 83, 0.25)' : 'rgba(26, 90, 122, 0.2)',
                    background: isDark
                        ? 'rgba(6, 24, 37, 0.92)'
                        : 'rgba(232, 244, 248, 0.94)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <Typography
                    sx={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        color: isDark ? '#a0c4d4' : '#1a4a6e',
                        opacity: 0.9,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    Prices last updated: {lastUpdatedTimestamp ? formatTimestamp(lastUpdatedTimestamp) : 'Loading...'}
                </Typography>
            </Box>

            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: 280, sm: 320 },
                        background: isDark
                            ? 'linear-gradient(180deg, #0d3050 0%, #0a2540 100%)'
                            : 'linear-gradient(180deg, #ffffff 0%, #e8f4f8 100%)',
                        borderRight: `3px solid ${isDark ? '#d4a853' : '#1a5a7a'}`
                    }
                }}
            >
                <Box sx={{
                    px: 2.5,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #0a2540 0%, #0d3050 50%, #1a4a6e 100%)',
                    borderBottom: '2px solid #d4a853'
                }}>
                    <Typography sx={{
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #e5c078 0%, #d4a853 50%, #b8892e 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Menu
                    </Typography>
                    <IconButton
                        onClick={() => setDrawerOpen(false)}
                        sx={{ color: '#d4a853', p: 0.5 }}
                        size="small"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <List sx={{ py: 1 }}>
                    {NAV_ITEMS.map(({ label, to, icon: Icon, match }) => {
                        const selected = match(location.pathname);
                        return (
                            <ListItemButton
                                key={to}
                                component={Link}
                                to={to}
                                selected={selected}
                                onClick={() => setDrawerOpen(false)}
                                sx={{
                                    mx: 1,
                                    borderRadius: 2,
                                    '&.Mui-selected': {
                                        backgroundColor: isDark
                                            ? 'rgba(212, 168, 83, 0.15)'
                                            : 'rgba(26, 90, 122, 0.1)',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ color: isDark ? '#d4a853' : '#1a5a7a', minWidth: 40 }}>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    primaryTypographyProps={{
                                        fontWeight: 600,
                                        color: isDark ? '#e8f4f8' : '#0a2540'
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}

                    <ListItemButton
                        component={Link}
                        to="/support"
                        selected={location.pathname === '/support'}
                        onClick={() => setDrawerOpen(false)}
                        sx={{
                            mx: 1,
                            borderRadius: 2,
                            '&.Mui-selected': {
                                backgroundColor: isDark
                                    ? 'rgba(212, 168, 83, 0.15)'
                                    : 'rgba(26, 90, 122, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: isDark ? '#d4a853' : '#1a5a7a', minWidth: 40 }}>
                            <SupportIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="Support"
                            primaryTypographyProps={{
                                fontWeight: 600,
                                color: isDark ? '#e8f4f8' : '#0a2540'
                            }}
                        />
                    </ListItemButton>

                    <ListItemButton
                        component={Link}
                        to="/privacy"
                        selected={location.pathname === '/privacy'}
                        onClick={() => setDrawerOpen(false)}
                        sx={{
                            mx: 1,
                            borderRadius: 2,
                            '&.Mui-selected': {
                                backgroundColor: isDark
                                    ? 'rgba(212, 168, 83, 0.15)'
                                    : 'rgba(26, 90, 122, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: isDark ? '#d4a853' : '#1a5a7a', minWidth: 40 }}>
                            <PrivacyIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="Privacy Policy"
                            primaryTypographyProps={{
                                fontWeight: 600,
                                color: isDark ? '#e8f4f8' : '#0a2540'
                            }}
                        />
                    </ListItemButton>
                </List>
            </Drawer>
        </>
    );
};

export default Header;
