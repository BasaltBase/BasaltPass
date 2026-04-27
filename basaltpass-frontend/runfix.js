const fs = require('fs');
const path = require('path');

const paths = [
    'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\tenant\\components\\TenantLayout.tsx',
    'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\admin\\components\\AdminLayout.tsx',
    'C:\\Users\\Administrator\\Desktop\\WorkPlace\\BasaltPass\\basaltpass-frontend\\src\\features\\user\\components\\Layout.tsx'
];

function formatBlock(blockStr) {
    // The classes for dropdown: "absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left"
    // Remove the old absolute positioning classes and replace them
    let newBlock = blockStr.replace(/className="absolute [^"]+origin-[^"]+"/g, 
        'className="absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"'
    );
    
    return `
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between">
${newBlock}
              </div>
            </div>`;
}

paths.forEach(p => {
    if (!fs.existsSync(p)) return;
    
    let content = fs.readFileSync(p, 'utf-8');
    
    // Find the block in header
    // Start with: <div className="relative">  (Notification)
    // Then: <div ref={userMenuRef} className="relative"> (User Menu)
    
    let regex = /(\s*(?:\{\/\*\s*Notification[^\*]*\*\/\}\s*)?<div className="relative">[\s\S]*?(?:<EnhancedNotificationIcon[^>]*\/>|<button[^>]*>[\s\S]*?<BellIcon[\s\S]*?<\/button>[\s\S]*?)<\/div>\s*(?:\{\/\*\s*User dropdown[^\*]*\*\/\}\s*)?<div ref=\{userMenuRef\} className="relative">[\s\S]*?<\/div>\s*\)\}\s*<\/div>)/;
    
    let match = content.match(regex);
    if (!match) {
         // Also match layout which has different text
         regex = /(\s*\{\/\*\s*(?:：|NotificationProvider|[a-zA-Z\s]*).*?\*\/\}\s*<div className="relative">[\s\S]*?<EnhancedNotificationIcon[^>]*\/>\s*<\/div>[\s\S]*?<div ref=\{userMenuRef\} className="relative">[\s\S]*?<\/div>\s*\)\}\s*<\/div>)/;
         match = content.match(regex);
    }
    
    if (!match) {
        console.log(`Block not found in ${p}`);
        return;
    }
    
    let block = match[1];
    
    // Safety check: Ensure it's in the header
    let headerMatch = content.match(/<header[\s\S]*?<\/header>/);
    if (headerMatch && headerMatch[0].includes(block.trim())) {
        content = content.replace(block, '');
        console.log(`Removed from header in ${p}`);
    } else {
         console.log(`Not removing from header (maybe already moved) in ${p}`);
         return; // Already moved possibly
    }
    
    let wrappedBlock = formatBlock(block);
    
    // Mobile insertion: after </nav>\s*</div> inside mobile Panel or absolute div
    let navs = [...content.matchAll(/<\/nav>\s*<\/div>/g)];
    if (navs.length > 0) {
        let idx = navs[0].index + navs[0][0].length;
        content = content.slice(0, idx) + wrappedBlock + content.slice(idx);
    }
    
    // Desktop insertion
    // Look for <nav ...> </nav> </div> or </div></div> before the main <main> or matching typical Sidebar layouts.
    // E.g., <AdminNavigation />\n </div>\n </div>
    // or <div className="flex flex-1 flex-col pt-5 pb-4">
    let desktopRegex = /(<(?:Admin|Tenant|User)Navigation\b[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
    let desktopMatch = content.match(desktopRegex);
    if (desktopMatch) {
         let idx = desktopMatch.index + desktopMatch[0].length;
         content = content.slice(0, idx) + wrappedBlock + content.slice(idx);
    } else {
         // Fallback for User Layout
         let usrRegex = /(<nav className=".*flex-1 space-y-1.*">[\s\S]*?<\/nav>\s*<\/div>\s*<\/div>)/;
         let fallMatch = content.match(usrRegex);
         if (fallMatch) {
             let idx = fallMatch.index + fallMatch[0].length;
             content = content.slice(0, idx) + wrappedBlock + content.slice(idx);
         }
    }
    
    fs.writeFileSync(p, content, 'utf-8');
});
