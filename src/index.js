const { after } = vendetta.patcher;
const { findByProps } = vendetta.metro;

const userActivity = new Map();
const unpatches = [];
let unregisterCommand;

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

const getActivityText = (userId) => {
    const lastActive = userActivity.get(userId);
    if (!lastActive) return "No tracked activity for this user yet.";
    const diffMinutes = Math.floor((Date.now() - lastActive) / 60000);
    return diffMinutes < 1 ? "Active now" : `Last seen ${diffMinutes}m ago (tracked locally)`;
};

export default {
    onLoad: () => {
        patchTyping();
        patchMessageCreate();

        unregisterCommand = vendetta.commands.registerCommand({
            name: "lastactive",
            displayName: "lastactive",
            description: "Show last tracked activity for a user",
            displayDescription: "Show last tracked activity for a user",
            options: [
                {
                    name: "user",
                    displayName: "user",
                    description: "The user to check",
                    displayDescription: "The user to check",
                    type: 6,
                    required: true,
                },
            ],
            execute: (args, ctx) => {
                const userId = args.find((a) => a.name === "user")?.value;
                const text = userId ? getActivityText(userId) : "No user provided.";
                return { content: text };
            },
        });
    },
    onUnload: () => {
        unpatches.forEach((unpatch) => unpatch());
        unpatches.length = 0;
        userActivity.clear();
        if (unregisterCommand) unregisterCommand();
    },
};
