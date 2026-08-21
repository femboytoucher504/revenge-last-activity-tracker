const { after } = vendetta.patcher;
const { findByProps } = vendetta.metro;
const { showToast } = vendetta.ui.toasts;

const memoryActivity = new Map();
let persistentStore = null;
try {
    persistentStore = vendetta.plugin && vendetta.plugin.storage ? vendetta.plugin.storage : null;
} catch (e) {}

const unpatches = [];

const setActivity = (userId) => {
    if (!userId) return;
    try {
        memoryActivity.set(userId, Date.now());
        if (persistentStore) {
            persistentStore.activity = persistentStore.activity || {};
            persistentStore.activity[userId] = Date.now();
        }
    } catch (e) {}
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

// ONE single dispatch patch handling both cases, cheapest possible early-exit
const patchDispatch = () => {
    try {
        const dispatcher = findByProps("dispatch", "subscribe");
        if (!dispatcher) return;
        unpatches.push(
            after("dispatch", dispatcher, ([action]) => {
                const type = action && action.type;
                if (type !== "MESSAGE_CREATE" && type !== "USER_PROFILE_FETCH_SUCCESS") return;
                try {
                    if (type === "MESSAGE_CREATE") {
                        const authorId = action.message && action.message.author && action.message.author.id;
                        if (authorId) setActivity(authorId);
                    } else {
                        const userId = action.userProfile && action.userProfile.user && action.userProfile.user.id;
                        if (userId) showToast(getActivityText(userId));
                    }
                } catch (e) {}
            })
        );
    } catch (e) {}
};

export default {
    onLoad: () => {
        patchTyping();
        patchDispatch();
    },
    onUnload: () => {
        unpatches.forEach((unpatch) => {
            try { unpatch(); } catch (e) {}
        });
        unpatches.length = 0;
    },
};
