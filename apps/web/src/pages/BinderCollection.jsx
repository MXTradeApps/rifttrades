import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    MenuItem,
    Select,
    Snackbar,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    BookmarkBorderRounded,
    CollectionsBookmarkOutlined,
    SortRounded,
    StyleOutlined,
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    ContentCopy as ContentCopyIcon,
    DeleteOutline as DeleteIcon,
    InsightsOutlined,
    Remove as RemoveIcon,
    Search as SearchIcon,
    Share as ShareIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlement } from '../contexts/EntitlementContext.jsx';
import { useCardData } from '../hooks/useCardData.jsx';
import Header from '../components/elements/Header.jsx';
import { Page, Panel, EmptyState } from '../components/layout/Page.jsx';
import { tk } from '../theme/tokens.js';
import BinderGrid from '../components/binder/BinderGrid.jsx';
import { SearchInput } from '../components/search/index.js';
import SignInDialog from '../components/auth/SignInDialog.jsx';
import { useCardDetail } from '../contexts/CardDetailContext.jsx';
import { capture } from '../lib/analytics.js';
import {
    applyBinderMove,
    createBinder,
    deleteBinder,
    ensureBinderShare,
    getBinderEntries,
    getBinders,
    regenerateBinderShare,
    removeEntry,
    renameBinder,
    setBinderShareEnabled,
    TRADE_BINDER_ID,
    entryRowKey,
    upsertEntry,
} from '../services/binder.js';
import { canAddDistinctCard, canCreateBinder, cardsFor, distinctOwnedCount } from '../utils/freeLimits.js';
import { formatCurrency } from '../utils/helpers.js';
import BinderValueDialog from '../components/binder/BinderValueDialog.jsx';
import FoilTag from '../components/ui/FoilTag.jsx';
import { setOpenBinderId } from '../utils/openBinder.js';

/** Matches mobile `CardSort` labels / ordering. */
const SORT_OPTIONS = [
    { id: 'nameAsc', label: 'Name (A–Z)' },
    { id: 'priceDesc', label: 'Price (high → low)' },
    { id: 'priceAsc', label: 'Price (low → high)' },
    { id: 'numberAsc', label: 'Collector #' },
];

function compareBinderEntries(a, b, sort, resolveCard) {
    const ca = resolveCard(a);
    const cb = resolveCard(b);
    switch (sort) {
        case 'priceDesc': {
            const pa = ca.market || 0;
            const pb = cb.market || 0;
            return pb - pa || ca.name.localeCompare(cb.name);
        }
        case 'priceAsc': {
            const pa = ca.market || 0;
            const pb = cb.market || 0;
            return pa - pb || ca.name.localeCompare(cb.name);
        }
        case 'numberAsc': {
            const an = ca.collectorNumber || '';
            const bn = cb.collectorNumber || '';
            if (!an && !bn) return ca.name.localeCompare(cb.name);
            if (!an) return 1;
            if (!bn) return -1;
            return an.localeCompare(bn, undefined, { numeric: true }) ||
                ca.name.localeCompare(cb.name);
        }
        case 'nameAsc':
        default:
            return ca.name.localeCompare(cb.name);
    }
}

/**
 * Card art using catalog / stub image URLs (Riftbound art is on TCGPlayer CDN).
 */
function BinderCardArt({ imageUrl, fallbackUrl, alt, onClick, qty }) {
    const [src, setSrc] = useState(imageUrl || fallbackUrl || '');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setSrc(imageUrl || fallbackUrl || '');
        setFailed(false);
    }, [imageUrl, fallbackUrl]);

    const handleError = () => {
        if (fallbackUrl && src !== fallbackUrl) {
            setSrc(fallbackUrl);
            return;
        }
        setFailed(true);
    };

    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            aria-label={`Preview ${alt || 'card'}`}
            sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '5 / 4',
                p: 0,
                border: 0,
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'zoom-in',
                bgcolor: 'surface.sunken',
                overflow: 'hidden',
                display: 'block',
            }}
        >
            {!failed && src ? (
                <Box
                    component="img"
                    src={src}
                    alt={alt || ''}
                    loading="lazy"
                    onError={handleError}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        display: 'block',
                    }}
                />
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                    }}
                >
                    <Typography
                        sx={{ color: 'text.disabled', fontSize: '0.65rem', textAlign: 'center' }}
                    >
                        {alt || 'No image'}
                    </Typography>
                </Box>
            )}
            {qty > 1 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        px: 0.75,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 999,
                        fontSize: '0.6875rem',
                        fontWeight: 750,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#fff',
                        bgcolor: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    {qty}×
                </Box>
            )}
        </Box>
    );
}

/**
 * Shared Binder / Want List page. Parameterized by `isWanted` the same way
 * mobile uses a single BinderEntry model for both lists.
 */
const BinderCollection = ({ isWanted = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isPro, loading: entitlementLoading } = useEntitlement();
    const { cards, cardGroups, metadata } = useCardData();
    const { openDetail } = useCardDetail();
    const lastUpdatedTimestamp = metadata?.lastUpdated || metadata?.updatedAt || null;

    const [entries, setEntries] = useState([]);
    const [allOwned, setAllOwned] = useState([]);
    const [binders, setBinders] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const openBinderId = isWanted ? null : searchParams.get('b');
    const setOpenBinder = useCallback((id) => {
        if (isWanted) return;
        if (!id) {
            setSearchParams({}, { replace: true });
            return;
        }
        setSearchParams({ b: id });
    }, [isWanted, setSearchParams]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState('nameAsc');
    const [signInOpen, setSignInOpen] = useState(false);
    const [busyCardId, setBusyCardId] = useState(null);
    const [limitMessage, setLimitMessage] = useState('');
    const [toast, setToast] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success');
    const showToast = (message, severity = 'success') => {
        setToastSeverity(severity);
        setToast(message);
    };
    const [shareOpen, setShareOpen] = useState(false);
    const [share, setShare] = useState(null);
    const [shareBusy, setShareBusy] = useState(false);
    const [valueOpen, setValueOpen] = useState(false);

    const listLabel = isWanted ? 'Want List' : 'Binder';
    const pageTitle = isWanted ? 'Want List' : 'My Binders';
    const limit = cardsFor({ isWanted });
    const targetBinderId = isWanted ? undefined : (openBinderId || TRADE_BINDER_ID);
    const showingGrid = !isWanted && !openBinderId;

    const textColor = 'text.primary';
    const mutedColor = 'text.secondary';

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await getBinderEntries();
        if (fetchError) {
            setError(fetchError.message || `Failed to load ${listLabel.toLowerCase()}`);
            setEntries([]);
            setAllOwned([]);
        } else {
            const owned = data.binder || [];
            setAllOwned(owned);
            if (isWanted) {
                setEntries(data.wants || []);
            } else if (openBinderId) {
                setEntries(owned.filter((e) => (e.binderId || TRADE_BINDER_ID) === openBinderId));
            } else {
                setEntries(owned);
            }
        }
        setLoading(false);
    }, [isWanted, listLabel, openBinderId]);

    const loadBinders = useCallback(async () => {
        if (isWanted) return;
        const { data } = await getBinders();
        setBinders(data?.binders || []);
    }, [isWanted]);

    useEffect(() => {
        if (user) {
            loadEntries();
            loadBinders();
        }
    }, [user, loadEntries, loadBinders]);

    useEffect(() => {
        setOpenBinderId(isWanted ? null : openBinderId);
        return () => setOpenBinderId(null);
    }, [isWanted, openBinderId]);

    const catalogById = useMemo(() => {
        const map = new Map();
        for (const card of cards) {
            if (card._uniqueId) map.set(card._uniqueId, card);
        }
        return map;
    }, [cards]);

    /** cardId → sibling printings (Normal / Foil / …) from catalog groups. */
    const editionsByCardId = useMemo(() => {
        const map = new Map();
        for (const group of cardGroups || []) {
            const editions = group.editions || [];
            for (const edition of editions) {
                if (edition.uniqueId) map.set(edition.uniqueId, editions);
            }
        }
        return map;
    }, [cardGroups]);

    const cardOptions = useMemo(
        () =>
            cards.map((card) => ({
                label: card.displayName,
                value: card._uniqueDisplayId,
                subTypeName: card.subTypeName,
                setName: card._setName || '',
                card,
            })),
        [cards],
    );

    /** Merge a binder stub with live catalog row for fresher prices / type lines. */
    const resolveCard = useCallback(
        (entry) => {
            const stub = entry.card || {};
            const live = catalogById.get(entry.cardId);
            const finish =
                live?.subTypeName ||
                stub.subTypeName ||
                (stub.isFoil ? 'Foil' : 'Normal');
            const collectorNumber =
                live?.extNumber || live?.number || stub.collectorNumber || '';
            const primaryImage = live?.imageUrl || stub.imageUrl || '';
            const fallbackImage = live?.imageUrlFallback
                || stub.imageUrlFallback
                || (stub.imageUrl && stub.imageUrl !== primaryImage ? stub.imageUrl : '');

            return {
                name: live?.name || stub.name || 'Unknown card',
                imageUrl: primaryImage,
                imageUrlFallback: fallbackImage && fallbackImage !== primaryImage
                    ? fallbackImage
                    : '',
                collectorNumber,
                rarity: live?.extRarity || live?.rarity || stub.rarity || '',
                finish,
                setName: live?._setName || stub.setName || '',
                typeLine: [finish, live?.extRarity || live?.rarity || stub.rarity]
                    .filter(Boolean)
                    .join(' — '),
                market: Number(live?.marketPrice) || Number(stub.tcgMarket) || 0,
                low:
                    Number(live?.lowPrice) ||
                    (stub.tcgLow != null ? Number(stub.tcgLow) : null) ||
                    null,
                mid: Number(live?.midPrice) || null,
                high: Number(live?.highPrice) || null,
            };
        },
        [catalogById],
    );

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const list = q
            ? entries.filter((entry) => {
                const card = resolveCard(entry);
                return (
                    card.name.toLowerCase().includes(q) ||
                    card.setName.toLowerCase().includes(q) ||
                    card.finish.toLowerCase().includes(q) ||
                    card.collectorNumber.toLowerCase().includes(q) ||
                    card.typeLine.toLowerCase().includes(q)
                );
            })
            : [...entries];
        list.sort((a, b) => compareBinderEntries(a, b, sort, resolveCard));
        return list;
    }, [entries, searchQuery, sort, resolveCard]);

    const totalValue = useMemo(
        () =>
            entries.reduce((sum, entry) => {
                const price = resolveCard(entry).market;
                return sum + price * (entry.quantity || 1);
            }, 0),
        [entries, resolveCard],
    );

    const openEntryDetail = (entry) => {
        const live = catalogById.get(entry.cardId);
        if (live?._uniqueId) openDetail(live);
    };

    const distinctInOpen = isWanted
        ? entries.length
        : distinctOwnedCount(allOwned, targetBinderId);
    const atFreeLimit =
        !entitlementLoading &&
        !isPro &&
        !canAddDistinctCard(distinctInOpen, { isWanted, isPro: false });
    const openBinder = binders.find((b) => b.clientId === openBinderId);

    const handleAddCard = async (option) => {
        const catalogCard = option?.card;
        if (!catalogCard?._uniqueId) return;

        const cardId = catalogCard._uniqueId;
        const binderId = isWanted ? undefined : targetBinderId;
        const existing = isWanted
            ? entries.find((e) => e.cardId === cardId && e.isWanted)
            : entries.find((e) =>
                e.cardId === cardId
                && (e.binderId || TRADE_BINDER_ID) === binderId
                && (e.condition || 'NM') === 'NM');

        if (!existing && !canAddDistinctCard(distinctInOpen, { isWanted, isPro })) {
            setLimitMessage(
                `${isWanted ? 'Want lists' : 'Binders'} hold ${limit} cards on the free plan. Subscribe in the RiftTrades app to add more.`,
            );
            capture('free_limit_hit', {
                list: isWanted ? 'want' : 'binder',
                limit,
            });
            return;
        }

        setBusyCardId(cardId);
        const nextQty = existing ? existing.quantity + 1 : 1;
        const { data, error: upsertError } = await upsertEntry({
            cardId,
            isWanted,
            quantity: nextQty,
            condition: existing?.condition || 'NM',
            binderId,
            card: catalogCard,
            addedAt: existing?.addedAt,
        });
        setBusyCardId(null);

        if (upsertError) {
            showToast(upsertError.message || 'Failed to add card', 'error');
            return;
        }

        setEntries((prev) => {
            const key = entryRowKey(data);
            const without = prev.filter((e) => entryRowKey(e) !== key);
            return [data, ...without];
        });
        if (!isWanted) {
            setAllOwned((prev) => {
                const without = prev.filter((e) =>
                    !(e.cardId === cardId
                        && (e.binderId || TRADE_BINDER_ID) === binderId
                        && (e.condition || 'NM') === (data.condition || existing?.condition || 'NM')));
                return [data, ...without];
            });
        }
        showToast(`Added ${catalogCard.name} to ${listLabel}`);
        capture(isWanted ? 'want_card_added' : 'binder_card_added', {
            card_name: catalogCard.name,
            quantity: nextQty,
            bumped_existing: Boolean(existing),
        });
    };

    const updateQuantity = async (entry, quantity) => {
        setBusyCardId(entry.cardId);
        if (quantity <= 0) {
            const { error: delError } = await removeEntry(entry.cardId, isWanted, {
                binderId: entry.binderId,
                condition: entry.condition,
            });
            setBusyCardId(null);
            if (delError) {
                showToast(delError.message || 'Failed to remove card', 'error');
                return;
            }
            setEntries((prev) => prev.filter((e) => e.cardId !== entry.cardId));
            if (!isWanted) {
                setAllOwned((prev) => prev.filter((e) =>
                    !(e.cardId === entry.cardId
                        && (e.binderId || TRADE_BINDER_ID) === (entry.binderId || TRADE_BINDER_ID)
                        && (e.condition || 'NM') === (entry.condition || 'NM'))));
            }
            return;
        }

        const { data, error: upsertError } = await upsertEntry({
            cardId: entry.cardId,
            isWanted,
            quantity,
            condition: entry.condition,
            binderId: isWanted ? undefined : (entry.binderId || targetBinderId),
            card: entry.stub || entry.card,
            addedAt: entry.addedAt,
        });
        setBusyCardId(null);

        if (upsertError) {
            showToast(upsertError.message || 'Failed to update quantity', 'error');
            return;
        }
        setEntries((prev) => prev.map((e) => (e.cardId === entry.cardId ? data : e)));
        if (!isWanted) {
            setAllOwned((prev) => prev.map((e) => (
                e.cardId === entry.cardId
                    && (e.binderId || TRADE_BINDER_ID) === (entry.binderId || TRADE_BINDER_ID)
                    && (e.condition || 'NM') === (entry.condition || 'NM')
                    ? data
                    : e
            )));
        }
    };

    /**
     * Swap printing (e.g. Normal → Foil). Keeps qty/condition; merges
     * into an existing row for the target printing when one is already present.
     */
    const changeVersion = async (entry, newCardId) => {
        if (!newCardId || newCardId === entry.cardId) return;
        const newCard = catalogById.get(newCardId);
        if (!newCard) {
            showToast('That printing is not in the catalog', 'error');
            return;
        }

        const mergeTarget = entries.find((e) => e.cardId === newCardId);
        const qty = entry.quantity || 1;
        const condition = entry.condition || 'NM';

        setBusyCardId(entry.cardId);

        const { data: upserted, error: upsertError } = await upsertEntry({
            cardId: newCardId,
            isWanted,
            quantity: mergeTarget ? mergeTarget.quantity + qty : qty,
            condition: mergeTarget?.condition || condition,
            binderId: isWanted ? undefined : (entry.binderId || targetBinderId),
            card: newCard,
            addedAt: mergeTarget?.addedAt || entry.addedAt,
        });

        if (upsertError) {
            setBusyCardId(null);
            showToast(upsertError.message || 'Failed to change version', 'error');
            return;
        }

        const { error: delError } = await removeEntry(entry.cardId, isWanted, {
            binderId: entry.binderId,
            condition: entry.condition,
        });
        setBusyCardId(null);

        if (delError) {
            showToast(delError.message || 'Version updated, but the old printing lingered', 'error');
            await loadEntries();
            return;
        }

        setEntries((prev) => {
            const withoutOld = prev.filter((e) => e.cardId !== entry.cardId);
            const withoutTarget = withoutOld.filter((e) => e.cardId !== newCardId);
            return [upserted, ...withoutTarget];
        });
        if (!isWanted) {
            setAllOwned((prev) => {
                const withoutOld = prev.filter((e) =>
                    !(e.cardId === entry.cardId
                        && (e.binderId || TRADE_BINDER_ID) === (entry.binderId || TRADE_BINDER_ID)
                        && (e.condition || 'NM') === (entry.condition || 'NM')));
                const withoutTarget = withoutOld.filter((e) => e.cardId !== newCardId
                    || (e.binderId || TRADE_BINDER_ID) !== (upserted.binderId || TRADE_BINDER_ID));
                return [upserted, ...withoutTarget];
            });
        }
        showToast(`Changed to ${newCard.subTypeName || 'new version'}`);
    };

    const handleRemove = async (entry) => {
        if (!entry) return;
        setBusyCardId(entry.cardId);
        const { error: delError } = await removeEntry(entry.cardId, isWanted, {
            binderId: entry.binderId,
            condition: entry.condition,
        });
        setBusyCardId(null);
        if (delError) {
            showToast(delError.message || 'Failed to remove card', 'error');
            return;
        }
        setEntries((prev) => prev.filter((e) => e.cardId !== entry.cardId));
        if (!isWanted) {
            setAllOwned((prev) => prev.filter((e) =>
                !(e.cardId === entry.cardId
                    && (e.binderId || TRADE_BINDER_ID) === (entry.binderId || TRADE_BINDER_ID)
                    && (e.condition || 'NM') === (entry.condition || 'NM'))));
        }
        capture(isWanted ? 'want_card_removed' : 'binder_card_removed', {
            card_name: entry.card?.name || entry.stub?.name || null,
            quantity: entry.quantity || 1,
        });
    };

    const promptName = (title, initial = '') => window.prompt(title, initial);

    const handleCreateBinder = async () => {
        const { data: latest } = await getBinders();
        const liveCount = (latest?.binders || binders).length;
        if (!canCreateBinder(liveCount, { isPro })) {
            setLimitMessage(
                'Binders hold 4 on the free plan. Subscribe in the RiftTrades app to add more.',
            );
            return;
        }
        const name = promptName('New Binder');
        if (name == null) return;
        const { data, error: createError } = await createBinder({
            name,
            isPro,
            liveCount: binders.length,
        });
        if (createError) {
            if (createError.reason === 'paywall') {
                setLimitMessage(
                    'Binders hold 4 on the free plan. Subscribe in the RiftTrades app to add more.',
                );
            } else {
                showToast(createError.reason === 'duplicate'
                    ? 'A Binder with that name already exists'
                    : (createError.message || 'Could not create Binder'), 'error');
            }
            return;
        }
        setBinders((prev) => [...prev, data]);
    };

    const handleRenameBinder = async (binder) => {
        const name = promptName('Rename Binder', binder.name);
        if (name == null) return;
        const { data, error: renameError } = await renameBinder({
            clientId: binder.clientId,
            name,
        });
        if (renameError) {
            showToast(renameError.reason === 'duplicate'
                ? 'A Binder with that name already exists'
                : (renameError.message || 'Could not rename'), 'error');
            return;
        }
        setBinders((prev) => prev.map((b) => (b.clientId === data.clientId ? data : b)));
    };

    const handleDeleteBinder = async (binder) => {
        const { error: deleteError } = await deleteBinder({
            clientId: binder.clientId,
            entries: allOwned,
        });
        if (deleteError) {
            const message = deleteError.reason === 'trade'
                ? 'Trade Binder cannot be deleted'
                : deleteError.reason === 'not-empty'
                    ? 'Move or remove cards before deleting this Binder'
                    : (deleteError.message || 'Could not delete Binder');
            showToast(message, 'error');
            return;
        }
        setBinders((prev) => prev.filter((b) => b.clientId !== binder.clientId));
    };

    const handleMove = async (entry) => {
        const dests = binders.filter((b) => b.clientId !== (openBinderId || TRADE_BINDER_ID));
        if (!dests.length) {
            showToast('No other Binder to move into', 'error');
            return;
        }
        const names = dests.map((b) => b.name).join(', ');
        const picked = window.prompt(`Move to Binder (${names})`, dests[0].name);
        if (!picked) return;
        const dest = dests.find((b) => b.name.toLowerCase() === picked.trim().toLowerCase())
            || dests.find((b) => b.clientId === picked);
        if (!dest) {
            showToast('No Binder with that name', 'error');
            return;
        }
        let qty = entry.quantity || 1;
        if (qty > 1) {
            const raw = window.prompt(`How many copies to move? (1–${qty})`, String(Math.min(2, qty)));
            if (raw == null) return;
            qty = Number(raw);
        }
        const { error: moveError } = await applyBinderMove({
            binders,
            entries: allOwned,
            fromBinderId: openBinderId || TRADE_BINDER_ID,
            toBinderId: dest.clientId,
            printingId: entry.cardId,
            condition: entry.condition || 'NM',
            quantity: qty,
            isPro,
        });
        if (moveError) {
            if (moveError.reason === 'binder-cards-cap') {
                setLimitMessage(
                    `Binders hold ${limit} cards on the free plan. Subscribe in the RiftTrades app to add more.`,
                );
                return;
            }
            showToast(moveError.message || 'Could not move', 'error');
            return;
        }
        await loadEntries();
        await loadBinders();
    };

    const openShareDialog = async () => {
        setShareOpen(true);
        setShareBusy(true);
        const { data, error: shareError } = await ensureBinderShare();
        setShareBusy(false);
        if (shareError) {
            showToast(shareError.message || 'Could not create share link', 'error');
            setShareOpen(false);
            return;
        }
        setShare(data);
        capture('binder_share_opened', { enabled: Boolean(data?.isEnabled) });
    };

    const copyShareLink = async () => {
        if (!share?.url) return;
        try {
            await navigator.clipboard.writeText(share.url);
            showToast('Link copied');
            capture('binder_share_copied');
        } catch {
            showToast('Could not copy link', 'error');
        }
    };

    const toggleShareEnabled = async (enabled) => {
        setShareBusy(true);
        const { data, error: shareError } = await setBinderShareEnabled(enabled);
        setShareBusy(false);
        if (shareError) {
            showToast(shareError.message || 'Could not update sharing', 'error');
            return;
        }
        setShare(data);
        showToast(enabled ? 'Sharing enabled' : 'Sharing turned off');
        capture('binder_share_toggled', { enabled });
    };

    const handleRegenerateShare = async () => {
        setShareBusy(true);
        const { data, error: shareError } = await regenerateBinderShare();
        setShareBusy(false);
        if (shareError) {
            showToast(shareError.message || 'Could not regenerate link', 'error');
            return;
        }
        setShare(data);
        showToast('New link created — old link no longer works');
        capture('binder_share_regenerated');
    };

    if (!user) {
        return (
            <>
                <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />
                <Page maxWidth={720}>
                    <Panel sx={{ mt: { xs: 2, md: 6 } }}>
                        <EmptyState
                            icon={isWanted ? <BookmarkBorderRounded /> : <CollectionsBookmarkOutlined />}
                            title="Sign In Required"
                            actions={(
                                <>
                                    <Button variant="contained" size="large" onClick={() => setSignInOpen(true)}>
                                        Sign in
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        size="large"
                                        startIcon={<ArrowBackIcon />}
                                        onClick={() => navigate('/')}
                                    >
                                        Back to Trading
                                    </Button>
                                </>
                            )}
                        >
                            Sign in to sync your {listLabel.toLowerCase()} across devices.
                        </EmptyState>
                    </Panel>
                </Page>
                <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
            </>
        );
    }

    const openCount = entries.reduce((sum, entry) => sum + (entry.quantity || 1), 0);
    const showBreadcrumb = !isWanted && Boolean(openBinderId);
    const headerTitle = showBreadcrumb ? (openBinder?.name || 'Binder') : pageTitle;
    const totalLabel = formatCurrency(totalValue.toFixed(2));

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Page>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 3,
                    }}
                >
                    <Box sx={{ minWidth: 0, flex: '1 1 300px' }}>
                        {showBreadcrumb && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, ml: -0.75 }}>
                                <IconButton
                                    size="small"
                                    data-testid="binder-back"
                                    aria-label="Back to all binders"
                                    onClick={() => setOpenBinder(null)}
                                    sx={{ color: 'text.secondary' }}
                                >
                                    <ArrowBackIcon sx={{ fontSize: '1.1rem' }} />
                                </IconButton>
                                <Typography
                                    component="button"
                                    type="button"
                                    data-testid="binder-home-title"
                                    onClick={() => setOpenBinder(null)}
                                    sx={{
                                        border: 0,
                                        background: 'none',
                                        p: 0,
                                        fontFamily: 'inherit',
                                        fontSize: '0.84375rem',
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        cursor: 'pointer',
                                        '&:hover': { color: 'text.primary' },
                                    }}
                                >
                                    {pageTitle}
                                </Typography>
                                <Typography component="span" sx={{ color: 'text.disabled', fontSize: '0.84375rem' }}>/</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                            <Typography
                                variant="h1"
                                data-testid={showBreadcrumb ? 'binder-open-name' : 'binder-home-title'}
                                noWrap={showBreadcrumb}
                                sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, color: 'text.primary', minWidth: 0 }}
                            >
                                {headerTitle}
                            </Typography>
                            {isPro && (
                                <Chip size="small" color="primary" label="PRO" sx={{ height: 24, letterSpacing: 0.5 }} />
                            )}
                            {isWanted && (
                                <Chip
                                    data-testid="binder-count-chip"
                                    size="small"
                                    label={`${entries.length}`}
                                    sx={{ height: 24, fontSize: '0.75rem' }}
                                />
                            )}
                        </Box>
                        <Typography variant="body1" component="div" sx={{ color: 'text.secondary', mt: 0.75 }}>
                            {showingGrid
                                ? 'Organize your collection into binders. Open one to search, sort and edit its cards.'
                                : `${openCount} ${openCount === 1 ? 'card' : 'cards'}`}
                            {!showingGrid && (
                                <>
                                    {' · '}
                                    {!isWanted && entries.length > 0 ? (
                                        <Tooltip title="See what this binder is worth">
                                            <Box
                                                component="button"
                                                type="button"
                                                data-testid="binder-value-total"
                                                onClick={() => setValueOpen(true)}
                                                sx={{
                                                    border: 0,
                                                    background: 'none',
                                                    p: 0,
                                                    font: 'inherit',
                                                    color: 'text.primary',
                                                    fontWeight: 650,
                                                    fontVariantNumeric: 'tabular-nums',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    textDecorationColor: 'transparent',
                                                    '&:hover': { textDecorationColor: 'currentColor' },
                                                }}
                                            >
                                                {totalLabel}
                                            </Box>
                                        </Tooltip>
                                    ) : (
                                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                                            {totalLabel}
                                        </Box>
                                    )}
                                </>
                            )}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {!isWanted && !showingGrid && entries.length > 0 && (
                            <Button
                                data-testid="collection-stats"
                                variant="outlined"
                                color="inherit"
                                startIcon={<InsightsOutlined />}
                                onClick={() => navigate(`/binder/stats?b=${encodeURIComponent(openBinderId)}`)}
                            >
                                Collection Stats
                            </Button>
                        )}
                        {!isWanted && openBinderId === TRADE_BINDER_ID && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<ShareIcon />}
                                onClick={openShareDialog}
                            >
                                Share
                            </Button>
                        )}
                        {showingGrid && (
                            <Button
                                variant="contained"
                                data-testid="binder-create"
                                startIcon={<AddIcon />}
                                onClick={handleCreateBinder}
                            >
                                New Binder
                            </Button>
                        )}
                    </Box>
                </Box>

                {showingGrid && (
                    <BinderGrid
                        binders={binders}
                        entries={allOwned}
                        resolveCard={resolveCard}
                        onOpen={(binder) => setOpenBinder(binder.clientId)}
                        onRename={handleRenameBinder}
                        onDelete={handleDeleteBinder}
                    />
                )}

                {!showingGrid && (
                <>
                {!entitlementLoading && !isPro && entries.length / limit >= 0.7 && (
                    <Alert severity="info" icon={false} sx={{ mb: 2 }}>
                        Free plan — {listLabel.toLowerCase()} holds {limit} cards
                        ({entries.length}/{limit}). Subscribe in the RiftTrades app for unlimited.
                    </Alert>
                )}

                {atFreeLimit && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {isWanted ? 'Want lists' : 'Binders'} hold {limit} cards on the free plan.
                        You can still change quantity on cards you already have. Subscribe in the
                        RiftTrades app to add more.
                    </Alert>
                )}

                <Box
                    sx={{
                        mb: 2,
                        position: 'relative',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    }}
                >
                    <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 0 } }}>
                        <SearchInput
                            label=""
                            size="small"
                            placeholder={`Search to add cards…`}
                            items={cardOptions}
                            value={searchQuery}
                            onChange={(_e, value) => setSearchQuery(value || '')}
                            onSelect={handleAddCard}
                            keepOpenOnSelect
                            keepInputOnSelect
                        />
                    </Box>
                    <FormControl
                        size="small"
                        sx={{
                            minWidth: { xs: '100%', sm: 190 },
                            flexShrink: 0,
                            '& .MuiOutlinedInput-root': { minHeight: 40 },
                        }}
                    >
                        <Select
                            value={sort}
                            displayEmpty
                            onChange={(e) => setSort(e.target.value)}
                            aria-label="Sort binder"
                            startAdornment={<SortRounded sx={{ fontSize: '1.1rem', color: 'text.secondary', mr: 1 }} />}
                            renderValue={(value) => {
                                const opt = SORT_OPTIONS.find((o) => o.id === value);
                                return opt?.label || 'Sort';
                            }}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <MenuItem key={option.id} value={option.id} dense>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && !loading && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <Panel>
                        <EmptyState
                            icon={searchQuery.trim() ? <SearchIcon /> : <StyleOutlined />}
                            title={searchQuery.trim()
                                ? 'No matching cards in this list'
                                : `${listLabel} is empty`}
                        >
                            {searchQuery.trim()
                                ? 'Pick a result above to add it, or clear the search.'
                                : `Type in the search box above to add cards.`}
                        </EmptyState>
                    </Panel>
                )}

                {!loading && filtered.length > 0 && (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                sm: 'repeat(auto-fill, minmax(168px, 1fr))',
                            },
                            gap: { xs: 1.25, sm: 1.5 },
                        }}
                    >
                        {filtered.map((entry) => {
                            const card = resolveCard(entry);
                            const qty = entry.quantity || 1;
                            const busy = busyCardId === entry.cardId;
                            const editions = editionsByCardId.get(entry.cardId) || [];
                            const canChangeVersion = editions.length >= 2;
                            const idLine = [card.collectorNumber, card.rarity]
                                .filter(Boolean)
                                .join(' · ');
                            const priceRows = [
                                ['Market', card.market],
                                ['Low', card.low],
                                ['Mid', card.mid],
                                ['High', card.high],
                            ].filter(([, v]) => v != null && Number.isFinite(v) && v > 0);

                            return (
                                <Box
                                    key={entryRowKey(entry)}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: 0,
                                        borderRadius: '14px',
                                        overflow: 'hidden',
                                        bgcolor: 'background.paper',
                                        border: 1,
                                        borderColor: 'divider',
                                        boxShadow: (t) => tk(t).shadowSm,
                                        transition: 'border-color 120ms ease, box-shadow 120ms ease',
                                        '&:hover': { borderColor: 'text.disabled', boxShadow: (t) => tk(t).shadowMd },
                                    }}
                                >
                                    <BinderCardArt
                                        imageUrl={card.imageUrl}
                                        fallbackUrl={card.imageUrlFallback}
                                        alt={card.name}
                                        qty={qty}
                                        onClick={() => openEntryDetail(entry)}
                                    />

                                    <Box
                                        sx={{
                                            px: 1.25,
                                            pt: 1,
                                            pb: 0.75,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.4,
                                            flexGrow: 1,
                                        }}
                                    >
                                        <Typography
                                            component="button"
                                            type="button"
                                            onClick={() => openEntryDetail(entry)}
                                            aria-label={`View details for ${card.name}`}
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.8125rem',
                                                color: 'text.primary',
                                                lineHeight: 1.25,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                border: 0,
                                                background: 'none',
                                                p: 0,
                                                m: 0,
                                                textAlign: 'left',
                                                fontFamily: 'inherit',
                                                cursor: 'pointer',
                                                '&:hover': { color: 'primary.main' },
                                            }}
                                        >
                                            {card.name}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: '0.7rem',
                                                lineHeight: 1.3,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {idLine || card.setName || '—'}
                                        </Typography>

                                        {card.typeLine && (
                                            <Typography
                                                sx={{
                                                    color: 'text.secondary',
                                                    fontSize: '0.68rem',
                                                    lineHeight: 1.3,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {card.typeLine}
                                            </Typography>
                                        )}

                                        <Box
                                            component="dl"
                                            sx={{
                                                m: 0,
                                                mt: 0.4,
                                                display: 'grid',
                                                gridTemplateColumns: '1fr auto',
                                                columnGap: 1,
                                                rowGap: 0.15,
                                                '& dt, & dd': {
                                                    m: 0,
                                                    fontSize: '0.7rem',
                                                    lineHeight: 1.35,
                                                },
                                                '& dt': { color: 'text.secondary' },
                                                '& dd': {
                                                    color: 'text.primary',
                                                    fontWeight: 600,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                },
                                                '& dd:first-of-type': { fontWeight: 750, fontSize: '0.8125rem' },
                                            }}
                                        >
                                            {priceRows.map(([label, value]) => (
                                                <Box
                                                    key={label}
                                                    sx={{ display: 'contents' }}
                                                >
                                                    <Box component="dt">{label}</Box>
                                                    <Box component="dd">
                                                        {formatCurrency(value.toFixed(2))}
                                                    </Box>
                                                </Box>
                                            ))}
                                            {priceRows.length === 0 && (
                                                <>
                                                    <Box component="dt">Market</Box>
                                                    <Box component="dd">—</Box>
                                                </>
                                            )}
                                        </Box>

                                        {canChangeVersion ? (
                                            <FormControl
                                                size="small"
                                                fullWidth
                                                sx={{ mt: 0.5 }}
                                            >
                                                <Select
                                                    value={entry.cardId}
                                                    disabled={busy}
                                                    onChange={(e) =>
                                                        changeVersion(entry, e.target.value)
                                                    }
                                                    aria-label={`Version of ${card.name}`}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        height: 28,
                                                        '& .MuiSelect-select': {
                                                            py: 0.35,
                                                            px: 0.75,
                                                            textAlign: 'center',
                                                        },
                                                    }}
                                                >
                                                    {editions.map((edition) => (
                                                        <MenuItem
                                                            key={edition.uniqueId}
                                                            value={edition.uniqueId}
                                                            dense
                                                            sx={{ fontSize: '0.75rem' }}
                                                        >
                                                            {edition.subTypeName || 'Normal'}
                                                            {edition.cardPrice
                                                                ? ` · ${formatCurrency(Number(edition.cardPrice).toFixed(2))}`
                                                                : ''}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <Box sx={{ mt: 0.5, display: 'flex' }}>
                                                <FoilTag
                                                    subTypeName={card.finish}
                                                    label={card.finish || 'Normal'}
                                                />
                                            </Box>
                                        )}

                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                mt: 'auto',
                                                pt: 0.75,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    height: 28,
                                                    borderRadius: '9px',
                                                    bgcolor: 'surface.sunken',
                                                }}
                                            >
                                                <IconButton
                                                    size="small"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        updateQuantity(entry, qty - 1)
                                                    }
                                                    aria-label="decrease quantity"
                                                    sx={{ p: 0.4, color: 'text.secondary' }}
                                                >
                                                    <RemoveIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                                <Typography
                                                    sx={{
                                                        minWidth: 18,
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '0.8125rem',
                                                        color: 'text.primary',
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                >
                                                    {qty}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        updateQuantity(entry, qty + 1)
                                                    }
                                                    aria-label="increase quantity"
                                                    sx={{ p: 0.4, color: 'text.secondary' }}
                                                >
                                                    <AddIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Box>

                                            {!isWanted && (
                                                <Button
                                                    size="small"
                                                    color="inherit"
                                                    data-testid={`binder-move-${entry.cardId}`}
                                                    onClick={() => handleMove(entry)}
                                                    sx={{
                                                        fontSize: '0.72rem',
                                                        minWidth: 0,
                                                        minHeight: 28,
                                                        px: 0.75,
                                                        ml: 'auto',
                                                        color: 'text.secondary',
                                                    }}
                                                >
                                                    Move
                                                </Button>
                                            )}
                                            <IconButton
                                                size="small"
                                                disabled={busy}
                                                onClick={() => handleRemove(entry)}
                                                aria-label="remove card"
                                                sx={{
                                                    color: 'text.disabled',
                                                    p: 0.5,
                                                    ml: isWanted ? 'auto' : 0,
                                                    '&:hover': { color: 'error.main' },
                                                }}
                                            >
                                                {busy ? (
                                                    <CircularProgress size={14} />
                                                ) : (
                                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                                )}
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
                </>
                )}
            </Page>

            <Dialog
                open={shareOpen}
                onClose={() => !shareBusy && setShareOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Share binder</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: mutedColor, fontSize: '0.875rem', mb: 2 }}>
                        Anyone with this link can view your binder (not your want list). Turn sharing
                        off or regenerate the link anytime.
                    </Typography>
                    {shareBusy && !share ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        <>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(share?.isEnabled)}
                                        onChange={(e) => toggleShareEnabled(e.target.checked)}
                                        disabled={shareBusy || !share}
                                    />
                                }
                                label={share?.isEnabled ? 'Sharing on' : 'Sharing off'}
                                sx={{ mb: 1.5, color: textColor }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    value={share?.url || ''}
                                    fullWidth
                                    size="small"
                                    InputProps={{ readOnly: true }}
                                    disabled={!share?.isEnabled}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={copyShareLink}
                                    disabled={shareBusy || !share?.isEnabled || !share?.url}
                                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                                >
                                    Copy
                                </Button>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                        onClick={handleRegenerateShare}
                        disabled={shareBusy || !share}
                        color="inherit"
                    >
                        New link
                    </Button>
                    <Button onClick={() => setShareOpen(false)} disabled={shareBusy}>
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(limitMessage)}
                autoHideDuration={6000}
                onClose={() => setLimitMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setLimitMessage('')}
                    severity="info"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {limitMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={3000}
                onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setToast('')}
                    severity={toastSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toast}
                </Alert>
            </Snackbar>

            {!isWanted && (
                <BinderValueDialog
                    open={valueOpen}
                    onClose={() => setValueOpen(false)}
                    headline={formatCurrency(totalValue.toFixed(2))}
                    entries={entries}
                    catalogById={catalogById}
                />
            )}
        </>
    );
};

export default BinderCollection;
