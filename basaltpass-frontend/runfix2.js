const fs = require('fs');

function processAdminLayout() {
  const p = 'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\admin\\components\\AdminLayout.tsx';
  let content = fs.readFileSync(p, 'utf-8');
  let match = content.match(/(<div className=\"relative\">\s*<span className=\"sr-only\">[^{]*\{t\('common\.viewNotifications'\)\}<\/span>\s*<EnhancedNotificationIcon viewAllPath=\{ROUTES\.admin\.notifications\} \/>\s*<\/div>\s*<div ref=\{userMenuRef\} className=\"relative\">[\s\S]*?<\/div>\s*\)\}\s*<\/div>)/);
  if (!match) return;
  
  let block = match[1];
  
  // ensure it's in the header
  let headerMatch = content.match(/<header[\s\S]*?<\/header>/);
  if (headerMatch && headerMatch[0].includes(block)) {
    content = content.replace(block, '');
  } else return;
  
  let newBlock = block.replace(/className=\"absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none\"/, 'className=\"absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none\"');
  
  let wrapped = `
            <div className=\"flex flex-shrink-0 border-t border-gray-200 p-4\">
              <div className=\"flex w-full items-center justify-between\">
` + newBlock + `
              </div>
            </div>`;
            
  // inserted mobile
  let mb = content.match(/<nav className=\"mt-5 space-y-1 px-2\">\s*<AdminNavigation \/>\s*<\/nav>\s*<\/div>/);
  if (mb) {
     let idx = mb.index + mb[0].length;
     content = content.substring(0, idx) + wrapped + content.substring(idx);
  }
  
  // inserted desktop 
  //   <div className="flex flex-1 flex-col pt-5 pb-4">
  //     <div className="flex flex-1 flex-col px-3">
  //       <AdminNavigation />
  //     </div>
  //   </div>
  // </div> (this last div is from the outer border-r div)
  let dbMatch = content.match(/<AdminNavigation \/>\s*<\/div>\s*<\/div>\s*<\/div>/);
  if (dbMatch) {
      let idx2 = dbMatch.index + dbMatch[0].length - 6; // right before the outermost </div>
      content = content.substring(0, idx2) + wrapped + content.substring(idx2);
  }

  fs.writeFileSync(p, content);
  console.log('AdminLayout fixed');
}

function processLayout() {
  const p = 'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\user\\components\\Layout.tsx';
  let content = fs.readFileSync(p, 'utf-8');
  
  // Layout.tsx has notification icon in mobile separately:
  // `<EnhancedNotificationIcon viewAllPath={ROUTES.user.notifications} />`
  // For desktop it has it in:
  // `<EnhancedNotificationIcon viewAllPath={ROUTES.user.notifications} />` too!
  
  // Actually look at my read_file above:
  // <EnhancedNotificationIcon viewAllPath={ROUTES.user.notifications} />
  // <div ref={desktopUserMenuRef} className="relative">...</div>)}</div>
  let r = content.match(/(<EnhancedNotificationIcon viewAllPath=\{ROUTES\.user\.notifications\} \/>\s*<div ref=\{desktopUserMenuRef\} className=\"relative\">[\s\S]*?<\/div>\s*\)\}\s*<\/div>)/);
  if (!r) return;
  
  let block = r[1];
  
  let headerMatch = content.match(/<div className=\"hidden md:flex md:items-center md:justify-end md:px-6 md:py-4 bg-white border-b border-gray-200\">\s*<div className=\"flex items-center space-x-4\">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>/);
  if (headerMatch && headerMatch[0].includes(block)) {
    content = content.replace(block, '');
  } else {
    console.log('User layout not in main header block or already removed');
    return;
  }
  
  let newBlock = block.replace(/className=\"absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none\"/, 'className=\"absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none\"');
  
  let wrapped = `
            <div className=\"flex flex-shrink-0 border-t border-gray-200 p-4\">
              <div className=\"flex w-full items-center justify-between\">
` + newBlock + `
              </div>
            </div>`;
            
  // Mobile insertion:
  // Layout mobile nav ends with: `              </nav>\s*</div>\s*</div>\s*</div>` (since it doesn't have `<Dialog.Panel>`)
  // `<div className="fixed inset-0 !m-0 flex z-40 md:hidden">`
  // `...`
  // `              </nav>\s*</div>`
  let mobileMatch = content.match(/<\/nav>\s*<\/div>\s*<\/div>\s*<\/div>/);
  if (mobileMatch) {
     // Wait, the mobile side is wrapped in `<div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">`
     // and then `<div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">` -> `<nav>`
     let mb2 = content.match(/<\/nav>\s*<\/div>\s*<\/div>/);
     if (mb2) {
         let sub = mb2[0];
         let inx = mb2.index + mb2[0].length - 6; // before the closing of `<div className="relative flex-1 flex flex-col...`
         content = content.substring(0, inx) + wrapped + content.substring(inx);
     }
  }
  
  // Desktop
  let desk = content.match(/<\/nav>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
  if (desk) {
     // wait! Layout desktop:
     // `<div className="hidden md:flex md:flex-shrink-0">`
     //   `<div className="flex flex-col w-64">`
     //      `<div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">`
     //         `<div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">` -> `<nav />`
     let mm = content.match(/<\/nav>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
     if (mm) {
         let inx = mm.index + mm[0].length - 18; // `<div className="flex flex-col h-0 flex-1...` closing
         content = content.substring(0, inx) + wrapped + content.substring(inx);
     }
  }

  fs.writeFileSync(p, content);
  console.log('Layout fixed');
}

function processTenantLayout() {
  const p = 'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\tenant\\components\\TenantLayout.tsx';
  let content = fs.readFileSync(p, 'utf-8');
  // TenantLayout is already partly correct, but prompt said "do this for 3 files: TenantLayout... look for {/* ： NotificationProvider ， */} ... remove from header ... insert at bottom"
  let match = content.match(/\{\/\*\s*： NotificationProvider ，\s*\*\/\}[\s\S]*?(?:<\/div>\s*){3}\s*\{isUserMenuOpen[\s\S]*?<\/div>\s*\)\}\s*<\/div>/);
  if (match) {
     console.log('Found block in TenantLayout! Wait, is it in header?');
     let headerMatch = content.match(/<header[\s\S]*?<\/header>/);
     if (headerMatch && headerMatch[0].includes(match[0])) {
         content = content.replace(match[0], '');
         let newBlock = match[0].replace(/className=\"absolute [^\"]+origin-[^\"]+\"/, 'className=\"absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none\"');
         let wrapped = `
            <div className=\"flex flex-shrink-0 border-t border-gray-200 p-4\">
              <div className=\"flex w-full items-center justify-between\">
` + newBlock + `
              </div>
            </div>`;
         // insert ...
         // But `TenantLayout` already has `flex flex-shrink-0 border-t border-gray-200 p-4`! So maybe it was already done but I should just clean it up?
     }
  }
}

processAdminLayout();
processLayout();

