const { after } = vendetta.patcher;
const { findByProps } = vendetta.metro;
const { showToast } = vendetta.ui.toasts;
const { storage } = vendetta.plugin;

const unpatches = [];

const setActivity = (userId) => {
    if (!userId) return;
    storage.activity = storage.activity || {};
    storage.activity[userId] = Date.now();
};

const getActivityText = (userId) => {
    const lastActive = storage.activity?.[userId];
    if (!lastActive) return "No tracked activity yet";
    const diffMinutes = Math.floor((Date.now() - lastActive) / 60000);
    return diffMinutes < 1 ? "Active now" : `Last seen ${diffMinutes}m ago`;
};

const patchTyping = () => {
    const typingModule = findByProps("startTyping", "onTypingStart");
    if (!typingModule) return;
    unpatches.push(
        after("onTypingStart", typingModule, ([typingData]) => {
            setActivity(typingData?.userId);
        })
    );
};

const patchMessageCreate = () => {
    const dispatcher = findByProps("dispatch", "subscribe");
    if (!dispatcher) return;
    unpatches.push(
        after("dispatch", dispatcher, ([action]) => {
            if (action?.type === "MESSAGE_CREATE" && action.message?.author?.id) {
                setActivity(action.message.author.id);
            }
        })
    );
};

const patchProfileOpen = () => {
    const dispatcher = findByProps("dispatch", "subscribe");
    if (!dispatcher) return;
    unpatches.push(
        after("dispatch", dispatcher, ([action]) => {
            if (action?.type !== "USER_PROFILE_FETCH_SUCCESS") return;
            const userId = action.userProfile?.user?.id;
            if (!userId) return;
            showToast(getActivityText(userId));
        })
    );
};

export default {
    onLoad: () => {
        patchTyping();
        patchMessageCreate();
        patchProfileOpen();
    },
    onUnload: () => {
        unpatches.forEach((unpatch) => unpatch());
        unpatches.length = 0;
    },
};
