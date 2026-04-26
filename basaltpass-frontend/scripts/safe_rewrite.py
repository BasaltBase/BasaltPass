import re

def rewrite(file_path, scope='tenant'):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'(\s+\{\/\*.*?NotificationProvider.*?)\s+</div>\n            </div>\n          </div>\n        </div>\n      </header>', content, re.DOTALL)
    if not match:
        print("Could not find header extraction block in " + file_path)
        return

    extracted_raw = match.group(1)
    
    content = content.replace(extracted_raw, '')
    
    # Process extracted block
    replaced_block = extracted_raw.replace('absolute right-0 z-50 mt-2 w-56 origin-top-right', 'absolute left-0 z-50 mb-2 ml-4 w-56 origin-bottom-left bottom-full')

    footer_tmpl = f"""
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between space-x-2">
{replaced_block}
              </div>
            </div>
"""

    if scope == 'tenant':
        content = content.replace(
            '                </nav>\n              </div>\n            </div>\n          </div>\n        )}',
            '                </nav>\n              </div>\n' + footer_tmpl + '            </div>\n          </div>\n        )}'
        )
        content = content.replace(
            '              <div className="flex flex-1 flex-col px-3">\n                <TenantNavigation />\n              </div>\n            </div>\n          </div>\n        </div>',
            '              <div className="flex flex-1 flex-col px-3">\n                <TenantNavigation />\n              </div>\n            </div>\n' + footer_tmpl + '          </div>\n        </div>'
        )
    elif scope == 'admin':
        content = content.replace(
            '                </nav>\n              </div>\n            </div>\n          </div>\n        )}',
            '                </nav>\n              </div>\n' + footer_tmpl + '            </div>\n          </div>\n        )}'
        )
        content = content.replace(
            '              <div className="flex flex-1 flex-col px-3">\n                <AdminNavigation />\n              </div>\n            </div>\n          </div>\n        </div>',
            '              <div className="flex flex-1 flex-col px-3">\n                <AdminNavigation />\n              </div>\n            </div>\n' + footer_tmpl + '          </div>\n        </div>'
        )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

rewrite(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\tenant\components\TenantLayout.tsx', 'tenant')
rewrite(r'C:\Users\Administrator\Desktop\WorkPlace\BasaltPass\basaltpass-frontend\src\features\admin\components\AdminLayout.tsx', 'admin')

print("Done rewrite")
