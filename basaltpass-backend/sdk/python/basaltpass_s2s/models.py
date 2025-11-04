from dataclasses import dataclass
from typing import List, Optional

@dataclass
class S2SUser:
    id: int
    email: Optional[str] = None
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: Optional[bool] = None
    phone: Optional[str] = None
    phone_verified: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@dataclass
class S2SRole:
    id: int
    code: str
    name: Optional[str] = None
    description: Optional[str] = None

@dataclass
class S2SWalletTx:
    id: int
    wallet_id: int
    type: str
    amount: int
    status: str
    reference: str
    created_at: str

@dataclass
class S2SUserWallet:
    currency: str
    balance: int
    wallet_id: int
    transactions: List[S2SWalletTx]
