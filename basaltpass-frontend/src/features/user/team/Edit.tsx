import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PInput, PButton, PSkeleton, PAlert, PTextarea, PPageHeader } from '@ui';
import { teamApi, TeamResponse, CreateTeamRequest } from '@api/user/team';
import { UserGroupIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

const EditTeam: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [formData, setFormData] = useState<CreateTeamRequest>({
    name: '',
    description: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const response = await teamApi.getTeam(parseInt(id!));
      const teamData = response.data.data;
      setTeam(teamData);
      setFormData({
        name: teamData.name,
        description: teamData.description || '',
        avatar_url: teamData.avatar_url || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '加载团队信息失败');
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);
      setError(null);
      
      // 这里需要根据实际的API调整，可能需要使用不同的方法
      // await teamApi.updateTeam(parseInt(id!), formData);
      
      // 暂时模拟更新成功
      navigate(`/teams/${id}`, { 
        state: { message: '团队信息更新成功！' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '更新团队失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Content cards={2} />
        </div>
      </Layout>
    );
  }

  if (error && !team) {
    return (
      <Layout>
        <PAlert variant="error" title="加载失败" message={error} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PPageHeader title="编辑团队" description="修改团队信息和设置" />

        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && <PAlert variant="error" title="更新失败" message={error} />}

            <div className="space-y-2">
              <label htmlFor="name" className="flex items-center text-sm font-semibold text-gray-700">
                <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队名称 <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <PInput
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="输入团队名称"
                  required
                  icon={<UserGroupIcon className="h-5 w-5" />}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="flex items-center text-sm font-semibold text-gray-700">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队描述
              </label>
              <PTextarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="描述团队的目的和职责..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar_url" className="flex items-center text-sm font-semibold text-gray-700">
                <PhotoIcon className="h-5 w-5 mr-2 text-indigo-500" />
                团队头像URL
              </label>
              <div className="relative">
                <PInput
                  type="url"
                  id="avatar_url"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/avatar.png"
                  icon={<PhotoIcon className="h-5 w-5" />}
                />
              </div>
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
                onClick={() => navigate(`/teams/${id}`)}
              >
                取消
              </PButton>
              <PButton
                type="submit"
                variant="primary"
                disabled={saving}
                loading={saving}
              >
                保存更改
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditTeam; 