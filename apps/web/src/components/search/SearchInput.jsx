import React from 'react';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { useSearch } from '../../hooks/useSearch';
import SearchDropdown from './SearchDropdown';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';

/**
 * SearchInput Component
 * Main search interface with input field and dropdown
 */
const SearchInput = ({
    label = 'Search',
    placeholder = 'Type to search...',
    items = [],
    value = '',
    onChange,
    onSelect,
    disabled = false,
    fullWidth = true,
    placement = 'bottom',
    autoFocus = false,
    keepOpenOnSelect = false,
    keepInputOnSelect = false,
    /** 'small' for denser chrome (binder toolbar); default matches trade calculator. */
    size = 'medium',
}) => {
    const { isDark } = useThemeMode();
    const dense = size === 'small';
    
    const {
        isOpen,
        highlightedIndex,
        filteredItems,
        inputRef,
        dropdownRef,
        handleFocus,
        handleBlur,
        handleInputChange,
        handleSelect,
        handleKeyDown,
        handleClear,
        setHighlightedIndex
    } = useSearch({
        items,
        onSelect,
        inputValue: value,
        onInputChange: onChange,
        disabled,
        keepOpenOnSelect,
        keepInputOnSelect,
    });

    return (
        <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
            <TextField
                inputRef={inputRef}
                label={label || undefined}
                placeholder={placeholder}
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                fullWidth={fullWidth}
                autoFocus={autoFocus}
                size={dense ? 'small' : 'medium'}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon 
                                sx={{ 
                                    fontSize: dense ? '1rem' : '1.25rem',
                                    color: isDark ? '#a0c4d4' : '#1a5a7a'
                                }} 
                            />
                        </InputAdornment>
                    ),
                    endAdornment: value && !disabled ? (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                onClick={handleClear}
                                edge="end"
                                aria-label="clear search"
                                sx={{
                                    p: dense ? 0.35 : 0.5,
                                    color: isDark ? '#a0c4d4' : '#1a5a7a',
                                    '&:hover': {
                                        backgroundColor: isDark ? 'rgba(160, 196, 212, 0.1)' : 'rgba(26, 90, 122, 0.08)'
                                    }
                                }}
                            >
                                <ClearIcon sx={{ fontSize: dense ? '0.95rem' : '1.1rem' }} />
                            </IconButton>
                        </InputAdornment>
                    ) : null
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: disabled 
                            ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)')
                            : (isDark ? '#0d3050' : '#ffffff'),
                        transition: 'all 0.2s ease',
                        ...(dense ? { minHeight: 36 } : {}),
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(58, 154, 186, 0.3)' : 'rgba(26, 90, 122, 0.23)'
                        },
                        '&:hover': {
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: disabled 
                                    ? (isDark ? 'rgba(58, 154, 186, 0.3)' : 'rgba(26, 90, 122, 0.23)')
                                    : (isDark ? 'rgba(212, 168, 83, 0.5)' : 'rgba(26, 90, 122, 0.5)')
                            }
                        },
                        '&.Mui-focused': {
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: isDark ? '#d4a853' : '#1a5a7a',
                                borderWidth: dense ? '1px' : '2px'
                            }
                        }
                    },
                    '& .MuiOutlinedInput-input': {
                        color: isDark ? '#e8f4f8' : 'inherit',
                        fontSize: dense ? '0.8125rem' : undefined,
                        py: dense ? 0.75 : undefined,
                        '&::placeholder': {
                            color: isDark ? '#6a8a9a' : 'inherit',
                            opacity: isDark ? 1 : 0.7
                        }
                    },
                    '& .MuiInputLabel-root': {
                        color: isDark ? '#a0c4d4' : '#1a5a7a',
                        '&.Mui-focused': {
                            color: isDark ? '#d4a853' : '#1a5a7a'
                        }
                    }
                }}
            />
            
            <SearchDropdown
                key={`search-${value}-${filteredItems.length}`}
                isOpen={isOpen}
                items={filteredItems}
                highlightedIndex={highlightedIndex}
                searchTerm={value}
                onSelect={handleSelect}
                onHighlight={setHighlightedIndex}
                dropdownRef={dropdownRef}
                placement={placement}
                keepOpenOnSelect={keepOpenOnSelect}
            />
        </Box>
    );
};

export default SearchInput;
