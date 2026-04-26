import os
import re

files = [
    r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\tenant\components\TenantLayout.tsx',
    r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\admin\components\AdminLayout.tsx',
    r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\user\components\Layout.tsx'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Needs to match the block:
    # {/* ： NotificationProvider ， */} ... </div> </div> </div> </div> </header>
    # And place it down at bottom of sidebar flex flex-col pt-5 pb-4 -> add another flex at the end of sidebar column
    print('Checking', fpath, len(content))
