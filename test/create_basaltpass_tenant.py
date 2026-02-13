#!/usr/bin/env python3
"""创建 code 为 BasaltPass 的租户"""
import sqlite3
from datetime import datetime

db_path = '/workspaces/WorkPlace/BasaltPass/basaltpass.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查是否已存在 code 为 BasaltPass 的租户
    cursor.execute("SELECT id, name, code FROM tenants WHERE code = ?", ('BasaltPass',))
    existing = cursor.fetchone()
    
    if existing:
        print(f"租户已存在: ID={existing[0]}, Name={existing[1]}, Code={existing[2]}")
    else:
        # 创建新租户
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO tenants (name, code, description, status, plan, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            'BasaltPass',
            'BasaltPass',
            'BasaltPass tenant with matching code',
            'active',
            'enterprise',
            now,
            now
        ))
        conn.commit()
        
        tenant_id = cursor.lastrowid
        print(f"✓ 成功创建租户:")
        print(f"  ID: {tenant_id}")
        print(f"  名称: BasaltPass")
        print(f"  代码: BasaltPass")
        print(f"  状态: active")
        print(f"  计划: enterprise")
        print(f"\n访问地址: http://localhost:5173/tenant/BasaltPass/register")
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
