
import re

files = [
    'C:/Users/Administrator/Desktop/WorkPlace/BasaltPass/basaltpass-frontend/src/features/tenant/components/TenantLayout.tsx',
    'C:/Users/Administrator/Desktop/WorkPlace/BasaltPass/basaltpass-frontend/src/features/admin/components/AdminLayout.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    headerRegex = re.compile(r'(              \{/\* ： NotificationProvider .*?)(\r?\n            </div>\r?\n          </div>\r?\n        </div>\r?\n      </header>)', re.DOTALL)
    match = headerRegex.search(content)
    if not match:
        print('Not found in', file)
        continue
    
    block = match.group(1)
    block = block.replace('absolute right-0 z-50 mt-2 w-56 origin-top-right', 'absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left')
    
    footer = '''            <div className=\
flex
flex-shrink-0
border-t
border-gray-200
p-4\>
              <div className=\flex
w-full
items-center
justify-between
space-x-2\>
''' + block + '''
              </div>
            </div>'''
            
    content = content[:match.start()] + match.group(2) + content[match.end():]
    
    content = content.replace('                </nav>\\n              </div>', '                </nav>\\n              </div>\\n' + footer)
    content = content.replace('                </nav>\\r\\n              </div>', '                </nav>\\r\\n              </div>\\r\\n' + footer)
    
    if 'TenantNavigation' in file:
        content = content.replace('              <div className=\flex
flex-1
flex-col
px-3\>\\n                <TenantNavigation />\\n              </div>\\n            </div>', '              <div className=\flex
flex-1
flex-col
px-3\>\\n                <TenantNavigation />\\n              </div>\\n            </div>\\n' + footer)
        content = content.replace('              <div className=\flex
flex-1
flex-col
px-3\>\\r\\n                <TenantNavigation />\\r\\n              </div>\\r\\n            </div>', '              <div className=\flex
flex-1
flex-col
px-3\>\\r\\n                <TenantNavigation />\\r\\n              </div>\\r\\n            </div>\\r\\n' + footer)
    else:
        content = content.replace('              <div className=\flex
flex-1
flex-col
px-3\>\\n                <AdminNavigation />\\n              </div>\\n            </div>', '              <div className=\flex
flex-1
flex-col
px-3\>\\n                <AdminNavigation />\\n              </div>\\n            </div>\\n' + footer)
        content = content.replace('              <div className=\flex
flex-1
flex-col
px-3\>\\r\\n                <AdminNavigation />\\r\\n              </div>\\r\\n            </div>', '              <div className=\flex
flex-1
flex-col
px-3\>\\r\\n                <AdminNavigation />\\r\\n              </div>\\r\\n            </div>\\r\\n' + footer)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print('done', file)

