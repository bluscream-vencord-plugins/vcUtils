import { ChannelStore, FluxDispatcher, Toasts } from "@webpack/common";
import { findStoreLazy } from "@webpack";
import { settings } from "./settings";
import { pluginInfo } from "./index";
import { statuses } from "./state";

const ChannelStatusStore = findStoreLazy("ChannelStatusStore");

export function log(...args: any[]) {
    if (settings.store.logging) {
        console.log(`[vcUtils]`, ...args);
    }
}

export function showToast(message: string, error?: any | undefined) {
    if (error) console.error(`[${pluginInfo.name}] ${message}:`, error);
    else log(`${message}`);
    Toasts.show({
        message,
        id: Toasts.genId(),
        type: error ? Toasts.Type.FAILURE : Toasts.Type.MESSAGE
    });
}

export function requestVoiceChannelStatus(channelId: string) {
    try {
        const channel = ChannelStore.getChannel(channelId);
        if (channel?.guild_id) {
            const dispatchPayload = {
                type: "VOICE_CHANNEL_STATUS_REQUEST",
                guildId: channel.guild_id
            };
            log(`Dispatching status request for guild ${channel.guild_id}`, dispatchPayload);
            FluxDispatcher.dispatch(dispatchPayload);
        } else {
            log(`Cannot request status - no guild_id for channel ${channelId}`);
        }
    } catch (error) {
        showToast("Error requesting voice channel status", error);
    }
}

export function getVoiceChannelStatusFromUI(channelId: string): string | null {
    try {
        log(`Getting status from UI for channel: ${channelId}`);
        const voiceChannelElements = document.querySelectorAll('li[class*="voiceChannel"]');

        for (const element of voiceChannelElements) {
            const fiberKey = Object.keys(element).find(key =>
                key.startsWith("__reactInternalInstance$") || key.startsWith("__reactFiber$")
            );

            if (fiberKey) {
                const fiber = (element as any)[fiberKey];
                let current = fiber;

                while (current) {
                    if (current.memoizedProps && current.memoizedProps.channel) {
                        const { channel } = current.memoizedProps;
                        if (channel.id === channelId) {
                            log(`Found channel ${channelId}`);
                            const spans = element.querySelectorAll("span");
                            for (const span of spans) {
                                const text = span.textContent?.trim();
                                if (text && text.length > 3 && !text.match(/^(Voice|Open Chat|Invite to Voice|\d{1,2}|Playing|WZDE|snus)$/)) {
                                    log(`Extracted status from span: "${text}"`);
                                    return text;
                                }
                            }

                            const text = element.textContent || "";
                            log(`Trying fallback extraction from full text: ${text}`);

                            const statusMatch = text.match(/Invite to Voice\d+(.+?)(?=@[A-Za-z0-9_]+|\d{1,2}:\d{2}:\d{2})/);
                            if (statusMatch) {
                                const status = statusMatch[1].trim();
                                log(`Extracted fallback status: "${status}"`);
                                return status;
                            }

                            const fallbackMatch = text.match(/Open Chat(.+?)(?=@[A-Za-z0-9_]+|\d{1,2}:\d{2}:\d{2})/);
                            if (fallbackMatch) {
                                const status = fallbackMatch[1].trim();
                                log(`Extracted Open Chat fallback status: "${status}"`);
                                return status;
                            }

                            log(`No status text found in UI`);
                            return null;
                        }
                        break;
                    }
                    current = current.return;
                }
            }
        }

        log(`Channel ${channelId} not found in UI`);
        return null;
    } catch (error) {
        console.error(`[${pluginInfo.name}] Error getting status from UI:`, error);
        return null;
    }
}

export function getVoiceChannelStatus(channelId: string): string | null {
    try {
        log(`Getting status for channel: ${channelId}`);
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) {
            log(`Channel not found: ${channelId}`);
            return null;
        }

        log(`Channel found: ${channel.name}, guild: ${channel.guild_id}, type: ${channel.type}`);
        requestVoiceChannelStatus(channelId);

        let status = ChannelStatusStore.getChannelStatus(channelId, channel.guild_id, channel.type);
        log(`Raw status from store:`, status);

        if (status !== undefined && status !== null && status.trim() !== "") {
            log(`Found valid status: "${status}"`);
            return status;
        }

        status = statuses[channelId];
        if (status !== undefined && status !== null && status.trim() !== "") {
            log(`Found valid status in fallback: "${status}"`);
            return status;
        }

        log(`Trying to get status from UI element`);
        const uiStatus = getVoiceChannelStatusFromUI(channelId);
        if (uiStatus !== undefined && uiStatus !== null && uiStatus.trim() !== "") {
            log(`Found valid status from UI: "${uiStatus}"`);
            return uiStatus;
        }

        log(`No valid status found`);
        return null;
    } catch (error) {
        showToast("Error getting voice channel status", error);
        return null;
    }
}

export function extractCodeWithIgnore(text: string, regex: RegExp, ignoredWords: string[]): string | null {
    if (!text) return null;
    const matches = text.match(regex);
    if (!matches) return null;
    const ignoredSet = new Set(ignoredWords.map(word => word.toLowerCase().trim()));
    for (const match of matches) {
        if (!ignoredSet.has(match.toLowerCase())) {
            return match;
        }
    }
    return null;
}
