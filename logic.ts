import { ChannelStore, MessageStore, UserStore, VoiceStateStore } from "@webpack/common";
import { type Channel } from "@vencord/discord-types";
import { isVoiceChannel } from "./utils/channels";
import { copyWithToast } from "@utils/discord";
import { settings, pluginName } from "./settings";
import { log, getVoiceChannelStatus, extractCodeWithIgnore } from "./utils";

export async function extractCode(channel: Channel): Promise<string | null> {
    log(`extractCode called for channel: ${channel.name} (${channel.id})`);
    const regex = new RegExp(settings.store.codeRegex);
    const ignoredWords = settings.store.ignoredWords.split(",").filter(w => w.trim());
    log(`Using regex pattern: ${settings.store.codeRegex}`);
    log(`Ignored words: [${ignoredWords.join(", ")}]`);

    log(`Checking channel status`);
    const status = getVoiceChannelStatus(channel.id);
    if (status) {
        const statusMatch = extractCodeWithIgnore(status, regex, ignoredWords);
        if (statusMatch) {
            log(`Found code in channel status: ${statusMatch}`);
            return statusMatch;
        }
    }

    log(`Checking channel topic: "${channel.topic}"`);
    const topicMatch = extractCodeWithIgnore(channel.topic || "", regex, ignoredWords);
    if (topicMatch) {
        log(`Found code in channel topic: ${topicMatch}`);
        return topicMatch;
    }

    log(`Checking channel name: "${channel.name}"`);
    const nameMatch = extractCodeWithIgnore(channel.name || "", regex, ignoredWords);
    if (nameMatch) {
        log(`Found code in channel name: ${nameMatch}`);
        return nameMatch;
    }

    log(`Checking messages in channel...`);
    try {
        const messages = MessageStore.getMessages(channel.id);
        if (messages && messages.toArray) {
            const messageArray = messages.toArray();
            for (const message of messageArray) {
                if (message.content) {
                    const messageMatch = extractCodeWithIgnore(message.content, regex, ignoredWords);
                    if (messageMatch) {
                        log(`Found code in message from ${message.author?.username || "unknown"}: ${messageMatch}`);
                        return messageMatch;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[${pluginName}] Error extracting code from messages:`, error);
    }

    log(`No code found in channel`);
    return null;
}

export async function handleVoiceStateUpdate(voiceState: any) {
    log(`VOICE_STATE_UPDATE received:`, {
        channelId: voiceState.channelId,
        userId: voiceState.userId,
        currentUserId: UserStore.getCurrentUser().id,
        isCurrentUser: voiceState.userId === UserStore.getCurrentUser().id,
        hasChannelId: !!voiceState.channelId
    });

    try {
        if (!voiceState.channelId) return;
        if (voiceState.userId !== UserStore.getCurrentUser().id) return;

        const channel = ChannelStore.getChannel(voiceState.channelId);
        if (!isVoiceChannel(channel)) return;

        const autoExtractServers = settings.store.autoExtractServers.split(",").map(id => id.trim()).filter(Boolean);
        const serverInList = autoExtractServers.includes(channel.guild_id);

        if (!serverInList) return;

        log(`✅ Auto-extracting code for channel ${channel.name} in server ${channel.guild_id}`);

        const code = await extractCode(channel);
        if (code) {
            log(`✅ Auto-extracted code ${code} - copying to clipboard`);
            copyWithToast(code, `Auto-extracted code ${code} copied`);
        } else {
            log(`❌ No code found for auto-extraction`);
        }
    } catch (error) {
        console.error(`[${pluginName}] ❌ Error in auto-extract:`, error);
    }
}

export async function handleVoiceChannelStatusUpdate(channelId: string, guildId: string) {
    try {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;

        const currentVoiceState = VoiceStateStore.getVoiceStateForUser(currentUser.id);
        if (!currentVoiceState || currentVoiceState.channelId !== channelId) return;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;

        const autoExtractServers = settings.store.autoExtractServers.split(",").map(id => id.trim()).filter(Boolean);
        const serverInList = autoExtractServers.includes(guildId);

        if (!serverInList) return;

        const code = await extractCode(channel);
        if (code) {
            copyWithToast(code, `Auto-extracted code ${code} copied`);
        }
    } catch (error) {
        console.error(`[${pluginName}] ❌ Error in status update auto-extract:`, error);
    }
}
