// 平台管理员API (/_admin)
import client from "@api/client";
import {CreateTenantRequest, TenantQuota, UpdateTenantRequest} from "@api/tenant/tenant";

export const tenant = {
    // 租户管理
    async listTenants(page = 1, limit = 20) {
        const response = await client.get('/_admin/tenants', {
            params: {page, limit}
        })
        return response.data.data || response.data
    },

    async getTenant(id: string) {
        const response = await client.get(`/_admin/tenants/${id}`)
        return response.data.data || response.data
    },

    async createTenant(data: CreateTenantRequest) {
        const response = await client.post('/_admin/tenants', data)
        return response.data.data || response.data
    },

    async updateTenant(id: string, data: UpdateTenantRequest) {
        const response = await client.put(`/_admin/tenants/${id}`, data)
        return response.data.data || response.data
    },

    async deleteTenant(id: string) {
        const response = await client.delete(`/_admin/tenants/${id}`)
        return response.data.data || response.data
    },

    async getTenantQuota(id: string) {
        const response = await client.get(`/_admin/tenants/${id}/quota`)
        return response.data
    },

    async updateTenantQuota(id: string, quota: Partial<TenantQuota>) {
        const response = await client.put(`/_admin/tenants/${id}/quota`, quota)
        return response.data
    },

    // 租户用户管理
    async listTenantUsers(tenantId: string, page = 1, limit = 20) {
        const response = await client.get(`/_admin/tenants/${tenantId}/users`, {
            params: {page, limit}
        })
        return response.data
    },

    async addUserToTenant(tenantId: string, userId: string, role: string) {
        const response = await client.post(`/_admin/tenants/${tenantId}/users`, {
            user_id: userId,
            role
        })
        return response.data
    },

    async removeUserFromTenant(tenantId: string, userId: string) {
        const response = await client.delete(`/_admin/tenants/${tenantId}/users/${userId}`)
        return response.data
    },

    async updateUserTenantRole(tenantId: string, userId: string, role: string) {
        const response = await client.put(`/_admin/tenants/${tenantId}/users/${userId}`, {
            role
        })
        return response.data
    }
}