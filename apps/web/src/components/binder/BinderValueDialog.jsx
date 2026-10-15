import { useMemo } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    IconButton,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatCatalogPrice } from '../cardDetail/CardDetailPrices.jsx';
import {
    buildBinderValueSnapshot,
    snapshotEntryFromBinder,
} from '../../utils/binderValueSnapshot.js';

const PriceRow = ({ label, amount, currency, unpricedCopies }) => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 1,
            py: 0.35,
        }}
    >
        <Typography
            sx={{
                fontSize: '0.85rem',
                color: 'text.secondary',
            }}
        >
            {label}
            {unpricedCopies > 0 ? ` · ${unpricedCopies} unpriced` : ''}
        </Typography>
        <Typography
            sx={{
                fontSize: '0.85rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: 'text.primary',
            }}
        >
            {formatCatalogPrice(amount, currency)}
        </Typography>
    </Box>
);

const Group = ({ title, children }) => (
    <Box sx={{ mb: 2 }}>
        <Typography
            sx={{
                fontWeight: 800,
                fontSize: '0.75rem',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 0.5,
            }}
        >
            {title}
        </Typography>
        {children}
    </Box>
);

/**
 * Overlay inspect of the Binder total. [entries] are live Binder rows so qty
 * edits behind the dialog refresh the snapshot without a network fetch.
 */
const BinderValueDialog = ({
    open,
    onClose,
    headline,
    entries = [],
    catalogById,
}) => {
    const snapshot = useMemo(() => {
        const rows = (entries || []).map((entry) =>
            snapshotEntryFromBinder(
                entry,
                catalogById instanceof Map ? catalogById.get(entry.cardId) : catalogById?.[entry.cardId],
            ),
        );
        return buildBinderValueSnapshot(rows, {
            source: 'tcgplayer',
            headline: 'tcgMarketOnly',
        });
    }, [entries, catalogById]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            aria-labelledby="binder-value-title"
        >
            <DialogContent sx={{ position: 'relative', pt: 2.5, pb: 2.5 }}>
                <IconButton
                    aria-label="Close"
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <Typography
                    id="binder-value-title"
                    variant="h6"
                    sx={{ fontWeight: 800, pr: 5, color: 'text.primary' }}
                >
                    Binder value
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        mb: 0.5,
                    }}
                >
                    TCGplayer
                </Typography>
                <Typography
                    data-testid="binder-value-headline"
                    sx={{
                        fontWeight: 800,
                        fontSize: '1.6rem',
                        color: 'success.main',
                        mb: 2,
                    }}
                >
                    {headline}
                </Typography>

                <Group title="TCGplayer (USD)">
                    <PriceRow
                        label="Market"
                        amount={snapshot.tcgMarket.amount}
                        currency="USD"
                        unpricedCopies={snapshot.tcgMarket.unpricedCopies}
                       
                    />
                    <PriceRow
                        label="Low"
                        amount={snapshot.tcgLow.amount}
                        currency="USD"
                        unpricedCopies={snapshot.tcgLow.unpricedCopies}
                       
                    />
                </Group>
                <Group title="CardMarket (EUR)">
                    <PriceRow
                        label="Trend"
                        amount={snapshot.cmTrend.amount}
                        currency="EUR"
                        unpricedCopies={snapshot.cmTrend.unpricedCopies}
                       
                    />
                    <PriceRow
                        label="Low"
                        amount={snapshot.cmLow.amount}
                        currency="EUR"
                        unpricedCopies={snapshot.cmLow.unpricedCopies}
                       
                    />
                </Group>

                <Group title="Stock">
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                        {snapshot.copies} copies · {snapshot.distinctPrintings} Printings
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                        {snapshot.foilCopies} foil · {snapshot.regularCopies} Regular
                    </Typography>
                    {snapshot.tcgUnpricedCopies > 0 && (
                        <Typography
                            sx={{
                                fontSize: '0.8rem',
                                color: 'text.secondary',
                            }}
                        >
                            {snapshot.tcgUnpricedCopies} unpriced on TCGplayer
                        </Typography>
                    )}
                    {snapshot.cmUnpricedCopies > 0 && (
                        <Typography
                            sx={{
                                fontSize: '0.8rem',
                                color: 'text.secondary',
                            }}
                        >
                            {snapshot.cmUnpricedCopies} unpriced on CardMarket
                        </Typography>
                    )}
                </Group>

                {snapshot.topPrintings.length > 0 && (
                    <Group title="Top Printings">
                        {snapshot.topPrintings.map((row) => (
                            <Box
                                key={row.printingId}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    py: 0.5,
                                }}
                            >
                                <Box>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            color: 'text.primary',
                                        }}
                                    >
                                        {row.name}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '0.75rem',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {row.finish} · ×{row.quantity}
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: 'text.primary',
                                    }}
                                >
                                    {formatCatalogPrice(row.contribution, 'USD')}
                                </Typography>
                            </Box>
                        ))}
                    </Group>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default BinderValueDialog;
