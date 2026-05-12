export const Auth = {
  getToken() {
    return localStorage.getItem('token')
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  },
  login(user, token) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  },
  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login.html'
  },
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = '/login.html'
      return false
    }
    return true
  }
}
