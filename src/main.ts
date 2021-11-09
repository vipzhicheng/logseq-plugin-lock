import '@logseq/libs';

import StegCloak from 'stegcloak';
import clipboardy from 'clipboardy';

async function main() {
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

  // close button
  const closeButtonHandler = () => {
    logseq.hideMainUI();
  };

  closeButtonEl.removeEventListener('click', closeButtonHandler);
  closeButtonEl.addEventListener('click', closeButtonHandler);

  // password
  const stegcloak = new StegCloak(true, false);

  const processInfo = async password => {
    const uuid = passwordEl.getAttribute('data-uuid');
    const { content } = await logseq.Editor.getBlock(uuid);

    if (content.indexOf('<a class="locked-secret" href') > -1) {
      const match = content.match(/data-secret="(.*?)"/);
      const lockedSecret = match[1];
      console.log('lockedSecret', lockedSecret);
      const unlockSecret = stegcloak.reveal(lockedSecret, password);
      console.log('unlockSecret', unlockSecret);

      // TODO , need a way to check failed.

      if (true) {
        await clipboardy.write(unlockSecret);
        logseq.App.showMsg('Your unlocked info has been placed into your system clipboard!');

      } else {
        logseq.App.showMsg('Unlock failed, password is wrong.');
      }


    } else {

      const lockedSecret = stegcloak.hide(content, password, 'locked secret');
      logseq.Editor.updateBlock(uuid, `<a class="locked-secret" data-secret="${lockedSecret}">*</a>`);
    }


    passwordEl.value = '';
    logseq.hideMainUI();
  };


  const passwordHandler = async function(e) {
    if(e.keyCode == 13) {
      await processInfo(passwordEl.value);
    }
  };

  passwordEl.removeEventListener('keypress', passwordHandler);
  passwordEl.addEventListener('keypress', passwordHandler);

  document.addEventListener('keypress', function (e) {
    console.log(e);
  });

  // lock button
  const lockButtonHandler = async () => {
    await processInfo(passwordEl.value);
  };
  lockButtonEl.removeEventListener('click', lockButtonHandler);
  lockButtonEl.addEventListener('click', lockButtonHandler);

  const commandHandler = async ({ uuid }) => {
    passwordEl.focus();
    // @ts-ignore
    passwordEl.select();

    passwordEl.setAttribute('data-uuid', uuid);

    const { content } = await logseq.Editor.getBlock(uuid);
    if (content.indexOf('<a class="locked-secret" href') > -1) {
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
