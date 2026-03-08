#!/usr/bin/env python3
"""测试查询逻辑"""
import sqlite3

db_path = '/workspaces/WorkPlace/BasaltPass/basaltpass.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    code = 'BasaltPass'
    status = 'active'
    
    print(f"测试查询: SELECT id, name, code, description, status, plan FROM tenants WHERE code = '{code}' AND status = '{status}'")
    print()
    
    cursor.execute("""
        SELECT id, name, code, description, status, plan 
        FROM tenants 
        WHERE code = ? AND status = ?
    """, (code, status))
    
    tenant = cursor.fetchone()
    
    if tenant:
        print("✓ 查询成功:")
        print(f"  ID: {tenant[0]}")
        print(f"  Name: {tenant[1]}")
        print(f"  Code: {tenant[2]}")
        print(f"  Description: {tenant[3]}")
        print(f"  Status: {tenant[4]}")
        print(f"  Plan: {tenant[5]}")
    else:
        print("✗ 未找到匹配的租户")
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
