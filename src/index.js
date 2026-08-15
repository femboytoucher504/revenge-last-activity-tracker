import { before, after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";

const { Text } = findByProps("Text") ?? {};

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

const patchProfileModal = () => {
    const Profile = findByProps("UserProfileModal")?.UserProfileModal
        ?? findByProps("default")?.default;
    if (!Profile) return;

    unpatches.push(
        after("render", Profile.prototype ?? Profile, function (args, res) {
            const targetUser = args?.[0]?.user;
            if (!targetUser) return res;

            const lastActive = userActivity.get(targetUser.id);
            const statusText = lastActive
                ? (Date.now() - lastActive) / 60000 < 1
                    ? "Active now"
                    : `Active ${Math.floor((Date.now() - lastActive) / 60000)}m ago`
                : "No tracked activity";

            if (res?.props?.children && Text) {
                res.props.children.push(
                    React.createElement(
                        Text,
                        { style: { color: "#aaaaaa", marginTop: 14, textAlign: "center" } },
                        statusText
                    )
                );
            }
            return res;
        })
    );
};

export default {
    onLoad: () => {
        patchTyping();
        patchMessageCreate();
        patchProfileModal();
    },
    onUnload: () => {
        unpatches.forEach((unpatch) => unpatch());
        unpatches.length = 0;
        userActivity.clear();
    },
};
