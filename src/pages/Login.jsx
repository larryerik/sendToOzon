import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  // 如果用户已登录，重定向到主页
  if (user) {
    return <Navigate to="/shipping-plans" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user, error } = await signIn(email, password)
      
      if (error) {
        setError(error)
      } else {
        navigate('/shipping-plans')
      }
    } catch (err) {
      setError('登录过程中发生错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="card">
          <div className="card-header">
            <div className="mx-auto h-12 w-12 rounded-full bg-black-700 flex items-center justify-center">
              <span className="text-white text-xl font-bold">O</span>
            </div>
            <h2 className="card-title text-center">
              发货管理系统
            </h2>
          </div>
          
          {error && (
            <div className="alert alert-destructive mx-6">
              <div className="alert-description">
                {error}
              </div>
            </div>
          )}
          
          <form className="card-content" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="label sr-only">
                  邮箱地址
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="label sr-only">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-default w-full"
              >
                {loading ? (
                  <span>登录中...</span>
                ) : (
                  <span>登录</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login