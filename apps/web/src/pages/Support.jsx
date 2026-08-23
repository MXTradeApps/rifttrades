import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Link as MuiLink,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import Header from '../components/elements/Header.jsx';
import { useCardData } from '../hooks/useCardData.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';

const SUPPORT_EMAIL = 'mxbloombusiness@gmail.com';
const FORM_NAME = 'support';

const encodeFormBody = (data) =>
    Object.keys(data)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] ?? '')}`)
        .join('&');

const Support = () => {
    const { isDark } = useThemeMode();
    const { metadata } = useCardData();
    const lastUpdatedTimestamp = metadata?.lastUpdated || metadata?.updatedAt || null;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [botField, setBotField] = useState('');
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        document.title = 'Support | RiftTrades';
        return () => {
            document.title = 'RiftTrades';
        };
    }, []);

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #061825 0%, #0a2540 50%, #0d3050 100%)'
        : 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 50%, #c0dce8 100%)';

    const titleColor = isDark ? '#e8f4f8' : '#0a2540';
    const subtle = isDark ? 'rgba(160, 196, 212, 0.85)' : 'rgba(26, 74, 110, 0.85)';
    const accent = isDark ? '#d4a853' : '#1a5a7a';

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)',
            '& fieldset': {
                borderColor: isDark ? 'rgba(212, 168, 83, 0.35)' : 'rgba(26, 90, 122, 0.25)',
            },
            '&:hover fieldset': {
                borderColor: isDark ? 'rgba(212, 168, 83, 0.55)' : 'rgba(26, 90, 122, 0.4)',
            },
            '&.Mui-focused fieldset': {
                borderColor: accent,
            },
        },
        '& .MuiInputLabel-root': { color: subtle },
        '& .MuiInputLabel-root.Mui-focused': { color: accent },
        '& .MuiOutlinedInput-input, & .MuiInputBase-inputMultiline': { color: titleColor },
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encodeFormBody({
                    'form-name': FORM_NAME,
                    'bot-field': botField,
                    name: name.trim(),
                    email: email.trim(),
                    message: message.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error(`Submission failed (${response.status})`);
            }

            setStatus('success');
            setName('');
            setEmail('');
            setMessage('');
        } catch (err) {
            setStatus('error');
            setErrorMessage(
                err?.message || 'Something went wrong. Please try again or email us directly.'
            );
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                background: bgGradient,
                backgroundAttachment: 'fixed',
            }}
        >
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 }, pb: { xs: 8, md: 10 } }}>
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            color: titleColor,
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', md: '2rem' },
                        }}
                    >
                        Support
                    </Typography>
                    <Typography variant="body2" sx={{ color: subtle, lineHeight: 1.6 }}>
                        Tell us what&apos;s going on and we&apos;ll get back to you at the email you
                        provide. You can also reach us directly at{' '}
                        <MuiLink href={`mailto:${SUPPORT_EMAIL}`} sx={{ color: accent }}>
                            {SUPPORT_EMAIL}
                        </MuiLink>
                        .
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: isDark ? 'rgba(13, 48, 80, 0.7)' : '#ffffff',
                        border: `1px solid ${isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)'}`,
                        borderTop: `4px solid ${accent}`,
                        borderRadius: 2,
                        p: { xs: 2.5, md: 4 },
                    }}
                >
                    {status === 'success' ? (
                        <Alert
                            severity="success"
                            sx={{
                                backgroundColor: isDark ? 'rgba(46, 125, 50, 0.2)' : undefined,
                                color: titleColor,
                            }}
                        >
                            Thanks — your message was sent. We&apos;ll reply as soon as we can.
                        </Alert>
                    ) : (
                        <Box
                            component="form"
                            name={FORM_NAME}
                            method="POST"
                            data-netlify="true"
                            data-netlify-honeypot="bot-field"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <input type="hidden" name="form-name" value={FORM_NAME} />

                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: '-10000px',
                                    height: 0,
                                    overflow: 'hidden',
                                }}
                                aria-hidden="true"
                            >
                                <label>
                                    Don&apos;t fill this out if you&apos;re human:
                                    <input
                                        name="bot-field"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={botField}
                                        onChange={(e) => setBotField(e.target.value)}
                                    />
                                </label>
                            </Box>

                            <TextField
                                required
                                fullWidth
                                id="support-name"
                                name="name"
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                margin="normal"
                                autoComplete="name"
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />

                            <TextField
                                required
                                fullWidth
                                id="support-email"
                                name="email"
                                type="email"
                                label="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                autoComplete="email"
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />

                            <TextField
                                required
                                fullWidth
                                id="support-message"
                                name="message"
                                label="Issue description"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                margin="normal"
                                multiline
                                minRows={5}
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />

                            {status === 'error' && (
                                <Alert severity="error" sx={{ mt: 2, mb: 1, color: titleColor }}>
                                    {errorMessage}{' '}
                                    <MuiLink href={`mailto:${SUPPORT_EMAIL}`} sx={{ color: accent }}>
                                        {SUPPORT_EMAIL}
                                    </MuiLink>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={
                                    status === 'submitting' ||
                                    !name.trim() ||
                                    !email.trim() ||
                                    !message.trim()
                                }
                                sx={{
                                    mt: 2.5,
                                    py: 1.25,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    backgroundColor: isDark ? '#d4a853' : '#1a5a7a',
                                    color: isDark ? '#0a2540' : '#fff',
                                    '&:hover': {
                                        backgroundColor: isDark ? '#e5c078' : '#0d4560',
                                    },
                                    '&.Mui-disabled': {
                                        backgroundColor: isDark
                                            ? 'rgba(212, 168, 83, 0.35)'
                                            : 'rgba(26, 90, 122, 0.35)',
                                        color: isDark
                                            ? 'rgba(10, 37, 64, 0.7)'
                                            : 'rgba(255, 255, 255, 0.7)',
                                    },
                                }}
                            >
                                {status === 'submitting' ? (
                                    <CircularProgress size={22} sx={{ color: isDark ? '#0a2540' : '#fff' }} />
                                ) : (
                                    'Send message'
                                )}
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
};

export default Support;
