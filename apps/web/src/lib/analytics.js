import posthog from 'posthog-js';

/**
 * Thin analytics helpers so call sites stay safe when PostHog is not configured
 * (missing env) or blocked.
 */

export function isAnalyticsReady() {
    return Boolean(
        import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
        && typeof posthog?.capture === 'function',
    );
}

export function capture(event, properties = {}) {
    try {
        if (!isAnalyticsReady()) return;
        posthog.capture(event, properties);
    } catch (error) {
        console.warn('analytics.capture failed', error);
    }
}

export function identifyUser(user) {
    try {
        if (!isAnalyticsReady() || !user?.id) return;
        const provider =
            user.app_metadata?.provider ||
            user.app_metadata?.providers?.[0] ||
            null;
        posthog.identify(user.id, {
            email: user.email || undefined,
            name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.user_metadata?.preferred_username ||
                undefined,
            auth_provider: provider || undefined,
        });
    } catch (error) {
        console.warn('analytics.identify failed', error);
    }
}

export function resetAnalytics() {
    try {
        if (!isAnalyticsReady()) return;
        posthog.reset();
    } catch (error) {
        console.warn('analytics.reset failed', error);
    }
}

export function captureException(error, properties = {}) {
    try {
        if (!isAnalyticsReady()) return;
        posthog.captureException(error, properties);
    } catch (err) {
        console.warn('analytics.captureException failed', err);
    }
}
