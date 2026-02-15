/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Authors: Bluscream
// Created at 2026-01-10 11:03:00

import { Logger } from "@utils/Logger";

const pluginId = "vcUtils";
const pluginName = "Voice Channel Utilities";
const logger = new Logger(pluginName, "#7289da");

import definePlugin from "@utils/types";
import { UserStore, VoiceStateStore } from "@webpack/common";
import { registerSharedContextMenu } from "./utils/menus";
import { settings } from "./settings";
import { statuses } from "./state";
import { log } from "./utils";
import { handleVoiceStateUpdate } from "./logic";
import { VoiceChannelContext, UserContextMenuPatch } from "./menus";

export default definePlugin({
    name: pluginName,
    description: "Voice channel copy utilities (name, status, code)",
    authors: [
        { name: "Bluscream", id: 467777925790564352n },
        { name: "Cursor.AI", id: 0n }],
    settings,
    flux: {
        VOICE_CHANNEL_STATUS_UPDATE({ type, id, guildId, status }) {
            log(`${type};${guildId}/${id};"${status}"`);
            if (settings.store.fallbackDict) {
                statuses[id] = status;
            }
        },
        VOICE_CHANNEL_STATUS_REQUEST({ type, guildId }) {
            log(`${type};${guildId}`);
        },
        VOICE_STATE_UPDATES({ voiceStates }) {
            log(`🎯 VOICE_STATE_UPDATES flux event received:`, voiceStates.length, "states");
            const myId = UserStore.getCurrentUser().id;

            for (const voiceState of voiceStates) {
                if (voiceState.userId === myId) {
                    log(`🎯 Processing my voice state update:`, voiceState);
                    handleVoiceStateUpdate(voiceState);
                    break; // Only process our own voice state
                }
            }
        },
        VOICE_STATE_CONNECT(voiceState) {
            log(`🎤 VOICE_STATE_CONNECT event received:`, voiceState);
            handleVoiceStateUpdate(voiceState);
        },
        VOICE_STATE_DISCONNECT(voiceState) {
            log(`🎤 VOICE_STATE_DISCONNECT event received:`, voiceState);
        },
        VOICE_CHANNEL_SELECT({ type, channelId, guildId }) {
            log(`${type};${guildId}/${channelId}`);
        },
        RTC_CONNECTION_STATE_CHANGE({ type, state, channelId, guildId }) {
            log(`${type};${guildId}/${channelId};"${state}"`);
        }
    },
    stopCleanup: null as (() => void) | null,
    start() {
        log(`🚀 Plugin started - auto-extract servers: ${settings.store.autoExtractServers}`);
        log(`🎤 Current voice state:`, VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser().id));
        this.stopCleanup = registerSharedContextMenu(pluginName, {
            "channel-context": (children, props) => {
                if (props.channel) VoiceChannelContext(children, props);
            },
            "user-context": (children, props) => {
                if (props.user) UserContextMenuPatch(children, props);
            }
        }, log);
    },
    stop() {
        this.stopCleanup?.();
    }
});
