import os
import re

def refactor_test_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Check if testing is imported
    if '"testing"' not in content:
        return
        
    # Add testify import if not present
    if 'github.com/stretchr/testify/assert' not in content:
        content = content.replace('"testing"', '"testing"\n\t"github.com/stretchr/testify/assert"')

    # Replace err check patterns
    content = re.sub(
        r'if \(err != nil\) != tt\.wantErr \{\s+t\.Errorf\(.*?, err, tt\.wantErr\)\s+\}',
        r'if tt.wantErr {\n\t\t\t\tassert.Error(t, err)\n\t\t\t} else {\n\t\t\t\tassert.NoError(t, err)\n\t\t\t}',
        content
    )
    
    # Replace value check patterns
    content = re.sub(
        r'if got != tt\.want \{\s+t\.Errorf\(".*? = \%v, want \%v", got, tt\.want\)\s+\}',
        r'assert.Equal(t, tt.want, got)',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('.'):
    for file in files:
        if file.endswith('_test.go'):
            refactor_test_file(os.path.join(root, file))
