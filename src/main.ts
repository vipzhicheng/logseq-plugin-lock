import "@logseq/libs";
import "./style.css";
import StegCloak from "stegcloak";
import { EmojiButton } from "@joeattardi/emoji-button";

// password
const stegcloak = new StegCloak(true, true);

const copyToClipboard = (str) => {
  const el = document.createElement("textarea");
  el.value = str;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  const selected =
    document.getSelection().rangeCount > 0
      ? document.getSelection().getRangeAt(0)
      : false;
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
};

const bodyEl = document.getElementById("body") as HTMLInputElement;
const lockButtonEl = document.getElementById("lock-button") as HTMLInputElement;
const closeButtonEl = document.getElementById(
  "close-button"
) as HTMLInputElement;
const passwordEl = document.getElementById("password") as HTMLInputElement;
const iconEl = document.getElementById("icon") as HTMLInputElement;
const unlockedRegionEl = document.getElementById(
  "unlock-region"
) as HTMLInputElement;
const copySecretEl = document.getElementById("copy-secret") as HTMLInputElement;

// settings
const settingsVersion = "v1";

let defaultSettings = {
  lockIcon: "🔒",
  settingsVersion,
  disabled: false,
};

const initSettings = () => {
  let settings = logseq.settings;

  const shouldUpdateSettings =
    settings.settingsVersion != defaultSettings.settingsVersion;

  if (shouldUpdateSettings) {
    settings = defaultSettings;
    logseq.updateSettings(settings);
  }
};

async function main() {
  initSettings();
  let lockIcon = logseq.settings.lockIcon || "🔒";

  logseq.setMainUIInlineStyle({
    zIndex: 13,
    position: "absolute",
  });

  const appUserConfig = await logseq.App.getUserConfigs();
  const picker = new EmojiButton({
    position: "bottom-start",
    theme: appUserConfig.preferredThemeMode,
  });
  logseq.App.onThemeModeChanged(({ mode }) => {
    picker.setTheme(mode);
    if (mode === "dark") {
      bodyEl.classList.remove("light");
      bodyEl.classList.add("dark");
    } else {
      bodyEl.classList.remove("dark");
      bodyEl.classList.add("light");
    }
  });
  picker.on("emoji", async (selection) => {
    lockIcon = selection.emoji;
    iconEl.textContent = selection.emoji;
    logseq.updateSettings({
      lockIcon: selection.emoji,
    });
  });

  const hotkeys = (window as any)?.hotkeys;
  const bindKeys = async function () {
    if (hotkeys) {
      hotkeys("esc,q,command+shift+l", async function (event, handler) {
        switch (handler.key) {
          case "esc": // ESC
          case "q": // q
          case "command+shift+l": // cmd+shift+l
            await logseq.Editor.restoreEditingCursor();
            await logseq.Editor.exitEditingMode(true);
            logseq.hideMainUI({
              restoreEditingCursor: true,
            });
            break;
        }
      });
    }
  };

  bindKeys();

  const iconHandler = () => {
    const emojiPickerEl = document.createElement("div");
    emojiPickerEl.classList.add("emoji-picker-trigger");
    document.getElementById("app").appendChild(emojiPickerEl);

    const rect = iconEl.getBoundingClientRect();
    Object.assign(emojiPickerEl.style, {
      top: rect.top + "px",
      left: rect.left + "px",
      position: "absolute",
    });
    picker.showPicker(emojiPickerEl);
  };
  iconEl.removeEventListener("click", iconHandler);
  iconEl.addEventListener("click", iconHandler);

  // close button
  const closeButtonHandler = () => {
    logseq.hideMainUI();
  };

  closeButtonEl.removeEventListener("click", closeButtonHandler);
  closeButtonEl.addEventListener("click", closeButtonHandler);

  const unlockSecretCache = {
    secret: "",
  };
  const copySecretHandler = async () => {
    copyToClipboard(unlockSecretCache.secret);
    await logseq.Editor.restoreEditingCursor();
    await logseq.Editor.exitEditingMode(true);
    logseq.UI.showMsg(
      "Unlocked info has been placed into your system clipboard!"
    );
    unlockedRegionEl.classList.add("hidden");
    unlockSecretCache.secret = "";
    logseq.hideMainUI();
  };

  copySecretEl.removeEventListener("click", copySecretHandler);
  copySecretEl.addEventListener("click", copySecretHandler);

  const processInfo = async (password) => {
    if (!password) {
      logseq.UI.showMsg("Password can not be empty!", "error");
      return;
    }

    const uuid = passwordEl.getAttribute("data-uuid");
    const block = await logseq.Editor.getBlock(uuid);

    if (block?.content) {
      const { content } = block;

      if (content.indexOf('<a class="locked-secret" data-secret') > -1) {
        const match = content.match(/data-secret="(.*?)"/);
        const lockedSecret = match[1];

        try {
          const unlockSecret = stegcloak.reveal(lockedSecret, password);
          unlockSecretCache.secret = unlockSecret;

          unlockedRegionEl.classList.remove("hidden");

          logseq.UI.showMsg(
            "Secret unlocked, please click the copy button to copy it into your system clipboard!"
          );

          copySecretEl.style.display = "block";
        } catch (e) {
          passwordEl.select();
          logseq.UI.showMsg("Unlock failed, wrong password!", "error");
        }
      } else {
        const lockedSecret = stegcloak.hide(content, password, "locked secret");

        await logseq.Editor.updateBlock(
          uuid,
          `<a class="locked-secret" data-secret="${lockedSecret}" data-on-click="triggerModal">${lockIcon}</a>`
        );
        await logseq.Editor.restoreEditingCursor();
        await logseq.Editor.exitEditingMode(true);
        logseq.UI.showMsg("Lock successfully.");

        logseq.hideMainUI();
      }
    }
  };

  const passwordHandler = async function (e) {
    if (e.keyCode == 13) {
      await processInfo(passwordEl.value);
    }
  };

  passwordEl.removeEventListener("keypress", passwordHandler);
  passwordEl.addEventListener("keypress", passwordHandler);

  // lock button
  const lockButtonHandler = async () => {
    await processInfo(passwordEl.value);
  };
  lockButtonEl.removeEventListener("click", lockButtonHandler);
  lockButtonEl.addEventListener("click", lockButtonHandler);

  const commandHandler = async ({ uuid }) => {
    passwordEl.value = "";
    copySecretEl.style.display = "none";

    iconEl.textContent = lockIcon;
    let content;
    if (!uuid) {
      const block = await logseq.Editor.getCurrentBlock();
      content = block.content;
      passwordEl.setAttribute("data-uuid", block.uuid);
    } else {
      const block = await logseq.Editor.getBlock(uuid);
      passwordEl.setAttribute("data-uuid", uuid);
      content = block.content;
    }

    if (content.indexOf('<a class="locked-secret" data-secret') > -1) {
      lockButtonEl.textContent = "Unlock";
      iconEl.style.display = "none";
    } else {
      lockButtonEl.textContent = "Lock";
      iconEl.style.display = "inline-block";
    }

    const theme = localStorage.getItem("theme");
    if (theme === '"dark"') {
      bodyEl.classList.remove("light");
      bodyEl.classList.add("dark");
    } else {
      bodyEl.classList.remove("dark");
      bodyEl.classList.add("light");
    }

    logseq.showMainUI({
      autoFocus: true,
    });

    setTimeout(function () {
      passwordEl.focus();
    }, 100);
  };

  logseq.Editor.registerSlashCommand("Lock", commandHandler);
  logseq.Editor.registerBlockContextMenuItem(`Lock`, commandHandler);

  logseq.App.registerCommandPalette(
    {
      key: `lock-block`,
      label: `Lock block with a password`,
      keybinding: {
        mode: "global",
        binding: "mod+shift+l",
      },
    },
    commandHandler
  );

  logseq.provideModel({
    openLockModal() {
      commandHandler({ uuid: null });
    },
  });

  logseq.App.registerUIItem("pagebar", {
    key: "logseq-lock",
    template: `
     <a class="button" data-on-click="openLockModal" title="Open lock model"">
      <i class="ti ti-lock" style=""></i>
     </a>
    `,
  });
}

logseq.ready(main).catch(console.error);
