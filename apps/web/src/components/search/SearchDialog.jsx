import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchInput from './SearchInput';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';

/**
 * SearchDialog Component
 * Full-screen search dialog for mobile devices
 */
const SearchDialog = ({
    open,
    onClose,
    title = 'Search',
    items = [],
    onSelect,
    keepOpenOnSelect = false,
    keepInputOnSelect = false,
}) => {
    const { isDark } = useThemeMode();
    const [searchValue, setSearchValue] = useState('');

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchValue('');
        }
    }, [open]);

    const handleSelect = (item) => {
        onSelect?.(item);
        if (!keepInputOnSelect) {
            setSearchValue('');
        }
        if (!keepOpenOnSelect) {
            onClose();
        }
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDialog-paper': {
                    backgroundColor: isDark ? '#0a2540' : '#e8f4f8'
                }
            }}
        >
            <AppBar 
                position="static" 
                elevation={0}
                sx={{ 
                    background: 'linear-gradient(135deg, #0a2540 0%, #0d3050 50%, #1a4a6e 100%)',
                    borderBottom: '3px solid #d4a853',
                    boxShadow: '0 4px 20px rgba(10, 37, 64, 0.3)'
                }}
            >
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={onClose}
                        aria-label="close"
                        sx={{ mr: 2, color: '#d4a853' }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                            flexGrow: 1,
                            color: '#e5c078'
                        }}
                    >
                        {title}
                    </Typography>
                </Toolbar>
            </AppBar>
            
            <DialogContent sx={{ 
                p: 2, 
                backgroundColor: isDark ? '#0a2540' : '#e8f4f8' 
            }}>
                <SearchInput
                    label="Search for Cards"
                    placeholder="Start typing to search..."
                    items={items}
                    value={searchValue}
                    onChange={(e, val) => setSearchValue(val)}
                    onSelect={handleSelect}
                    fullWidth
                    placement="bottom"
                    autoFocus
                    keepOpenOnSelect={keepOpenOnSelect}
                    keepInputOnSelect={keepInputOnSelect}
                />
                
                <Box sx={{ mt: 3, px: 1 }}>
                    <Typography 
                        variant="body2" 
                        sx={{ color: isDark ? '#a0c4d4' : '#1a4a6e' }}
                    >
                        Select a card from the dropdown to add it to your list, or type to search for specific cards.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default SearchDialog;
