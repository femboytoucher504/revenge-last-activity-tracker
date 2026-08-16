const { after } = vendetta.patcher;
const { findByProps } = vendetta.metro;
const { showToast } = vendetta.ui.toasts;

const memoryActivity = new Map();
let persistentStore = null;
try {
    persistentStore = vendetta.plugin && vendetta.plugin.storage ? vendetta.plugin.storage : null;
} catch (e) {
    persistentStore = null;
}

const unpatches = [];

const setActivity = (userId) => {
    if (!userId) return;
    try {
        memoryActivity.set(userId, Date.now());
        if (persistentStore) {
            persistentStore.activity = persistentStore.activity || {};
            persistentStore.activity[userId] = Date.now();
        }
    } catch (e) {
        // never let a storage error propagate into the app-wide dispatcher
    }
};

const getActivityText = (userId) => {
    try {
        const lastActive = (persistentStore && persistentStore.activity && persistentStore.activity[userId])
            || memoryActivity.get(userId);
        if (!lastActive) return "No tracked activity yet";
        const diffMinutes = Math.floor((Date.now() - lastActive) / 60000);
        return diffMinutes < 1 ? "Active now" : `Last seen ${diffMinutes}m ago`;
    } catch (e) {
        return "No tracked activity yet";
    }
};

const patchTyping = () => {
    try {
        const typingModule = findByProps("startTyping", "onTypingStart");
        if (!typingModule) return;
        unpatches.push(
            after("onTypingStart", typingModule, ([typingData]) => {
                try {
                    if (typingData?.userId) setActivity(typingData.userId);
                } catch (e) {}
            })
        );
    } catch (e) {}
};

const patchMessageCreate = () => {
    try {
        const dispatcher = findByProps("dispatch", "subscribe");
        if (!dispatcher) return;
        unpatches.push(
            after("dispatch", dispatcher, ([action]) => {
                try {
                    if (action?.type === "MESSAGE_CREATE" && action.message?.author?.id) {
                        setActivity(action.message.author.id);
                    }
                } catch (e) {}
            })
        );
    } catch (e) {}
};

const patchProfileOpen = () => {
    try {
        const dispatcher = findByProps("dispatch", "subscribe");
        if (!dispatcher) return;
        unpatches.push(
            after("dispatch", dispatcher, ([action]) => {
                try {
                    if (action?.type !== "USER_PROFILE_FETCH_SUCCESS") return;
                    const userId = action.userProfile?.user?.id;
                    if (!userId) return;
                    showToast(getActivityText(userId));
                } catch (e) {}
            })
        );
    } catch (e) {}
};

export default {
    onLoad: () => {
        patchTyping();
        patchMessageCreate();
        patchProfileOpen();
    },
    onUnload: () => {
        unpatches.forEach((unpatch) => {
            try { unpatch(); } catch (e) {}
        });
        unpatches.length = 0;
    },
};
