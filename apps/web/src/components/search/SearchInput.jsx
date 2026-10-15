import React from 'react';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { useSearch } from '../../hooks/useSearch';
import SearchDropdown from './SearchDropdown';

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
                                    fontSize: dense ? '1.05rem' : '1.25rem',
                                    color: 'text.secondary'
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
                                    color: 'text.secondary',
                                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' }
                                }}
                            >
                                <ClearIcon sx={{ fontSize: dense ? '0.95rem' : '1.1rem' }} />
                            </IconButton>
                        </InputAdornment>
                    ) : null
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        ...(dense ? { minHeight: 40 } : {}),
                    },
                    '& .MuiOutlinedInput-input': {
                        fontSize: dense ? '0.875rem' : undefined,
                        py: dense ? 1 : undefined,
                        '&::placeholder': {
                            color: 'text.secondary',
                            opacity: 1
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
