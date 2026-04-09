// WebAuthntranslated

// translatedisnotranslatedWebAuthn
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.get)
}

// translatedisnotranslatedPasskey
export function isPasskeySupported(): boolean {
  return isWebAuthnSupported() && 
    'PublicKeyCredential' in window &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
}

// Base64URLtranslated
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

// Base64URLtranslated
export function base64URLDecode(str: string): ArrayBuffer {
  // translatedpadding
  str += '==='.slice((str.length + 3) % 4)
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// translatedservicetranslatedresponsetranslatedAPItranslated
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

// translatedservicetranslatedresponsetranslatedAPItranslated
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

// translatedresponsetranslatedservicetranslated
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

// translatedresponsetranslatedservicetranslated
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

// Passkeyregister
export async function registerPasskey(options: any): Promise<PublicKeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthntranslated')
  }

  const creationOptions = parseCreationOptionsFromJSON(options)
  
  const credential = await navigator.credentials.create(creationOptions) as PublicKeyCredential
  if (!credential) {
    throw new Error('createtranslatedfailed')
  }

  return credential
}

// Passkeylogin
export async function loginWithPasskey(options: any): Promise<PublicKeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthntranslated')
  }

  const requestOptions = parseRequestOptionsFromJSON(options)
  
  const credential = await navigator.credentials.get(requestOptions) as PublicKeyCredential
  if (!credential) {
    throw new Error('gettranslatedfailed')
  }

  return credential
}

// translatedusertranslatederrorinfo
export function getWebAuthnErrorMessage(error: any): string {
  if (error.name === 'NotSupportedError') {
    return 'translatedWebAuthn'
  } else if (error.name === 'SecurityError') {
    return 'securityerror：pleasetranslatedHTTPStranslated'
  } else if (error.name === 'NotAllowedError') {
    return 'usercanceltranslatedortranslated'
  } else if (error.name === 'InvalidStateError') {
    return 'translatedstatusnonetranslated'
  } else if (error.name === 'ConstraintError') {
    return 'translated'
  } else if (error.name === 'UnknownError') {
    return 'nottranslatederror，pleasetranslated'
  } else {
    return error.message || 'translatedfailed，pleasetranslated'
  }
} 