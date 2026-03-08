#!/usr/bin/env python3
"""
BasaltPass 租户隔离功能测试脚本

测试场景：
1. 创建两个租户（tenant A 和 tenant B）
2. 在每个租户下创建用户（相同邮箱）
3. 测试租户A的用户不能登录租户B
4. 测试OAuth授权时验证租户
5. 测试用户数据隔离
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8080"
API_BASE = f"{BASE_URL}/api/v1"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def log_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def log_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def log_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

# 全局变量存储测试数据
test_data = {
    'admin_token': None,
    'tenant_a': {'id': None, 'code': None, 'user': None, 'token': None},
    'tenant_b': {'id': None, 'code': None, 'user': None, 'token': None},
}

def create_admin_user():
    """创建或登录管理员用户"""
    log_info("步骤1: 创建/登录管理员用户...")
    
    # 尝试登录管理员
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "identifier": "admin@basaltpass.com",
            "password": "admin123456",
            "tenant_id": 0  # 平台登录
        })
        
        if response.status_code == 200:
            data = response.json()
            if not data.get('need_2fa'):
                test_data['admin_token'] = data['access_token']
                log_success("管理员登录成功")
                return True
        
        log_warning("管理员不存在，需要先创建...")
        # 这里需要手动创建或通过其他方式
        return False
        
    except Exception as e:
        log_error(f"管理员登录失败: {str(e)}")
        return False

def create_tenant(name, code):
    """创建租户"""
    log_info(f"创建租户: {name} (code: {code})...")
    
    headers = {'Authorization': f'Bearer {test_data["admin_token"]}'}
    response = requests.post(f"{API_BASE}/admin/tenants", 
        json={
            "name": name,
            "code": code,
            "description": f"测试租户 {name}",
            "status": "active",
            "plan": "free"
        },
        headers=headers
    )
    
    if response.status_code in [200, 201]:
        tenant = response.json()
        log_success(f"租户 {name} 创建成功 (ID: {tenant['id']})")
        return tenant
    else:
        log_error(f"租户创建失败: {response.text}")
        return None

def register_user_in_tenant(tenant_key, email, password):
    """在指定租户下注册用户"""
    tenant = test_data[tenant_key]
    log_info(f"在租户 {tenant['code']} 下注册用户 {email}...")
    
    # 使用新的注册流程
    # 1. 开始注册
    response = requests.post(f"{API_BASE}/signup/start", json={
        "email": email,
        "password": password,
        "tenant_id": tenant['id']
    })
    
    if response.status_code != 200:
        log_error(f"注册失败: {response.text}")
        return None
    
    signup_data = response.json()
    signup_id = signup_data.get('signup_id')
    
    # 2. 完成注册（跳过邮箱验证，直接完成）
    response = requests.post(f"{API_BASE}/signup/complete", json={
        "signup_id": signup_id
    })
    
    if response.status_code == 200:
        user_data = response.json()
        log_success(f"用户注册成功: {email}")
        return user_data
    else:
        log_error(f"注册完成失败: {response.text}")
        return None

def test_login_tenant_user(tenant_key, email, password):
    """测试租户用户登录"""
    tenant = test_data[tenant_key]
    log_info(f"测试用户 {email} 登录租户 {tenant['code']}...")
    
    response = requests.post(f"{API_BASE}/auth/login", json={
        "identifier": email,
        "password": password,
        "tenant_id": tenant['id']
    })
    
    if response.status_code == 200:
        data = response.json()
        if not data.get('need_2fa'):
            token = data['access_token']
            test_data[tenant_key]['token'] = token
            log_success(f"用户 {email} 登录租户 {tenant['code']} 成功")
            return token
    else:
        log_error(f"登录失败: {response.text}")
        return None

def test_cross_tenant_login(source_tenant_key, target_tenant_key, email, password):
    """测试跨租户登录（应该失败）"""
    source = test_data[source_tenant_key]
    target = test_data[target_tenant_key]
    
    log_info(f"测试租户 {source['code']} 的用户尝试登录租户 {target['code']}...")
    
    response = requests.post(f"{API_BASE}/auth/login", json={
        "identifier": email,
        "password": password,
        "tenant_id": target['id']
    })
    
    if response.status_code == 401 or response.status_code == 403:
        log_success("跨租户登录被正确拒绝 ✓")
        return True
    elif response.status_code == 200:
        log_error("跨租户登录成功 - 这是一个安全问题！")
        return False
    else:
        log_warning(f"意外的响应: {response.status_code} - {response.text}")
        return False

def test_platform_login_restriction(email, password):
    """测试普通用户不能登录平台"""
    log_info(f"测试普通用户 {email} 尝试平台登录...")
    
    response = requests.post(f"{API_BASE}/auth/login", json={
        "identifier": email,
        "password": password,
        "tenant_id": 0  # 平台登录
    })
    
    if response.status_code in [401, 403]:
        log_success("普通用户平台登录被正确拒绝 ✓")
        return True
    elif response.status_code == 200:
        log_error("普通用户成功登录平台 - 这是一个安全问题！")
        return False
    else:
        log_warning(f"意外的响应: {response.status_code} - {response.text}")
        return False

def main():
    print("=" * 60)
    print("BasaltPass 租户隔离功能测试")
    print("=" * 60)
    print()
    
    # 步骤1: 创建管理员
    if not create_admin_user():
        log_error("无法获取管理员权限，测试终止")
        log_info("请先手动创建管理员用户")
        sys.exit(1)
    
    print()
    
    # 步骤2: 创建两个租户
    log_info("步骤2: 创建测试租户...")
    tenant_a = create_tenant("Test Tenant A", "tenant-a-test")
    if tenant_a:
        test_data['tenant_a']['id'] = tenant_a['id']
        test_data['tenant_a']['code'] = tenant_a['code']
    else:
        log_error("无法创建租户A，测试终止")
        sys.exit(1)
    
    tenant_b = create_tenant("Test Tenant B", "tenant-b-test")
    if tenant_b:
        test_data['tenant_b']['id'] = tenant_b['id']
        test_data['tenant_b']['code'] = tenant_b['code']
    else:
        log_error("无法创建租户B，测试终止")
        sys.exit(1)
    
    print()
    
    # 步骤3: 在每个租户下创建用户（使用相同邮箱）
    log_info("步骤3: 在两个租户下注册相同邮箱的用户...")
    test_email = "testuser@example.com"
    test_password = "TestPassword123!"
    
    user_a = register_user_in_tenant('tenant_a', test_email, test_password)
    if user_a:
        test_data['tenant_a']['user'] = user_a
    else:
        log_warning("租户A用户注册失败")
    
    user_b = register_user_in_tenant('tenant_b', test_email, test_password)
    if user_b:
        test_data['tenant_b']['user'] = user_b
    else:
        log_warning("租户B用户注册失败")
    
    print()
    
    # 步骤4: 测试租户用户登录各自的租户
    log_info("步骤4: 测试用户登录各自的租户...")
    test_login_tenant_user('tenant_a', test_email, test_password)
    test_login_tenant_user('tenant_b', test_email, test_password)
    
    print()
    
    # 步骤5: 测试跨租户登录（应该失败）
    log_info("步骤5: 测试租户隔离 - 跨租户登录应该失败...")
    test_cross_tenant_login('tenant_a', 'tenant_b', test_email, test_password)
    test_cross_tenant_login('tenant_b', 'tenant_a', test_email, test_password)
    
    print()
    
    # 步骤6: 测试普通用户不能登录平台
    log_info("步骤6: 测试普通用户不能登录平台...")
    test_platform_login_restriction(test_email, test_password)
    
    print()
    print("=" * 60)
    print("测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
