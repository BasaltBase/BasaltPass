from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
try:
    # urllib3 v2 import path
    from urllib3.util.retry import Retry  # type: ignore
except Exception:  # pragma: no cover
    Retry = None  # type: ignore
from requests.adapters import HTTPAdapter

from .models import S2SUser, S2SRole, S2SWalletTx, S2SUserWallet, S2SMessage, S2SProduct
from .exceptions import ApiError


class BasaltPassS2SClient:
    """BasaltPass S2S Python SDK client.

    - Adds retries for transient errors (5xx, connection errors) if urllib3 Retry is available.
    - Injects client_id/client_secret headers automatically.
    - Raises ApiError when server returns error envelope or HTTP error.
    """

    def __init__(
        self,
        base_url: str,
        client_id: str,
        client_secret: str,
        *,
        timeout: float = 10.0,
        max_retries: int = 2,
        backoff_factor: float = 0.2,
        status_forcelist: Optional[List[int]] = None,
        extra_headers: Optional[Dict[str, str]] = None,
    ):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self.extra_headers = extra_headers or {}
        self.session = requests.Session()

        if Retry is not None and max_retries > 0:
            status_forcelist = status_forcelist or [500, 502, 503, 504]
            retry = Retry(total=max_retries, backoff_factor=backoff_factor, status_forcelist=status_forcelist, allowed_methods=["GET"])  # type: ignore
            adapter = HTTPAdapter(max_retries=retry)
            self.session.mount("http://", adapter)
            self.session.mount("https://", adapter)

    def _headers(self) -> Dict[str, str]:
        base = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'Accept': 'application/json',
        }
        base.update(self.extra_headers)
        return base

    def _request(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None, timeout: Optional[float] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        resp = self.session.request(method, url, headers=self._headers(), params=params, timeout=timeout or self.timeout)
        # try parse JSON always to extract envelope error
        content_type = resp.headers.get('Content-Type', '')
        is_json = 'application/json' in content_type
        if resp.status_code >= 400:
            if is_json:
                try:
                    env = resp.json()
                    err = env.get('error') if isinstance(env, dict) else None
                    if err:
                        raise ApiError(err.get('code'), err.get('message', 'error'), status=resp.status_code, request_id=env.get('request_id'))
                except ValueError:
                    pass
            raise ApiError(None, resp.reason or 'HTTP error', status=resp.status_code)
        data = resp.json()
        if data.get('error'):
            code = data['error'].get('code')
            message = data['error'].get('message')
            raise ApiError(code, message)
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

    # /api/v1/s2s/users/{id}/messages
    def get_user_messages(self, user_id: int, *, status: Optional[str] = None, page: Optional[int] = None, page_size: Optional[int] = None) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        if status is not None:
            params['status'] = status
        if page is not None:
            params['page'] = page
        if page_size is not None:
            params['page_size'] = page_size
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/messages", params=params)
        messages = [S2SMessage(**m) for m in payload.get('messages', [])]
        return {
            'messages': messages,
            'total': payload.get('total', 0),
            'page': payload.get('page', 1),
            'page_size': payload.get('page_size', 20),
        }

    # /api/v1/s2s/users/{id}/products
    def get_user_products(self, user_id: int) -> List[S2SProduct]:
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/products")
        return [S2SProduct(**p) for p in payload.get('products', [])]

    # /api/v1/s2s/users/{id}/products/{product_id}/ownership
    def check_user_product_ownership(self, user_id: int, product_id: int) -> Dict[str, Any]:
        payload = self._request('GET', f"/api/v1/s2s/users/{user_id}/products/{product_id}/ownership")
        return payload
