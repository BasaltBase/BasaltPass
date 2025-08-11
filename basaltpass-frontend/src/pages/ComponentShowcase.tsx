import React, { useState } from 'react';
import { PInput, PButton, PCheckbox, PToggle } from '../components';
import { UserIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const ComponentShowcase: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Checkbox states
  const [checkboxStates, setCheckboxStates] = useState({
    basic: false,
    remember: false,
    agree: false,
    notifications: true,
    marketing: false,
    indeterminate: false,
    switch: false,
    cardBasic: false,
    cardWithDesc: false
  });

  // Toggle states
  const [toggleStates, setToggleStates] = useState({
    basic: false,
    notifications: true,
    darkMode: false,
    autoSave: true,
    twoFactor: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    alert('表单提交成功！');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BasaltPass 组件展示</h1>
          <p className="text-gray-600">统一的 P-Input 和 P-Button 组件样式</p>
        </div>

        {/* P-Input 组件展示 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">P-Input 组件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 基础输入框 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">基础样式</h3>
              
              <PInput
                label="用户名"
                placeholder="请输入用户名"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              
              <PInput
                type="email"
                label="邮箱地址"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                icon={<EnvelopeIcon />}
              />
              
              <PInput
                type="password"
                label="密码"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            </div>

            {/* 不同变体 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">不同变体</h3>
              
              <PInput
                label="圆角样式 (rounded)"
                placeholder="圆角输入框"
                variant="rounded"
              />
              
              <PInput
                label="简约样式 (minimal)"
                placeholder="简约输入框"
                variant="minimal"
              />
              
              <PInput
                label="带图标"
                placeholder="带用户图标"
                icon={<UserIcon />}
              />
              
              <PInput
                label="错误状态"
                placeholder="错误输入框"
                error="请输入有效的信息"
              />
            </div>
          </div>

          {/* 尺寸展示 */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">不同尺寸</h3>
            <div className="space-y-4">
              <PInput
                label="小尺寸 (sm)"
                placeholder="小号输入框"
                size="sm"
              />
              <PInput
                label="中等尺寸 (md) - 默认"
                placeholder="中号输入框"
                size="md"
              />
              <PInput
                label="大尺寸 (lg)"
                placeholder="大号输入框"
                size="lg"
              />
            </div>
          </div>
        </div>

        {/* P-Button 组件展示 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">P-Button 组件</h2>
          
          {/* 按钮变体 */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">按钮变体</h3>
            <div className="flex flex-wrap gap-4">
              <PButton variant="primary">主要按钮</PButton>
              <PButton variant="secondary">次要按钮</PButton>
              <PButton variant="danger">危险按钮</PButton>
              <PButton variant="ghost">幽灵按钮</PButton>
              <PButton variant="gradient">渐变按钮</PButton>
            </div>
          </div>

          {/* 按钮尺寸 */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">按钮尺寸</h3>
            <div className="flex items-center gap-4">
              <PButton size="sm">小按钮</PButton>
              <PButton size="md">中按钮</PButton>
              <PButton size="lg">大按钮</PButton>
            </div>
          </div>

          {/* 带图标的按钮 */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">带图标的按钮</h3>
            <div className="flex flex-wrap gap-4">
              <PButton 
                variant="primary" 
                leftIcon={<UserIcon className="h-4 w-4" />}
              >
                左图标
              </PButton>
              <PButton 
                variant="secondary" 
                rightIcon={<EnvelopeIcon className="h-4 w-4" />}
              >
                右图标
              </PButton>
              <PButton 
                variant="danger" 
                leftIcon={<LockClosedIcon className="h-4 w-4" />}
                rightIcon={<EnvelopeIcon className="h-4 w-4" />}
              >
                双图标
              </PButton>
            </div>
          </div>

          {/* 加载状态 */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">加载状态</h3>
            <div className="flex gap-4">
              <PButton loading>加载中</PButton>
              <PButton variant="secondary" loading>正在处理</PButton>
            </div>
          </div>

          {/* 全宽按钮 */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">全宽按钮</h3>
            <PButton variant="primary" fullWidth>
              全宽按钮
            </PButton>
          </div>
        </div>

        {/* P-Checkbox 组件展示 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">P-Checkbox 组件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 基础复选框 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">基础样式</h3>
              
              <PCheckbox
                label="基础复选框"
                checked={checkboxStates.basic}
                onChange={(e) => setCheckboxStates({...checkboxStates, basic: e.target.checked})}
              />
              
              <PCheckbox
                label="记住登录状态"
                description="下次访问时自动登录"
                checked={checkboxStates.remember}
                onChange={(e) => setCheckboxStates({...checkboxStates, remember: e.target.checked})}
              />
              
              <PCheckbox
                label="我同意服务条款和隐私政策"
                checked={checkboxStates.agree}
                onChange={(e) => setCheckboxStates({...checkboxStates, agree: e.target.checked})}
              />
              
              <PCheckbox
                label="禁用状态"
                checked={true}
                disabled
              />
            </div>

            {/* 不同变体和尺寸 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">变体和尺寸</h3>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">开关样式</h4>
                <PCheckbox
                  variant="switch"
                  label="接收通知"
                  checked={checkboxStates.notifications}
                  onChange={(e) => setCheckboxStates({...checkboxStates, notifications: e.target.checked})}
                />
                
                <PCheckbox
                  variant="switch"
                  label="营销邮件"
                  checked={checkboxStates.marketing}
                  onChange={(e) => setCheckboxStates({...checkboxStates, marketing: e.target.checked})}
                />
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">不同尺寸</h4>
                <PCheckbox
                  size="sm"
                  label="小尺寸复选框"
                  checked={checkboxStates.basic}
                  onChange={(e) => setCheckboxStates({...checkboxStates, basic: e.target.checked})}
                />
                <PCheckbox
                  size="md"
                  label="中等尺寸复选框"
                  checked={checkboxStates.basic}
                  onChange={(e) => setCheckboxStates({...checkboxStates, basic: e.target.checked})}
                />
                <PCheckbox
                  size="lg"
                  label="大尺寸复选框"
                  checked={checkboxStates.basic}
                  onChange={(e) => setCheckboxStates({...checkboxStates, basic: e.target.checked})}
                />
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">特殊状态</h4>
                <PCheckbox
                  label="未确定状态"
                  indeterminate={true}
                />
                
                <PCheckbox
                  label="错误状态"
                  error="请勾选此选项"
                  checked={false}
                />
              </div>
            </div>
          </div>

          {/* 卡片样式 */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">卡片样式</h3>
            <div className="space-y-4 max-w-md">
              <PCheckbox
                variant="card"
                label="基础功能包"
                description="包含核心功能和基础支持"
                checked={checkboxStates.cardBasic}
                onChange={(e) => setCheckboxStates({...checkboxStates, cardBasic: e.target.checked})}
              />
              
              <PCheckbox
                variant="card"
                label="高级功能包"
                description="包含所有功能、优先支持和高级分析"
                checked={checkboxStates.cardWithDesc}
                onChange={(e) => setCheckboxStates({...checkboxStates, cardWithDesc: e.target.checked})}
              />
            </div>
          </div>
        </div>

        {/* P-Toggle 组件展示 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">P-Toggle 组件</h2>
          
          {/* 基础 Toggle */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">基础 Toggle</h3>
            <div className="space-y-4">
              <PToggle
                label="基础开关"
                checked={toggleStates.basic}
                onChange={(e) => setToggleStates({...toggleStates, basic: e.target.checked})}
              />
              
              <PToggle
                label="推送通知"
                description="接收应用推送通知"
                checked={toggleStates.notifications}
                onChange={(e) => setToggleStates({...toggleStates, notifications: e.target.checked})}
              />
              
              <PToggle
                label="深色模式"
                description="启用深色主题界面"
                checked={toggleStates.darkMode}
                onChange={(e) => setToggleStates({...toggleStates, darkMode: e.target.checked})}
              />
              
              <PToggle
                label="自动保存"
                description="每30秒自动保存您的工作"
                checked={toggleStates.autoSave}
                onChange={(e) => setToggleStates({...toggleStates, autoSave: e.target.checked})}
              />
            </div>
          </div>

          {/* 不同尺寸 */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">不同尺寸</h3>
            <div className="space-y-4">
              <PToggle
                size="sm"
                label="小尺寸 Toggle"
                checked={toggleStates.basic}
                onChange={(e) => setToggleStates({...toggleStates, basic: e.target.checked})}
              />
              
              <PToggle
                size="md"
                label="中等尺寸 Toggle"
                checked={toggleStates.notifications}
                onChange={(e) => setToggleStates({...toggleStates, notifications: e.target.checked})}
              />
              
              <PToggle
                size="lg"
                label="大尺寸 Toggle"
                checked={toggleStates.darkMode}
                onChange={(e) => setToggleStates({...toggleStates, darkMode: e.target.checked})}
              />
            </div>
          </div>

          {/* 标签位置 */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">标签位置</h3>
            <div className="space-y-4">
              <PToggle
                label="标签在右侧（默认）"
                labelPosition="right"
                checked={toggleStates.autoSave}
                onChange={(e) => setToggleStates({...toggleStates, autoSave: e.target.checked})}
              />
              
              <PToggle
                label="标签在左侧"
                labelPosition="left"
                checked={toggleStates.twoFactor}
                onChange={(e) => setToggleStates({...toggleStates, twoFactor: e.target.checked})}
              />
            </div>
          </div>

          {/* 状态演示 */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">不同状态</h3>
            <div className="space-y-4">
              <PToggle
                label="禁用状态 - 开启"
                disabled
                checked={true}
              />
              
              <PToggle
                label="禁用状态 - 关闭"
                disabled
                checked={false}
              />
              
              <PToggle
                label="错误状态"
                error="此功能当前不可用"
                checked={false}
              />
            </div>
          </div>
        </div>

        {/* 实际表单示例 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">实际表单示例</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <PInput
              label="姓名"
              placeholder="请输入您的姓名"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              icon={<UserIcon />}
              required
            />
            
            <PInput
              type="email"
              label="邮箱"
              placeholder="请输入邮箱地址"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              icon={<EnvelopeIcon />}
              required
            />
            
            <PInput
              type="password"
              label="密码"
              placeholder="请输入密码"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              required
            />
            
            <PInput
              type="password"
              label="确认密码"
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              error={formData.password !== formData.confirmPassword && formData.confirmPassword ? '密码不匹配' : ''}
              required
            />
            
            {/* 复选框部分 */}
            <div className="space-y-4">
              <PCheckbox
                label="我同意服务条款和隐私政策"
                checked={checkboxStates.agree}
                onChange={(e) => setCheckboxStates({...checkboxStates, agree: e.target.checked})}
              />
              
              <PCheckbox
                variant="switch"
                label="接收产品更新通知"
                checked={checkboxStates.notifications}
                onChange={(e) => setCheckboxStates({...checkboxStates, notifications: e.target.checked})}
              />
            </div>

            {/* Toggle 部分 */}
            <div className="space-y-4">
              <PToggle
                label="启用双因素认证"
                description="增强账户安全性"
                checked={toggleStates.twoFactor}
                onChange={(e) => setToggleStates({...toggleStates, twoFactor: e.target.checked})}
              />
              
              <PToggle
                label="自动保存草稿"
                description="每30秒自动保存您的内容"
                checked={toggleStates.autoSave}
                onChange={(e) => setToggleStates({...toggleStates, autoSave: e.target.checked})}
              />
            </div>
            
            <div className="flex space-x-4">
              <PButton
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!formData.name || !formData.email || !formData.password || formData.password !== formData.confirmPassword || !checkboxStates.agree}
              >
                提交表单
              </PButton>
              <PButton
                type="button"
                variant="secondary"
                onClick={() => setFormData({name: '', email: '', password: '', confirmPassword: ''})}
              >
                重置
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
