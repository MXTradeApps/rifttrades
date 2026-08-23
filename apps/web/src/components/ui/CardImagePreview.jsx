import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Modal, 
    IconButton, 
    CircularProgress,
    Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';

/**
 * Get image URL - TCGPlayer CDN uses _200w suffix
 * For larger sizes, we just use the original URL as-is since higher res might not exist
 */
export const getImageUrl = (imageUrl, size = 'medium') => {
    if (!imageUrl) return null;
    // Just return the original URL - TCGPlayer provides 200w by default which is sufficient
    return imageUrl;
};

/**
 * Small thumbnail component for card lists
 */
export const CardThumbnail = ({ imageUrl, fallbackUrl, alt, size = 40, onClick }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(imageUrl);
    const { isDark } = useThemeMode();

    // Reset state when imageUrl changes
    useEffect(() => {
        setLoaded(false);
        setError(false);
        setCurrentSrc(imageUrl);
    }, [imageUrl]);

    const handleError = () => {
        if (fallbackUrl && currentSrc !== fallbackUrl) {
            setCurrentSrc(fallbackUrl);
        } else {
            setError(true);
        }
    };

    if (!currentSrc || error) {
        return (
            <Box
                onClick={onClick}
                sx={{
                    width: size,
                    height: size * 1.4,
                    borderRadius: 1,
                    backgroundColor: isDark ? 'rgba(58, 154, 186, 0.15)' : 'rgba(26, 90, 122, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: onClick ? 'pointer' : 'default',
                    border: isDark ? '1px solid rgba(58, 154, 186, 0.2)' : '1px solid rgba(26, 90, 122, 0.15)'
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontSize: '0.5rem',
                        color: isDark ? 'rgba(160, 196, 212, 0.5)' : 'rgba(26, 90, 122, 0.4)',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        px: 0.25
                    }}
                >
                    No Image
                </Box>
            </Box>
        );
    }

    return (
        <Box
            onClick={onClick}
            sx={{
                width: size,
                height: size * 1.4,
                borderRadius: 1,
                overflow: 'hidden',
                flexShrink: 0,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                boxShadow: isDark 
                    ? '0 2px 4px rgba(0, 0, 0, 0.3)' 
                    : '0 2px 4px rgba(10, 37, 64, 0.15)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': onClick ? {
                    transform: 'scale(1.05)',
                    boxShadow: isDark 
                        ? '0 4px 8px rgba(0, 0, 0, 0.5)' 
                        : '0 4px 8px rgba(10, 37, 64, 0.25)'
                } : {}
            }}
        >
            {!loaded && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'rgba(13, 48, 80, 0.5)' : 'rgba(232, 244, 248, 0.5)'
                    }}
                >
                    <CircularProgress size={12} sx={{ color: isDark ? '#5abada' : '#1a5a7a' }} />
                </Box>
            )}
            <img
                src={currentSrc}
                alt={alt}
                onLoad={() => setLoaded(true)}
                onError={handleError}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                }}
            />
        </Box>
    );
};

/**
 * Hover preview component - shows larger image on hover
 */
export const CardHoverPreview = ({ imageUrl, alt, children, placement = 'right' }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { isDark } = useThemeMode();

    if (!imageUrl) {
        return children;
    }

    return (
        <Box
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => {
                setShowPreview(false);
                setLoaded(false);
            }}
            sx={{ position: 'relative', display: 'flex', width: '100%' }}
        >
            {children}
            
            <Fade in={showPreview} timeout={200}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        [placement === 'right' ? 'left' : 'right']: '100%',
                        transform: 'translateY(-50%)',
                        ml: placement === 'right' ? 1 : 0,
                        mr: placement === 'left' ? 1 : 0,
                        zIndex: 1400,
                        pointerEvents: 'none',
                        display: showPreview ? 'block' : 'none'
                    }}
                >
                    <Box
                        sx={{
                            width: 150,
                            height: 210,
                            borderRadius: 2,
                            overflow: 'hidden',
                            boxShadow: isDark 
                                ? '0 8px 24px rgba(0, 0, 0, 0.6)' 
                                : '0 8px 24px rgba(10, 37, 64, 0.3)',
                            border: `2px solid ${isDark ? '#d4a853' : '#1a5a7a'}`,
                            backgroundColor: isDark ? '#0d3050' : '#ffffff',
                            position: 'relative'
                        }}
                    >
                        {!loaded && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? '#0d3050' : '#e8f4f8'
                                }}
                            >
                                <CircularProgress size={24} sx={{ color: isDark ? '#d4a853' : '#1a5a7a' }} />
                            </Box>
                        )}
                        <img
                            src={imageUrl}
                            alt={alt}
                            onLoad={() => setLoaded(true)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: loaded ? 1 : 0,
                                transition: 'opacity 0.2s ease'
                            }}
                        />
                    </Box>
                </Box>
            </Fade>
        </Box>
    );
};

/**
 * Full-screen modal for viewing card image
 */
export const CardImageModal = ({ open, onClose, imageUrl, fallbackUrl, cardName }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(imageUrl || fallbackUrl);
    const { isDark } = useThemeMode();

    // Reset state when modal opens/closes or imageUrl changes
    useEffect(() => {
        if (open) {
            setLoaded(false);
            setError(false);
            setCurrentSrc(imageUrl || fallbackUrl);
        }
    }, [open, imageUrl, fallbackUrl]);

    const handleError = () => {
        if (fallbackUrl && currentSrc !== fallbackUrl) {
            setCurrentSrc(fallbackUrl);
        } else {
            setError(true);
        }
    };

    const handleClose = () => {
        onClose();
    };

    if (!imageUrl && !fallbackUrl) return null;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        position: 'relative',
                        outline: 'none'
                    }}
                >
                    {/* Close button */}
                    <IconButton
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            top: -40,
                            right: 0,
                            color: '#ffffff',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            },
                            zIndex: 1
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    
                    {/* Card image container */}
                    <Box
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                            border: `3px solid ${isDark ? '#d4a853' : '#1a5a7a'}`,
                            backgroundColor: isDark ? '#0d3050' : '#ffffff',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {!loaded && !error && (
                            <Box
                                sx={{
                                    width: 280,
                                    height: 392,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? '#0d3050' : '#e8f4f8'
                                }}
                            >
                                <CircularProgress size={48} sx={{ color: isDark ? '#d4a853' : '#1a5a7a' }} />
                            </Box>
                        )}
                        {error && (
                            <Box
                                sx={{
                                    width: 280,
                                    height: 392,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? '#0d3050' : '#e8f4f8',
                                    color: isDark ? '#a0c4d4' : '#1a4a6e',
                                    textAlign: 'center',
                                    px: 3
                                }}
                            >
                                No Card Image Available
                            </Box>
                        )}
                        <img
                            src={currentSrc}
                            alt={cardName}
                            onLoad={() => setLoaded(true)}
                            onError={handleError}
                            style={{
                                maxWidth: '85vw',
                                maxHeight: '85vh',
                                display: loaded ? 'block' : 'none'
                            }}
                        />
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default { CardThumbnail, CardHoverPreview, CardImageModal, getImageUrl };
