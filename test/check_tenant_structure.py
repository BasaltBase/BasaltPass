#!/usr/bin/env python3
"""检查租户表结构和数据"""
import sqlite3

db_path = '/workspaces/WorkPlace/BasaltPass/basaltpass.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取表结构
    cursor.execute("PRAGMA table_info(tenants)")
    columns = cursor.fetchall()
    
    print("租户表结构:")
    for col in columns:
        print(f"  {col[1]}: {col[2]} (NOT NULL: {col[3]}, DEFAULT: {col[4]})")
    
    print("\n\n租户详细信息:")
    cursor.execute("SELECT * FROM tenants WHERE code = 'BasaltPass'")
    tenant = cursor.fetchone()
    
    if tenant:
        col_names = [col[1] for col in columns]
        for i, col_name in enumerate(col_names):
            print(f"  {col_name}: {tenant[i]}")
    else:
        print("  未找到 code='BasaltPass' 的租户")
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
