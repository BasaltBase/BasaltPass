#!/usr/bin/env python3
"""检查数据库中的所有租户"""
import sqlite3
import sys

db_path = '/workspaces/WorkPlace/BasaltPass/basaltpass.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, code, status, plan, created_at 
        FROM tenants 
        ORDER BY id
    """)
    
    tenants = cursor.fetchall()
    
    if tenants:
        print(f"数据库中共有 {len(tenants)} 个租户：\n")
        print(f"{'ID':<5} {'名称':<20} {'代码':<20} {'状态':<10} {'计划':<10} {'创建时间':<20}")
        print("-" * 90)
        for tenant in tenants:
            print(f"{tenant[0]:<5} {tenant[1]:<20} {tenant[2]:<20} {tenant[3]:<10} {tenant[4]:<10} {tenant[5]:<20}")
    else:
        print("数据库中没有租户")
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
    sys.exit(1)
