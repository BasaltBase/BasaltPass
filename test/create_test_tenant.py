#!/usr/bin/env python3
"""
创建测试租户
"""

import requests
import json

BASE_URL = "http://localhost:8080"

def create_test_tenant():
    """创建一个测试租户"""
    
    print("=" * 60)
    print("创建测试租户")
    print("=" * 60)
    
    # 首先需要登录获取管理员token
    # 这里假设你已经有一个管理员账户
    # 如果没有，可以先注册一个平台管理员
    
    print("\n提示: 需要管理员权限来创建租户")
    print("\n可以通过以下方式创建租户:")
    print("1. 使用管理员控制台 http://localhost:5175")
    print("2. 或者使用平台登录 http://localhost:5173/login")
    print("3. 在管理后台创建租户")
    
    print("\n测试租户信息示例:")
    print({
        "name": "测试租户",
        "code": "test-tenant",
        "description": "用于测试的租户"
    })

if __name__ == "__main__":
    create_test_tenant()
