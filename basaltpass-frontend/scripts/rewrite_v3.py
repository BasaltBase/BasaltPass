import sys

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We know the anchor is:
    start_anchor = "              {/* ： NotificationProvider ， */}"
    if start_anchor not in content:
        start_anchor = "              {/* NotificationProvider */}"
    if start_anchor not in content:
        print(f"Skipping {filepath}, start anchor not found")
        return

    # Find the end of the userMenuRef block
    end_anchor = "                )}\n              </div>\n            </div>\n          </div>\n        </div>\n      </header>"
    if end_anchor not in content:
        print(f"end anchor not found in {filepath}")
        return

    start_idx = content.find(start_anchor)
    end_idx = content.find(end_anchor) + len("                )}\n              </div>\n")
    
    extracted = content[start_idx:end_idx]

    # Create new layout by wiping extracted
    content = content[:start_idx] + content[end_idx:]

    # Modify extracted:
    # 1. Flip the dropdown origin
    extracted = extracted.replace('absolute right-0 z-50 mt-2 w-56 origin-top-right', 'absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left')
    
    # Render it into a flex component
    # They want the layout to be Notification right-aligned next to Avatar? Actually the avatar has the username and email.
    # To make it "avatar with label on the left, notification on the right":
    # Let's put both into a space-x-2 block
    footer_var = f'''
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between">
{extracted}
              </div>
            </div>
'''
    # Wait, the dropdown relies on userMenuRef which must be valid.
    
    # Mobile sidebar
    mob_nav_end = '                </nav>\n              </div>'
    if mob_nav_end in content:
        content = content.replace(mob_nav_end, mob_nav_end + footer_var, 1)
    
    # Desktop sidebar
    desk_nav_end1 = '              <div className="flex flex-1 flex-col px-3">\n                <TenantNavigation />\n              </div>\n            </div>'
    desk_nav_end2 = '              <div className="flex flex-1 flex-col px-3">\n                <AdminNavigation />\n              </div>\n            </div>'
    
    if desk_nav_end1 in content:
        content = content.replace(desk_nav_end1, desk_nav_end1 + footer_var, 1)
    if desk_nav_end2 in content:
        content = content.replace(desk_nav_end2, desk_nav_end2 + footer_var, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully processed {filepath}")

process(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\tenant\components\TenantLayout.tsx')
process(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\admin\components\AdminLayout.tsx')

