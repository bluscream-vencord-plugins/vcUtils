import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    fallbackDict: {
        type: OptionType.BOOLEAN,
        description: "Use fallback dictionary for channel statuses",
        default: true,
        restartNeeded: false,
    },
    logging: {
        type: OptionType.BOOLEAN,
        description: "Enable logging of flux events and other internal actions to the console",
        default: true,
        restartNeeded: false,
    },
    codeRegex: {
        type: OptionType.STRING,
        description: "Regex pattern to match codes",
        default: "\\b([a-z0-9]{5}|[A-Z0-9]{5})\\b",
        restartNeeded: false,
    },
    ignoredWords: {
        type: OptionType.STRING,
        description: "Whitelisted words to ignore in status extraction",
        default: "camos,grind",
        restartNeeded: false,
    },
    autoExtractServers: {
        type: OptionType.STRING,
        description: "Servers to auto-extract codes from when joining a voice channel",
        default: "500074231544152074,687345074627149873",
        restartNeeded: false,
    }
});
