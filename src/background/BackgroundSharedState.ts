import {getLatestConfig} from "~/configs/Config";
import {emptyShortcutState, shortcutMatches, ShortcutState} from "~/utils/BypassShortcut";

let lastShortcutState: ShortcutState = emptyShortcutState

export function setShortcutState(state: ShortcutState) {
    lastShortcutState = state
}

export function isBypassShortcutPressed() {
    // When auto-capture of download links is enabled, holding down the shortcut key
    // and clicking on the download link uses the internal browser download method.
    return shortcutMatches(getLatestConfig().bypassShortcut, lastShortcutState)
}
