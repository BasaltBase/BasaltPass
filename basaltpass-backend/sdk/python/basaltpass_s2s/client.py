from __future__ import annotations

import dataclasses
from typing import Any, Dict, List, Optional
import requests

from .models import S2SUser, S2SRole, S2SWalletTx, S2SUserWallet


class BasaltPassS2SClient:
    def __init__(self, base_url: str, client_id: str, client_secret: str, *, timeout: int = 10):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self.session = requests.Session()

    def _headers(self) -> Dict[str, str]:
        return {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'Accept': 'application/json',
        }

    def _request(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        resp = self.session.request(method, url, headers=self._headers(), params=params, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        if data.get('error'):
            code = data['error'].get('code')
            message = data['error'].get('message')
            raise RuntimeError(f"API error: {code} - {message}")
        return data['data']

    # /api/v1/s2s/users/{id}
    def get_user(self, user_id: int) -> S2SUser:
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}")
        return S2SUser(**payload)

    # /api/v1/s2s/users/{id}/roles
    def get_user_roles(self, user_id: int, *, tenant_id: Optional[int] = None) -> List[S2SRole]:
        params: Dict[str, Any] = {}
        if tenant_id is not None:
            params['tenant_id'] = tenant_id
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/roles", params=params)
        return [S2SRole(**item) for item in payload.get('roles', [])]

    # /api/v1/s2s/users/{id}/permissions -> returns role codes
    def get_user_role_codes(self, user_id: int, *, tenant_id: Optional[int] = None) -> List[str]:
        params: Dict[str, Any] = {}
        if tenant_id is not None:
            params['tenant_id'] = tenant_id
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/permissions", params=params)
        return payload.get('roles', [])

    # /api/v1/s2s/users/{id}/wallets
    def get_user_wallet(self, user_id: int, *, currency: str, limit: Optional[int] = None) -> S2SUserWallet:
        params: Dict[str, Any] = {'currency': currency}
        if limit is not None:
            params['limit'] = limit
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/wallets", params=params)
        txs = [S2SWalletTx(**tx) for tx in payload.get('transactions', [])]
        return S2SUserWallet(
            currency=payload['currency'],
            balance=payload['balance'],
            wallet_id=payload['wallet_id'],
            transactions=txs,
        )

    def close(self):
        self.session.close()
