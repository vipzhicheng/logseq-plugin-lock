import '@logseq/libs';

import StegCloak from 'stegcloak';
import clipboardy from 'clipboardy';
import { EmojiButton } from '@joeattardi/emoji-button';

async function main() {
  const emojiPickerEl = document.createElement('div');
  emojiPickerEl.classList.add('absolute left-4');
  document.getElementById('app').appendChild(emojiPickerEl);

  logseq.setMainUIInlineStyle({
    zIndex: 13,
    position: 'absolute',
  });

  const appUserConfig = await logseq.App.getUserConfigs();
  const picker = new EmojiButton({
    position: 'bottom-start',
    theme: appUserConfig.preferredThemeMode,
  });

  const hotkeys = (window as any)?.hotkeys;
  const bindKeys = async function() {
    if (hotkeys) {
      hotkeys('esc,q', async function (event, handler) {
        switch (handler.key) {
          case 'esc': // ESC
          case 'q': // q

            // @ts-ignore
            const jQuery = window?.jQuery;
            // @ts-ignore
            const lightbox = window?.lightbox;

            if (jQuery) {
              if (jQuery('#lightboxOverlay').css('display') === 'block') {
                lightbox.end();
              }
            }
            logseq.hideMainUI();
          break;
        }
      });
    }
  };

  bindKeys();

  const lockButtonEl = document.getElementById('lock-button') as HTMLInputElement;
  const closeButtonEl = document.getElementById('close-button') as HTMLInputElement;
  const passwordEl = document.getElementById('password') as HTMLInputElement;
  const iconEl = document.getElementById('icon') as HTMLInputElement;

  const iconHandler = () => {
    picker.showPicker(emojiPickerEl);
  };
  iconEl.removeEventListener('click', iconHandler);
  iconEl.addEventListener('click', iconHandler);



  // close button
  const closeButtonHandler = () => {
    logseq.hideMainUI();
  };

  closeButtonEl.removeEventListener('click', closeButtonHandler);
  closeButtonEl.addEventListener('click', closeButtonHandler);

  // password
  const stegcloak = new StegCloak(true, true);

  const processInfo = async password => {
    const uuid = passwordEl.getAttribute('data-uuid');
    const block = await logseq.Editor.getBlock(uuid);

    if (block?.content) {
      const { content } = block;

      if (content.indexOf('<a class="locked-secret" data-secret') > -1) {
        const match = content.match(/data-secret="(.*?)"/);
        const lockedSecret = match[1];

        try {
          const unlockSecret = stegcloak.reveal(lockedSecret, password);
          await clipboardy.write(unlockSecret);
          logseq.App.showMsg('Unlocked info has been placed into your system clipboard!');
          logseq.hideMainUI();

        } catch (e) {
          logseq.App.showMsg('Unlock failed, wrong password.', 'error');
        }


      } else {

        const lockedSecret = stegcloak.hide(content, password, 'locked secret');
        logseq.Editor.updateBlock(uuid, `<a class="locked-secret" data-secret="${lockedSecret}">***</a>`);
        logseq.App.showMsg('Lock successfully.');

        logseq.hideMainUI();
      }
    } else {
      console.log(block);
    }


  };


  const passwordHandler = async function(e) {
    if(e.keyCode == 13) {
      await processInfo(passwordEl.value);
    }
  };

  passwordEl.removeEventListener('keypress', passwordHandler);
  passwordEl.addEventListener('keypress', passwordHandler);

  // lock button
  const lockButtonHandler = async () => {
    await processInfo(passwordEl.value);
  };
  lockButtonEl.removeEventListener('click', lockButtonHandler);
  lockButtonEl.addEventListener('click', lockButtonHandler);

  const commandHandler = async ({ uuid }) => {
    passwordEl.value = '';
    passwordEl.focus();
    // @ts-ignore
    // passwordEl.select();

    passwordEl.setAttribute('data-uuid', uuid);

    const { content } = await logseq.Editor.getBlock(uuid);
    if (content.indexOf('<a class="locked-secret" data-secret') > -1) {
      lockButtonEl.textContent = 'Unlock';
    } else {
      lockButtonEl.textContent = 'Lock';
    }

    logseq.showMainUI();
  };


  logseq.Editor.registerSlashCommand(
    'Lock',
    commandHandler
  );

  logseq.Editor.registerBlockContextMenuItem(`Lock`, commandHandler);
}

logseq.ready(main).catch(console.error);
