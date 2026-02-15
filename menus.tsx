import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addToSubmenu } from "./utils/menus";
import { copyWithToast } from "@utils/discord";
import { type Channel, type Message, type User } from "@vencord/discord-types";
import { isVoiceChannel } from "./utils/channels";
import { ChannelStore, GuildStore, Menu, MessageStore, React, UserStore, VoiceStateStore } from "@webpack/common";
import { log, showToast, getVoiceChannelStatus } from "./utils";
import { extractCode } from "./logic";

interface VoiceChannelContextProps {
    channel: Channel;
}

export const VoiceChannelContext: NavContextMenuPatchCallback = (children, { channel }: VoiceChannelContextProps) => {
    log("VoiceChannelContext patch running for channel", channel.name);
    if (!isVoiceChannel(channel)) return children;

    const copySubmenu = (
        <Menu.MenuItem
            key="voice-tools-copy-submenu"
            id="voice-tools-copy-submenu"
            label="Copy"
        >
            <Menu.MenuItem
                key="voice-tools-copy-info"
                id="voice-tools-copy-info"
                label="Copy Info"
                action={() => {
                    try {
                        log(`Starting copy info for channel: ${channel.name}`);
                        let guild;
                        try { guild = GuildStore.getGuild(channel.guild_id); } catch (e) {}
                        let status;
                        try { status = getVoiceChannelStatus(channel.id); } catch (e) {}

                        let users = "";
                        try {
                            const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channel.id) as Record<string, any>;
                            users = Object.values(voiceStates || {}).map(state => {
                                const user = UserStore.getUser(state.userId);
                                return user ? `\\@${user.username}` : null;
                            }).filter(Boolean).join(", ");
                        } catch (e) {}

                        let messageCount = 0;
                        let lastMessage: Message | null = null;
                        try {
                            const messages = MessageStore.getMessages(channel.id);
                            messageCount = messages && messages.toArray ? messages.toArray().length : 0;
                            lastMessage = messages && messages.toArray ? messages.toArray()[0] : null;
                        } catch (e) {}

                        let info = `https://discord.com/channels/${channel.guild_id}/${channel.id}`;
                        if (lastMessage) info += `/${lastMessage.id}`;
                        if (guild) info += `\nGuild: \`${guild.name}\``;
                        if (channel?.name) info += `\nName: \`${channel.name}\``;
                        if (channel?.topic) info += `\nTopic: \`${channel.topic}\``;
                        if (status) info += `\nStatus: \`${status}\``;
                        if (users) info += `\nUsers: ${users}`;
                        if (messageCount > 0) info += `\nMessages: ${messageCount}`;

                        log(`Final info:`, info);
                        copyWithToast(info.trim());
                    } catch (error) {
                        showToast("Error copying info", error);
                    }
                }}
            />
            <Menu.MenuItem
                key="voice-tools-copy-name"
                id="voice-tools-copy-name"
                label="Copy Name"
                action={() => {
                    if (channel?.name) copyWithToast(channel.name, `Channel name "${channel.name}" copied`);
                }}
            />
            <Menu.MenuItem
                key="voice-tools-copy-status"
                id="voice-tools-copy-status"
                label="Copy Status"
                action={() => {
                    const status = getVoiceChannelStatus(channel.id);
                    if (status) copyWithToast(status, `Channel status "${status}" copied`);
                }}
            />
            <Menu.MenuItem
                key="voice-tools-copy-code"
                id="voice-tools-copy-code"
                label="Copy Code"
                action={async () => {
                    const code = await extractCode(channel);
                    if (code) copyWithToast(code, `Code ${code} copied`);
                }}
            />
        </Menu.MenuItem>
    );

    addToSubmenu(children, "voice-tools", "Voice Tools", [copySubmenu], log);
    return children;
};

export const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User }) => {
    if (!user) return;
    const voiceState = VoiceStateStore.getVoiceStateForUser(user.id);
    if (!voiceState?.channelId) return;

    const channel = ChannelStore.getChannel(voiceState.channelId);
    if (!channel) return;

    VoiceChannelContext(children, { channel });
    return children;
};
