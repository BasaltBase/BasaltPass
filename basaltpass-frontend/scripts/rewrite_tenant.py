import re

with open(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\tenant\components\TenantLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(              \{\/\* .*?： NotificationProvider.*\n)(              <div className="relative">.*?</PButton>\n                  </div>\n                \)}\n              </div>\n)', content, re.DOTALL)
if not match:
    print('Pattern not found')
    exit(1)

extracted = match.group(0)
new_content = content.replace(extracted, '')

# Change pop-down to pop-up
extracted = extracted.replace('origin-top-right', 'origin-bottom-left bottom-full mb-2 ml-12')
extracted = extracted.replace('right-0 mt-2', 'left-0')

footer_block = """
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between">
""" + extracted + """
              </div>
            </div>
"""

side_mobile_match = re.search(r'(\s*<nav className="mt-5 space-y-1 px-2">\s*<TenantNavigation />\s*</nav>\s*</div>)', new_content)
if side_mobile_match:
    new_content = new_content.replace(side_mobile_match.group(1), side_mobile_match.group(1) + footer_block)

side_desktop_match = re.search(r'(\s*<div className="flex flex-1 flex-col px-3">\s*<TenantNavigation />\s*</div>\s*</div>)', new_content)
if side_desktop_match:
    new_content = new_content.replace(side_desktop_match.group(1), side_desktop_match.group(1) + footer_block)

with open(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\tenant\components\TenantLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")
