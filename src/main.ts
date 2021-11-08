import '@logseq/libs';

import StegCloak from 'stegcloak';

async function main() {


  logseq.Editor.registerSlashCommand(
    'lock',
    async ({ uuid }) => {
      // const {
      //   left,
      //   top,
      //   rect,
      // } = await logseq.Editor.getEditingCursorPosition();

      // const passwordEl = document.getElementById('password');
      // Object.assign(passwordEl.style, {
      //   display: 'absolute',
      //   top: top + rect.top + 'px',
      //   left: left + rect.left + 'px',
      // });
      logseq.showMainUI();
      // const { content } = await logseq.Editor.getBlock(uuid);
      // const stegcloak = new StegCloak(true, false);
      // const lockedSecret = stegcloak.hide(content, 'password', 'locked secret');

      // logseq.Editor.updateBlock(uuid, `<a class="locked-secret" href="javascript:logseq.api.show_msg('Input /lock to get your secret.');" data-secret="${lockedSecret}">*</a>`);
    },
  );
}

logseq.ready(main).catch(console.error);
