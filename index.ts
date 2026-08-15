import { Webpack, Patcher, Storage, UI } from "@revenge/mod";
import "./styles.css";

const ACTIVITY_STORE = "last_activity_tracker_data";
let userActivity: Record<string, {
    lastMessage: number|null,
    lastTyping: number|null,
    lastRead: number|null
}> = await Storage.get(ACTIVITY_STORE) ?? {};

const saveData = () => Storage.set(ACTIVITY_STORE, userActivity);

const { UserProfileModal, TypingEvents, MessageEvents, ReadStateStore } = Webpack.getByFilter(m => m.UserProfileModal && m.TypingEvents);

Patcher.after("MessageEvents", "onMessageCreate", (_, args) => {
    const [msg] = args;
    const userId = msg.author.id;
    if(!userActivity[userId]) userActivity[userId] = {lastMessage:null,lastTyping:null,lastRead:null};
    userActivity[userId].lastMessage = Date.now();
    saveData();
});

Patcher.after("TypingEvents", "onTypingStart", (_, args) => {
    const [typingData] = args;
    const userId = typingData.userId;
    if(!userActivity[userId]) userActivity[userId] = {lastMessage:null,lastTyping:null,lastRead:null};
    userActivity[userId].lastTyping = Date.now();
    saveData();
});

Patcher.after("ReadStateStore", "updateReadState", (_, args) => {
    const [readState] = args;
    const userId = readState.userId;
    if(!userActivity[userId]) userActivity[userId] = {lastMessage:null,lastTyping:null,lastRead:null};
    userActivity[userId].lastRead = Date.now();
    saveData();
});

function formatRelativeTime(timestamp: number|null): string {
    if(!timestamp) return "No recorded activity";
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if(days > 0) return `${days}d ago`;
    if(hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
}

Patcher.after(UserProfileModal, "render", (_, [props], returnVal) => {
    const userId = props.user.id;
    const data = userActivity[userId] ?? {lastMessage:null,lastTyping:null,lastRead:null};

    const activityBlock = UI.createElement("div", {
        className: "activity-tracker-block",
        children: [
            UI.createElement("div", {textContent: `Last Message: ${formatRelativeTime(data.lastMessage)}`}),
            UI.createElement("div", {textContent: `Last Typing: ${formatRelativeTime(data.lastTyping)}`}),
            UI.createElement("div", {textContent: `Last Read: ${formatRelativeTime(data.lastRead)}`})
        ]
    });

    const bioContainer = returnVal.props.children.find(c => c?.props?.className?.includes("bio"));
    if(bioContainer?.props.children) bioContainer.props.children.push(activityBlock);
});

export function stop() {
    Patcher.unpatchAll();
}

