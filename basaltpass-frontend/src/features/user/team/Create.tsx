import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PInput } from '@ui';
import { teamApi, CreateTeamRequest } from '@api/user/team';
import { UserGroupIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '@constants';

const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateTeamRequest>({
    name: '',
    description: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await teamApi.createTeam(formData);
      
      // 创建成功后跳转到团队列表
      navigate(ROUTES.user.teams, { 
        state: { message: '团队创建成功！' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '创建团队失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创建新团队</h1>
          <p className="mt-1 text-sm text-gray-500">
            创建一个新的团队，开始协作工作
          </p>
        </div>

        <PCard variant="bordered" size="lg">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">创建失败</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="flex items-center text-sm font-semibold text-gray-700">
                <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队名称 <span className="text-red-500 ml-1">*</span>
              </label>
              <PInput
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="输入团队名称"
                size="lg"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="flex items-center text-sm font-semibold text-gray-700">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队描述
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 resize-none"
                placeholder="描述团队的目的和职责..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar_url" className="flex items-center text-sm font-semibold text-gray-700">
                <PhotoIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队头像URL
              </label>
              <PInput
                type="url"
                id="avatar_url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.png"
                size="lg"
              />
              {formData.avatar_url && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <PhotoIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500">头像预览已启用</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => navigate(ROUTES.user.teams)}
                size="lg"
              >
                取消
              </PButton>
              <PButton
                type="submit"
                variant="primary"
                disabled={loading}
                loading={loading}
                size="lg"
              >
                创建团队
              </PButton>
            </div>
          </form>
        </PCard>
      </div>
    </Layout>
  );
};

export default CreateTeam; 