import {ShortcutState} from "~/utils/BypassShortcut";

const heldKeys = new Set<string>()

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta", "AltGraph"])

function clear() {
    heldKeys.clear()
}

/**
 * modifiers are read from the click that triggered the lookup instead of the tracked
 * keydowns, because a keyup can be missed. macOS drops the keyup of regular keys while
 * Command is held, and any focus change drops it too
 */
export function getShortcutState(event: MouseEvent): ShortcutState {
    return {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
        keys: [...heldKeys],
    }
}

function trackKeyDown(e: KeyboardEvent) {
    if (MODIFIER_KEYS.has(e.key)) {
        return
    }
    if (e.code) {
        heldKeys.add(e.code)
    }
    if (e.key) {
        heldKeys.add(e.key.toLowerCase())
    }
}

function trackKeyUp(e: KeyboardEvent) {
    if (MODIFIER_KEYS.has(e.key)) {
        // releasing Command on macOS hides the keyup of every key held with it,
        // so drop everything to avoid a key staying stuck as held
        if (e.key === "Meta") {
            clear()
        }
        return
    }
    if (e.code) {
        heldKeys.delete(e.code)
    }
    if (e.key) {
        heldKeys.delete(e.key.toLowerCase())
    }
}

export function boot() {
    // capture phase, so a page that stops propagation can not hide the shortcut
    document.addEventListener("keydown", trackKeyDown, true)
    document.addEventListener("keyup", trackKeyUp, true)
    window.addEventListener("blur", clear)
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            clear()
        }
    })
}
