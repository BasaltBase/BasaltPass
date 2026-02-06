// 租户级别应用管理API
import client from "@api/client";

export const tenantAppApi = {
    // 租户应用CRUD
    async listApps(page = 1, limit = 20, search?: string) {
        const params: any = {page, limit}
        if (search) {
            params.search = search
        }
        const response = await client.get('/api/v1/tenant/apps', {params})
        return response.data
    },

    async getApp(id: string) {
        const response = await client.get(`/api/v1/tenant/apps/${id}`)
        return response.data
    },

    // 租户应用统计
    async getAppStats(appId: string, period = '7d') {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/stats`, {
            params: {period}
        })
        return response.data
    },

    // 应用权限管理
    async listAppPermissions(appId: string) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/permissions`)
        return response.data
    },

    async createAppPermission(appId: string, data: any) {
        const response = await client.post(`/api/v1/tenant/apps/${appId}/permissions`, data)
        return response.data
    },

    async updateAppPermission(appId: string, permissionId: string, data: any) {
        const response = await client.put(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`, data)
        return response.data
    },

    async deleteAppPermission(appId: string, permissionId: string) {
        const response = await client.delete(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`)
        return response.data
    },

    // 应用角色管理
    async listAppRoles(appId: string) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/roles`)
        return response.data
    },

    async createAppRole(appId: string, data: any) {
        const response = await client.post(`/api/v1/tenant/apps/${appId}/roles`, data)
        return response.data
    },

    async updateAppRole(appId: string, roleId: string, data: any) {
        const response = await client.put(`/api/v1/tenant/apps/${appId}/roles/${roleId}`, data)
        return response.data
    },

    async deleteAppRole(appId: string, roleId: string) {
        const response = await client.delete(`/api/v1/tenant/apps/${appId}/roles/${roleId}`)
        return response.data
    },

    // 应用用户管理
    async listAppUsers(appId: string, page = 1, limit = 20) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/users`, {
            params: {page, limit}
        })
        return response.data
    },

    async getAppUsersByStatus(appId: string, status: string, page = 1, limit = 20) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/users/by-status`, {
            params: {status, page, limit}
        })
        return response.data
    },

    async getAppUserStats(appId: string) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/users/stats`)
        return response.data
    },

    async updateAppUserStatus(appId: string, userId: string, status: string) {
        const response = await client.put(`/api/v1/tenant/apps/${appId}/users/${userId}/status`, {status})
        return response.data
    },

    // 应用用户权限管理
    async getUserPermissions(appId: string, userId: string) {
        const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`)
        return response.data
    },

    async grantUserPermissions(appId: string, userId: string, permissionIds: string[]) {
        const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`, {
            permission_ids: permissionIds
        })
        return response.data
    },

    async revokeUserPermission(appId: string, userId: string, permissionId: string) {
        const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions/${permissionId}`)
        return response.data
    },

    async assignUserRoles(appId: string, userId: string, roleIds: string[]) {
        const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`, {
            role_ids: roleIds
        })
        return response.data
    },

    async revokeUserRole(appId: string, userId: string, roleId: string) {
        const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/roles/${roleId}`)
        return response.data
    }
}