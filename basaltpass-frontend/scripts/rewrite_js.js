const fs = require('fs');

function processFile(file, isUserLayout) {
  let content = fs.readFileSync(file, 'utf-8');

  // Replace header chunk and build footer
  let headerRegex = null;
  if (!isUserLayout) {
     headerRegex = /              \{\/\* ： NotificationProvider.*?<\/header>\r?\n/s;
  } else {
     headerRegex = /            <div className="flex items-center space-x-2">.*?<\/div>\r?\n        <\/div>\r?\n/s; // For user layout we'll figure it out later
  }

  if(!isUserLayout) {
      const match = content.match(headerRegex);
      if(!match) {
          console.log("No match found in", file);
          return;
      }
      
      const fullHeaderChunkWithEndTags = match[0];
      const chunkToMoveMatch = content.match(/(              \{\/\* ： NotificationProvider.*?)(\r?\n            <\/div>\r?\n          <\/div>\r?\n        <\/div>\r?\n      <\/header>\r?\n)/s);
      if (!chunkToMoveMatch) return;
      
      const chunkToMove = chunkToMoveMatch[1];
      const headerEnd = chunkToMoveMatch[2];
      
      // Update popover classes for chunkToMove
      let newChunk = chunkToMove.replace('absolute right-0 z-50 mt-2 w-56 origin-top-right', 'absolute left-0 z-50 mb-2 bottom-full ml-4 w-56 origin-bottom-left');
      
      const footerComponent =             <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center justify-between space-x-2">
\
              </div>
            </div>\n;

      // 1. Remove it from header
      content = content.replace(chunkToMove, '');
      
      // 2. Insert into mobile sidebar
      content = content.replace(
          '                </nav>\r\n              </div>\r\n',
          '                </nav>\r\n              </div>\r\n' + footerComponent
      );
      content = content.replace(
          '                </nav>\n              </div>\n',
          '                </nav>\n              </div>\n' + footerComponent
      );

      // 3. Insert into desktop sidebar (Tenant)
      content = content.replace(
          '              <div className="flex flex-1 flex-col px-3">\r\n                <TenantNavigation />\r\n              </div>\r\n            </div>\r\n',
          '              <div className="flex flex-1 flex-col px-3">\r\n                <TenantNavigation />\r\n              </div>\r\n            </div>\r\n' + footerComponent
      );
      content = content.replace(
          '              <div className="flex flex-1 flex-col px-3">\n                <TenantNavigation />\n              </div>\n            </div>\n',
          '              <div className="flex flex-1 flex-col px-3">\n                <TenantNavigation />\n              </div>\n            </div>\n' + footerComponent
      );

      // 3. Insert into desktop sidebar (Admin)
      content = content.replace(
          '              <div className="flex flex-1 flex-col px-3">\r\n                <AdminNavigation />\r\n              </div>\r\n            </div>\r\n',
          '              <div className="flex flex-1 flex-col px-3">\r\n                <AdminNavigation />\r\n              </div>\r\n            </div>\r\n' + footerComponent
      );
      content = content.replace(
          '              <div className="flex flex-1 flex-col px-3">\n                <AdminNavigation />\n              </div>\n            </div>\n',
          '              <div className="flex flex-1 flex-col px-3">\n                <AdminNavigation />\n              </div>\n            </div>\n' + footerComponent
      );

      fs.writeFileSync(file, content, 'utf-8');
      console.log('Saved', file);
  }
}

processFile('C:/Users/Administrator/Desktop/WorkPlace/BasaltPass/basaltpass-frontend/src/features/tenant/components/TenantLayout.tsx', false);
processFile('C:/Users/Administrator/Desktop/WorkPlace/BasaltPass/basaltpass-frontend/src/features/admin/components/AdminLayout.tsx', false);
