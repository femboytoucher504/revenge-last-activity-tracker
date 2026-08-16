const { after } = vendetta.patcher;
const { findByProps } = vendetta.metro;
const { showToast } = vendetta.ui.toasts;

const userActivity = new Map();
const unpatches = [];

const patchTyping = () => {
    const typingModule = findByProps("startTyping", "onTypingStart");
    if (!typingModule) return;
    unpatches.push(
        after("onTypingStart", typingModule, ([typingData]) => {
            if (typingData?.userId) userActivity.set(typingData.userId, Date.now());
        })
    );
};

const patchMessageCreate = () => {
    const dispatcher = findByProps("dispatch", "subscribe");
    if (!dispatcher) return;
    unpatches.push(
        after("dispatch", dispatcher, ([action]) => {
            if (action?.type === "MESSAGE_CREATE" && action.message?.author?.id) {
                userActivity.set(action.message.author.id, Date.now());
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

            const lastActive = userActivity.get(userId);
            let text;
            if (!lastActive) {
                text = "No tracked activity yet";
            } else {
                const diffMinutes = Math.floor((Date.now() - lastActive) / 60000);
                text = diffMinutes < 1 ? "Active now" : `Last seen ${diffMinutes}m ago`;
            }
            showToast(text);
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
        userActivity.clear();
    },
};
