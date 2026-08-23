import { useState, useMemo, useEffect, useRef } from "react";
import { calculateTotal, calculateDiff } from "../utils/trade.js";
import {
    decodeTradeFromURL,
    encodeTradeToURL,
    reconstructCardsFromURLData,
    hasTradeDataInURL,
    clearTradeFromURL,
    estimateTradeURLSize,
    testURLEncoding
} from "../utils/urlEncoding.js";
import { loadTradeDraft, saveTradeDraft } from "../utils/tradeDraft.js";
import { normalizeTradeList } from "../utils/tradeItems.js";
import { capture } from "../lib/analytics.js";

export function useTradeState(cardGroups, cardIdLookup = {}) {
    const [haveList, setHaveList] = useState([]);
    const [wantList, setWantList] = useState([]);
    const [haveInput, setHaveInput] = useState("");
    const [wantInput, setWantInput] = useState("");
    const [urlTradeData, setUrlTradeData] = useState(null);
    const [hasLoadedFromURL, setHasLoadedFromURL] = useState(false);
    const [draftReady, setDraftReady] = useState(false);
    const skipNextPersist = useRef(false);

    const getCardGroup = (cardName) =>
        cardGroups.find(group => group.name === cardName) || null;

    const reconstructFromDraftList = (cardList) => {
        return (cardList || []).map((savedCard) => {
            let cardGroup = null;
            let selectedEdition = null;

            if (savedCard.uniqueId && cardIdLookup[savedCard.uniqueId]) {
                const matched = cardIdLookup[savedCard.uniqueId];
                cardGroup = getCardGroup(matched.displayName || matched.name);
                if (cardGroup) {
                    selectedEdition = cardGroup.editions.find(
                        (e) => e.uniqueId === savedCard.uniqueId,
                    ) || null;
                }
            }

            if (!cardGroup) {
                cardGroup = getCardGroup(savedCard.name);
            }
            if (!cardGroup || !cardGroup.editions?.length) return null;

            if (!selectedEdition && savedCard.subTypeName) {
                selectedEdition = cardGroup.editions.find(
                    (e) => e.subTypeName === savedCard.subTypeName,
                ) || null;
            }
            selectedEdition = selectedEdition || cardGroup.editions[0];

            const matchedCard = savedCard.uniqueId
                ? cardIdLookup[savedCard.uniqueId]
                : null;

            return {
                name: cardGroup.name,
                price: selectedEdition.cardPrice,
                quantity: Math.max(1, Math.min(6, Number(savedCard.quantity) || 1)),
                cardGroup,
                availableEditions: cardGroup.editions,
                subTypeName: selectedEdition.subTypeName || 'Normal',
                uniqueId: selectedEdition.uniqueId,
                imageUrl: selectedEdition.imageUrl || matchedCard?.imageUrl || '',
            };
        }).filter(Boolean);
    };

    const addCard = (list, setList, cardNameOrObject, inputSetter, side) => {
        let cardName, selectedCard;

        if (typeof cardNameOrObject === 'object' && cardNameOrObject !== null) {
            cardName = cardNameOrObject.label;
            selectedCard = cardNameOrObject.card;
        } else if (typeof cardNameOrObject === 'string') {
            cardName = cardNameOrObject;
        } else {
            return;
        }

        if (!cardName) return;

        // Same printing already on this side → bump quantity (matches mobile trade filler).
        const existingIndex = selectedCard
            ? list.findIndex(item => item.uniqueId === selectedCard._uniqueId)
            : list.findIndex(item => item.name === cardName);

        if (existingIndex >= 0) {
            const updatedList = [...list];
            const nextQty = (updatedList[existingIndex].quantity || 1) + 1;
            updatedList[existingIndex] = {
                ...updatedList[existingIndex],
                quantity: nextQty
            };
            setList(updatedList);
            inputSetter("");
            capture('trade_card_added', {
                side,
                card_name: cardName,
                quantity: nextQty,
                bumped_existing: true,
            });
            return;
        }

        const cardGroup = getCardGroup(cardName);
        if (cardGroup && cardGroup.editions.length > 0) {
            let edition, subTypeName;
            if (selectedCard) {
                edition = cardGroup.editions.find(e => e.uniqueId === selectedCard._uniqueId)
                    || cardGroup.editions.find(e => e.subTypeName === (selectedCard.subTypeName || 'Normal'))
                    || cardGroup.editions[0];
                subTypeName = selectedCard.subTypeName || edition.subTypeName || 'Normal';
            } else {
                edition = cardGroup.editions[0];
                subTypeName = edition.subTypeName || 'Normal';
            }

            setList([
                ...list,
                {
                    name: cardName,
                    price: edition.cardPrice,
                    cardGroup,
                    availableEditions: cardGroup.editions,
                    quantity: 1,
                    subTypeName: subTypeName,
                    uniqueId: selectedCard ? selectedCard._uniqueId : edition.uniqueId,
                    imageUrl: selectedCard?.imageUrl || edition.imageUrl || '',
                }
            ]);
            inputSetter("");
            capture('trade_card_added', {
                side,
                card_name: cardName,
                sub_type: subTypeName,
                quantity: 1,
                bumped_existing: false,
                price: edition.cardPrice || 0,
            });
        }
    };

    const removeCard = (list, setList, index, side) => {
        const removed = list[index];
        setList(list.filter((_, i) => i !== index));
        if (removed) {
            capture('trade_card_removed', {
                side,
                card_name: removed.name,
                quantity: removed.quantity || 1,
            });
        }
    };

    const updateQuantity = (list, setList, index, newQuantity) => {
        const updatedList = [...list];
        updatedList[index].quantity = newQuantity;
        setList(updatedList);
    };

    // Update prices when cardGroups change (e.g., when price type changes)
    useEffect(() => {
        if (cardGroups.length === 0) return;

        const updateListPrices = (list) => {
            return list.map(card => {
                const cardGroup = getCardGroup(card.name);
                if (cardGroup) {
                    const edition = cardGroup.editions.find(
                        e => e.uniqueId === card.uniqueId
                    ) || cardGroup.editions.find(
                        e => e.subTypeName === card.subTypeName
                    ) || cardGroup.editions[0];

                    return {
                        ...card,
                        price: edition.cardPrice,
                        availableEditions: cardGroup.editions,
                        cardGroup,
                        imageUrl: card.imageUrl || edition.imageUrl || '',
                    };
                }
                return card;
            });
        };

        setHaveList(prevList => updateListPrices(prevList));
        setWantList(prevList => updateListPrices(prevList));
    }, [cardGroups]);

    // Load trade data from URL, else hydrate the local draft, once catalog is ready.
    useEffect(() => {
        if (cardGroups.length === 0 || draftReady) return;

        if (!hasLoadedFromURL && hasTradeDataInURL()) {
            const tradeData = decodeTradeFromURL();
            if (tradeData) {
                setUrlTradeData(tradeData);

                const reconstructedHave = reconstructCardsFromURLData(tradeData.have, cardGroups, cardIdLookup);
                const reconstructedWant = reconstructCardsFromURLData(tradeData.want, cardGroups, cardIdLookup);

                skipNextPersist.current = false;
                setHaveList(reconstructedHave);
                setWantList(reconstructedWant);
                setHasLoadedFromURL(true);
                setDraftReady(true);

                console.log(`Loaded trade from URL: ${reconstructedHave.length} have, ${reconstructedWant.length} want`);
                capture('trade_loaded_from_url', {
                    have_count: reconstructedHave.length,
                    want_count: reconstructedWant.length,
                    age_days: tradeData.ageInDays || null,
                });

                if (tradeData.ageInDays && tradeData.ageInDays > 7) {
                    console.warn(`Trade data is ${Math.round(tradeData.ageInDays)} days old`);
                }
                return;
            }
        }

        const draft = loadTradeDraft();
        if (draft && (draft.have.length > 0 || draft.want.length > 0)) {
            skipNextPersist.current = true;
            setHaveList(reconstructFromDraftList(draft.have));
            setWantList(reconstructFromDraftList(draft.want));
        }
        setDraftReady(true);
    }, [cardGroups, cardIdLookup, hasLoadedFromURL, draftReady]);

    // Keep the draft in sync so Shared Binder → Calculator navigation retains cards.
    useEffect(() => {
        if (!draftReady) return;
        if (skipNextPersist.current) {
            skipNextPersist.current = false;
            return;
        }
        saveTradeDraft(haveList, wantList);
    }, [haveList, wantList, draftReady]);

    // Generate shareable URL
    const generateShareURL = () => {
        try {
            return encodeTradeToURL(haveList, wantList);
        } catch (error) {
            console.error('Failed to generate share URL:', error);
            return null;
        }
    };

    const clearTrade = () => {
        capture('trade_cleared', {
            have_count: haveList.length,
            want_count: wantList.length,
        });
        setHaveList([]);
        setWantList([]);
        setHaveInput('');
        setWantInput('');
        clearTradeFromURL();
        setUrlTradeData(null);
        setHasLoadedFromURL(false);
    };

    // Clear URL trade data
    const clearURLTradeData = () => {
        clearTradeFromURL();
        setUrlTradeData(null);
        setHasLoadedFromURL(false);
    };

    const loadTradeFromHistory = (trade) => {
        if (!trade) return;

        const reconstructFromHistory = (cardList) => {
            return normalizeTradeList(cardList).map((savedCard) => {
                const cardGroup = getCardGroup(savedCard.name);
                if (!cardGroup || !cardGroup.editions?.length) {
                    console.warn(`Card not found or has no editions: ${savedCard.name}`);
                    return null;
                }

                let selectedEdition = cardGroup.editions[0];
                if (savedCard.subTypeName) {
                    const editionByType = cardGroup.editions.find(
                        (e) => e.subTypeName === savedCard.subTypeName,
                    );
                    if (editionByType) selectedEdition = editionByType;
                }
                if (savedCard.uniqueId) {
                    const editionById = cardGroup.editions.find(
                        (e) => e.uniqueId === savedCard.uniqueId,
                    );
                    if (editionById) selectedEdition = editionById;
                }

                const matchedCard = savedCard.uniqueId
                    ? cardIdLookup[savedCard.uniqueId]
                    : null;

                return {
                    name: cardGroup.name,
                    price: selectedEdition.cardPrice,
                    quantity: savedCard.quantity || 1,
                    cardGroup,
                    availableEditions: cardGroup.editions,
                    subTypeName: selectedEdition.subTypeName || 'Normal',
                    uniqueId: selectedEdition.uniqueId,
                    imageUrl: savedCard.imageUrl
                        || selectedEdition.imageUrl
                        || matchedCard?.imageUrl
                        || '',
                };
            }).filter(Boolean);
        };

        const have = reconstructFromHistory(trade.have_list);
        const want = reconstructFromHistory(trade.want_list);
        setHaveList(have);
        setWantList(want);
        clearURLTradeData();
        capture('trade_loaded_from_history', {
            have_count: have.length,
            want_count: want.length,
            trade_id: trade.id || null,
        });
    };

    // Get URL size estimation
    const getURLSizeInfo = () => {
        return estimateTradeURLSize(haveList, wantList);
    };

    // Test URL encoding round-trip
    const testURLRoundTrip = () => {
        return testURLEncoding(haveList, wantList);
    };

    const haveTotal = useMemo(() => calculateTotal(haveList), [haveList]);
    const wantTotal = useMemo(() => calculateTotal(wantList), [wantList]);
    const diff = useMemo(() => calculateDiff(haveTotal, wantTotal), [haveTotal, wantTotal]);

    return {
        haveList,
        wantList,
        haveInput,
        wantInput,
        setHaveInput,
        setWantInput,
        addHaveCard: (name) => addCard(haveList, setHaveList, name || haveInput, setHaveInput, 'have'),
        addWantCard: (name) => addCard(wantList, setWantList, name || wantInput, setWantInput, 'want'),
        removeHaveCard: (index) => removeCard(haveList, setHaveList, index, 'have'),
        removeWantCard: (index) => removeCard(wantList, setWantList, index, 'want'),
        updateHaveCardQuantity: (i, q) => updateQuantity(haveList, setHaveList, i, q),
        updateWantCardQuantity: (i, q) => updateQuantity(wantList, setWantList, i, q),
        haveTotal,
        wantTotal,
        diff,
        generateShareURL,
        clearURLTradeData,
        clearTrade,
        getURLSizeInfo,
        testURLRoundTrip,
        urlTradeData,
        hasLoadedFromURL,
        loadTradeFromHistory,
    };
}
