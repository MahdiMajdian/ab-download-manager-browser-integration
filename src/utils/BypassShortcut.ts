/**
 * the shortcut the user holds while clicking a link to let the browser
 * download the file instead of the app
 *
 * stored as a "+" joined spec, like "Alt", "Alt+Shift" or "Delete"
 */

export const NO_SHORTCUT = "none"

const MODIFIER_TOKENS = ["Control", "Alt", "Shift", "Meta"] as const
type ModifierToken = typeof MODIFIER_TOKENS[number]

function isModifierToken(token: string): token is ModifierToken {
    return (MODIFIER_TOKENS as ReadonlyArray<string>).includes(token)
}

/**
 * `keys` holds the non modifier keys that are down, each one contributes its `code`
 * and its lowercased `key` so a spec matches on any keyboard layout
 */
export type ShortcutState = {
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
    keys: string[]
}

export const emptyShortcutState: ShortcutState = Object.freeze({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    keys: [],
})

type ParsedShortcut = {
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
    key: string | null
}

/**
 * returns null when the shortcut is disabled or can not be parsed
 */
function parseShortcut(spec: string | null | undefined): ParsedShortcut | null {
    if (!spec) {
        return null
    }
    const tokens = spec.split("+").map(t => t.trim()).filter(t => t.length > 0)
    if (tokens.length === 0 || tokens.some(t => t.toLowerCase() === NO_SHORTCUT)) {
        return null
    }
    const parsed: ParsedShortcut = {ctrl: false, alt: false, shift: false, meta: false, key: null}
    for (const token of tokens) {
        if (isModifierToken(token)) {
            switch (token) {
                case "Control":
                    parsed.ctrl = true
                    break
                case "Alt":
                    parsed.alt = true
                    break
                case "Shift":
                    parsed.shift = true
                    break
                case "Meta":
                    parsed.meta = true
                    break
            }
        } else if (parsed.key === null) {
            parsed.key = token
        } else {
            return null
        }
    }
    return parsed
}

/**
 * modifiers are matched exactly, so "Alt" does not fire while "Alt+Shift" is held
 */
export function shortcutMatches(spec: string | null | undefined, state: ShortcutState): boolean {
    const parsed = parseShortcut(spec)
    if (parsed === null) {
        return false
    }
    if (
        parsed.ctrl !== state.ctrl ||
        parsed.alt !== state.alt ||
        parsed.shift !== state.shift ||
        parsed.meta !== state.meta
    ) {
        return false
    }
    if (parsed.key === null) {
        return parsed.ctrl || parsed.alt || parsed.shift || parsed.meta
    }
    const accepted = [parsed.key]
    if (isMacPlatform() && parsed.key === "Delete") {
        // the key labelled `delete` on a mac keyboard reports Backspace,
        // the real Delete is fn + delete
        accepted.push("Backspace")
    }
    return accepted.some(key => state.keys.includes(key) || state.keys.includes(key.toLowerCase()))
}

export function isMacPlatform(): boolean {
    if (typeof navigator === "undefined") {
        return false
    }
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || ""
    return /mac/i.test(platform)
}

const MAC_SYMBOLS: Record<ModifierToken, string> = {
    Control: "⌃ Control",
    Alt: "⌥ Option",
    Shift: "⇧ Shift",
    Meta: "⌘ Command",
}

const OTHER_SYMBOLS: Record<ModifierToken, string> = {
    Control: "Ctrl",
    Alt: "Alt",
    Shift: "Shift",
    Meta: "Win",
}

export function formatShortcut(spec: string | null | undefined, isMac: boolean): string {
    const parsed = parseShortcut(spec)
    if (parsed === null) {
        return ""
    }
    const symbols = isMac ? MAC_SYMBOLS : OTHER_SYMBOLS
    const parts: string[] = []
    if (parsed.ctrl) parts.push(symbols.Control)
    if (parsed.alt) parts.push(symbols.Alt)
    if (parsed.shift) parts.push(symbols.Shift)
    if (parsed.meta) parts.push(symbols.Meta)
    if (parsed.key !== null) parts.push(prettyKeyName(parsed.key, isMac))
    return parts.join(" + ")
}

function prettyKeyName(key: string, isMac: boolean): string {
    // on a mac `Delete` is satisfied by the key labelled `delete`, which is why
    // it is shown with that key's symbol rather than the forward delete one
    if (key === "Delete" && isMac) {
        return "⌫ Delete"
    }
    return key
}

export type ShortcutPreset = {
    value: string
    label: string
    group: string
}

const GROUP_MODIFIERS = "config_bypass_shortcut_group_modifiers"
const GROUP_COMBINATIONS = "config_bypass_shortcut_group_combinations"
const GROUP_KEYS = "config_bypass_shortcut_group_keys"

/**
 * `group` and the warning below are i18n message names, the settings page resolves them
 */
export function getShortcutPresets(isMac: boolean): ShortcutPreset[] {
    const presets = [
        {value: "Alt", group: GROUP_MODIFIERS},
        {value: "Shift", group: GROUP_MODIFIERS},
        {value: "Control", group: GROUP_MODIFIERS},

        {value: "Alt+Shift", group: GROUP_COMBINATIONS},
        {value: "Control+Shift", group: GROUP_COMBINATIONS},

        {value: "Delete", group: GROUP_KEYS},
        {value: "Backspace", group: GROUP_KEYS},
    ]
    // on a mac `Delete` already matches the key labelled `delete`, so a separate
    // Backspace entry would be a second option doing exactly the same thing
    return (isMac ? presets.filter(p => p.value !== "Backspace") : presets)
        .map(preset => ({...preset, label: formatShortcut(preset.value, isMac)}))
}

/**
 * warns about shortcuts the browser or the os consumes before the extension
 * can see the download, null when the shortcut is fine
 */
export function getShortcutWarning(spec: string | null | undefined, isMac: boolean): string | null {
    const parsed = parseShortcut(spec)
    if (parsed === null) {
        return null
    }
    if (isMac && parsed.ctrl) {
        return "config_bypass_shortcut_warning_mac_control"
    }
    if (parsed.key === null && parsed.shift && !parsed.ctrl && !parsed.alt && !parsed.meta) {
        return "config_bypass_shortcut_warning_shift"
    }
    return null
}
