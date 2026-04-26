import os
import re

files = [
    r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\admin\components\AdminLayout.tsx',
    r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\user\components\Layout.tsx'
]

def format_block(block):
    new_block = re.sub(
        r'className="absolute [^"]+origin-[^"]+"',
        'className="absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left overflow-hidden rounded-xl bg-white pt-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"',
        block
    )
    return '''
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between">
''' + new_block.strip() + '''
              </div>
            </div>'''
            
def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the notification and user menu block
    # In AdminLayout: <div className="relative">...<EnhancedNotificationIcon.../></div>...<div ref={userMenuRef}...
    # In Layout: {/* Notifications */}...<div className="relative">...<BellIcon.../></div>...{/* User dropdown */}...<div ref={userMenuRef}...
    match = re.search(r'(\n\s*(?:\{\/\*\s*Notification[^\*]*\*\/\}\s*)?<div className="relative">\s*(?:<span className="sr-only">[^<]*<\/span>\s*<EnhancedNotificationIcon[^>]*\/>|<button[^>]*>[\s\S]*?<BellIcon[\s\S]*?<\/button>[\s\S]*?)<\/div>[\s\S]*?(?:\{\/\*\s*User dropdown[^\*]*\*\/\}\s*)?<div ref=\{userMenuRef\} className="relative">[\s\S]*?<\/div>\s*\)\}\s*<\/div>)', content)
    
    if not match:
        print(f'Block not found in {path}')
        return
    
    block = match.group(1)
    
    header_re = re.search(r'<header[\s\S]*?<\/header>', content)
    if header_re and block in header_re.group(0):
        content = content.replace(block, '')
        print('Removed from header')
    else:
        print('Not in header, skipping')
        return

    wrapped = format_block(block)
    
    # insert mobile
    # After </nav></div>
    # There are multiple </nav></div>, we can insert after every instance except we know the first is mobile, the second is desktop
    # Actually wait.
    # In AdminLayout mobile: <nav className...><AdminNavigation/></nav></div></div></div>
    
    nav_closes = list(re.finditer(r'<\/nav>\s*<\/div>', content))
    if nav_closes:
        # First one is mobile usually
        idx = nav_closes[0].end()
        content = content[:idx] + wrapped + content[idx:]
        print('Inserted mobile')
        
    # In AdminLayout desktop:
    # <div className="flex flex-1 flex-col overflow-y-auto bg-white border-r border-gray-200">
    #   <div className="flex flex-1 flex-col pt-5 pb-4">
    #     <div className="flex flex-1 flex-col px-3">
    #       <AdminNavigation />
    #     </div>
    #   </div>
    # </div>
    # we want to insert right before the last </div>
    
    # Find AdminNavigation/TenantNavigation
    # Let's just search for it manually using a very specific regex
    desktop_nav_re = list(re.finditer(r'(<(?:Admin|Tenant|User)Navigation\b[^>]*>[\s\S]*?<\/div>\s*<\/div>)', content))
    if desktop_nav_re:
        # wait! Layout.tsx might not have Navigation component, it might have just `<nav className=... space-y-1 ...>`
        # This will only match AdminLayout
        # Since we added `wrapped` earlier, indices changed. So we should re-find.
        desktop_nav_re2 = list(re.finditer(r'(<(?:Admin|Tenant|User)Navigation\b[^>]*>[\s\S]*?<\/div>\s*<\/div>)', content))
        if desktop_nav_re2:
            desktop_match = desktop_nav_re2[-1]
            idx2 = desktop_match.end()
            content = content[:idx2] + wrapped + content[idx2:]
            print('Inserted desktop')
    else:
        # Fallback for Layout.tsx
        # Layout desktop: 
        # <nav className="mt-5 flex-1 space-y-1 bg-white px-2">...
        # </div>
        ff = list(re.finditer(r'(<nav className=\"[^\"]*flex-1 space-y-1[^\"]*\">[\s\S]*?<\/nav>\s*<\/div>\s*<\/div>)', content))
        if ff:
            ff_match = ff[-1]
            idx3 = ff_match.end()
            content = content[:idx3] + wrapped + content[idx3:]
            print('Inserted desktop (fallback)')
            
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for f in files:
    process(f)
