// WebAuthn工具函数

// 检查浏览器是否支持WebAuthn
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.get)
}

// 检查是否支持Passkey
export function isPasskeySupported(): boolean {
  return isWebAuthnSupported() && 
    'PublicKeyCredential' in window &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
}

// Base64URL编码
export function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Base64URL解码
export function base64URLDecode(str: string): ArrayBuffer {
  // 补齐padding
  str += '==='.slice((str.length + 3) % 4)
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// 转换服务器响应为浏览器API格式
export function parseCreationOptionsFromJSON(options: any): CredentialCreationOptions {
  return {
    publicKey: {
      ...options.publicKey,
      challenge: base64URLDecode(options.publicKey.challenge),
      user: {
        ...options.publicKey.user,
        id: base64URLDecode(options.publicKey.user.id)
      },
      excludeCredentials: options.publicKey.excludeCredentials?.map((cred: any) => ({
        ...cred,
        id: base64URLDecode(cred.id)
      }))
    }
  }
}

// 转换服务器响应为浏览器API格式
export function parseRequestOptionsFromJSON(options: any): CredentialRequestOptions {
  return {
    publicKey: {
      ...options.publicKey,
      challenge: base64URLDecode(options.publicKey.challenge),
      allowCredentials: options.publicKey.allowCredentials?.map((cred: any) => ({
        ...cred,
        id: base64URLDecode(cred.id)
      }))
    }
  }
}

// 转换浏览器响应为服务器格式
export function formatCredentialCreationResponse(credential: PublicKeyCredential): any {
  const response = credential.response as AuthenticatorAttestationResponse
  
  return {
    id: credential.id,
    rawId: base64URLEncode(credential.rawId),
    response: {
      attestationObject: base64URLEncode(response.attestationObject),
      clientDataJSON: base64URLEncode(response.clientDataJSON)
    },
    type: credential.type
  }
}

// 转换浏览器响应为服务器格式
export function formatCredentialAssertionResponse(credential: PublicKeyCredential): any {
  const response = credential.response as AuthenticatorAssertionResponse
  
  return {
    id: credential.id,
    rawId: base64URLEncode(credential.rawId),
    response: {
      authenticatorData: base64URLEncode(response.authenticatorData),
      clientDataJSON: base64URLEncode(response.clientDataJSON),
      signature: base64URLEncode(response.signature),
      userHandle: response.userHandle ? base64URLEncode(response.userHandle) : null
    },
    type: credential.type
  }
}

// Passkey注册
export async function registerPasskey(options: any): Promise<PublicKeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn不受此浏览器支持')
  }

  const creationOptions = parseCreationOptionsFromJSON(options)
  
  const credential = await navigator.credentials.create(creationOptions) as PublicKeyCredential
  if (!credential) {
    throw new Error('创建凭证失败')
  }

  return credential
}

// Passkey登录
export async function loginWithPasskey(options: any): Promise<PublicKeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn不受此浏览器支持')
  }

  const requestOptions = parseRequestOptionsFromJSON(options)
  
  const credential = await navigator.credentials.get(requestOptions) as PublicKeyCredential
  if (!credential) {
    throw new Error('获取凭证失败')
  }

  return credential
}

// 显示用户友好的错误信息
export function getWebAuthnErrorMessage(error: any): string {
  if (error.name === 'NotSupportedError') {
    return '此浏览器不支持WebAuthn'
  } else if (error.name === 'SecurityError') {
    return '安全错误：请确保使用HTTPS连接'
  } else if (error.name === 'NotAllowedError') {
    return '用户取消了操作或超时'
  } else if (error.name === 'InvalidStateError') {
    return '认证器状态无效'
  } else if (error.name === 'ConstraintError') {
    return '认证器不满足要求'
  } else if (error.name === 'UnknownError') {
    return '未知错误，请重试'
  } else {
    return error.message || '操作失败，请重试'
  }
} 