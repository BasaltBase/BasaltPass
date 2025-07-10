import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useNavigate } from 'react-router-dom'

function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    client
      .get('/api/v1/user/profile')
      .then((res) => setProfile(res.data))
      .catch(() => navigate('/login'))
  }, [navigate])

  if (!profile) return null

  return (
    <div className="flex flex-col items-center mt-20">
      <h2 className="text-2xl mb-4">Profile</h2>
      <p>ID: {profile.id}</p>
      <p>Email: {profile.email}</p>
      <p>Phone: {profile.phone}</p>
      <p>Nickname: {profile.nickname}</p>
    </div>
  )
}

export default Profile 